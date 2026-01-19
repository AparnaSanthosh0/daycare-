/**
 * Commission Calculator Utility
 * Calculates and tracks commissions for all parties
 */

const PlatformSettings = require('../models/PlatformSettings');
const PlatformCommission = require('../models/PlatformCommission');
const Vendor = require('../models/Vendor');

/**
 * Calculate commission for an order
 * Returns financial breakdown
 */
async function calculateOrderCommission(order) {
  try {
    const settings = await PlatformSettings.getSettings();

    // STEP 1: Calculate vendor commissions
    const vendorPayouts = [];
    let totalVendorCommission = 0;

    // Group items by vendor
    const vendorGroups = {};
    order.items.forEach(item => {
      const vendorId = item.vendor.toString();
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendor: item.vendor,
          items: [],
          totalAmount: 0
        };
      }
      vendorGroups[vendorId].items.push(item);
      vendorGroups[vendorId].totalAmount += item.price * item.quantity;
    });

    // Calculate commission for each vendor
    for (const [vendorId, group] of Object.entries(vendorGroups)) {
      const vendor = await Vendor.findById(vendorId);

      // Get commission rate (vendor-specific or default)
      let commissionRate = vendor?.commissionRate ||
        settings.commission.vendor.defaultRate;

      const commissionAmount = (group.totalAmount * commissionRate) / 100;
      const netPayout = group.totalAmount - commissionAmount;

      vendorPayouts.push({
        vendor: vendorId,
        vendorName: vendor?.vendorName || 'Unknown Vendor',
        itemsAmount: group.totalAmount,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        netPayout: netPayout
      });

      totalVendorCommission += commissionAmount;
    }

    // STEP 2: Calculate delivery fee split
    const numberOfVendors = Object.keys(vendorGroups).length;
    const deliveryFee = order.shipping || settings.deliveryFees.baseFee;
    const feePerDelivery = deliveryFee / numberOfVendors;

    const platformDeliveryShare = (feePerDelivery * settings.commission.delivery.platformShare) / 100;
    const agentDeliveryShare = (feePerDelivery * settings.commission.delivery.agentShare) / 100;

    const totalDeliveryCommission = platformDeliveryShare * numberOfVendors;
    const totalAgentsShare = agentDeliveryShare * numberOfVendors;

    // STEP 3: Payment gateway fee
    const paymentGatewayFee = (order.total * settings.paymentGateway.fee) / 100;

    // STEP 4: Total platform revenue
    const totalRevenue = totalVendorCommission + totalDeliveryCommission;
    const netRevenue = totalRevenue - (
      settings.paymentGateway.feeAbsorbedBy === 'platform' ? paymentGatewayFee : 0
    );

    // STEP 5: Update order with financial breakdown
    order.financials = {
      subtotal: order.subtotal,
      deliveryFee: deliveryFee,
      platformFee: totalVendorCommission,
      tax: order.tax,
      customerTotal: order.total,
      vendorPayouts: vendorPayouts,
      deliveryBreakdown: {
        totalFee: deliveryFee,
        numberOfDeliveries: numberOfVendors,
        feePerDelivery: feePerDelivery,
        platformShare: totalDeliveryCommission,
        agentsShare: totalAgentsShare
      }
    };

    order.commissionCalculated = true;
    await order.save();

    // STEP 6: Create commission record
    const commissionRecord = await PlatformCommission.create({
      order: order._id,
      orderNumber: order.orderNumber,
      date: new Date(),
      month: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      year: new Date().getFullYear(),

      vendorCommissions: vendorPayouts.map(vp => ({
        vendor: vp.vendor,
        vendorName: vp.vendorName,
        salesAmount: vp.itemsAmount,
        commissionRate: vp.commissionRate,
        commissionAmount: vp.commissionAmount
      })),

      totalVendorCommission: totalVendorCommission,
      totalDeliveryCommission: totalDeliveryCommission,
      totalRevenue: totalRevenue,
      paymentGatewayFee: paymentGatewayFee,
      netRevenue: netRevenue,
      status: 'pending'
    });

    order.commissionRecord = commissionRecord._id;
    await order.save();

    console.log(`✅ Commission calculated for order ${order.orderNumber}`);
    console.log(`   Platform Revenue: ₹${totalRevenue.toFixed(2)}`);
    console.log(`   Net Revenue: ₹${netRevenue.toFixed(2)}`);

    return {
      order,
      commission: commissionRecord,
      vendorPayouts,
      deliveryBreakdown: order.financials.deliveryBreakdown
    };

  } catch (error) {
    console.error('Calculate commission error:', error);
    throw error;
  }
}

/**
 * Get commission summary for admin dashboard
 */
async function getCommissionSummary(startDate, endDate) {
  try {
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const commissions = await PlatformCommission.find(query);

    const summary = {
      totalOrders: commissions.length,
      totalVendorCommission: 0,
      totalDeliveryCommission: 0,
      totalRevenue: 0,
      netRevenue: 0,
      byMonth: {}
    };

    commissions.forEach(comm => {
      summary.totalVendorCommission += comm.totalVendorCommission || 0;
      summary.totalDeliveryCommission += comm.totalDeliveryCommission || 0;
      summary.totalRevenue += comm.totalRevenue || 0;
      summary.netRevenue += comm.netRevenue || 0;

      // Group by month
      if (!summary.byMonth[comm.month]) {
        summary.byMonth[comm.month] = {
          orders: 0,
          revenue: 0
        };
      }
      summary.byMonth[comm.month].orders++;
      summary.byMonth[comm.month].revenue += comm.totalRevenue || 0;
    });

    return summary;

  } catch (error) {
    console.error('Get commission summary error:', error);
    throw error;
  }
}

module.exports = {
  calculateOrderCommission,
  getCommissionSummary
};
