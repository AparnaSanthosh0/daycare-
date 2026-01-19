/**
 * Payment Distribution Utility
 * Handles payment distribution to agents, vendors, and platform
 */

const AgentPayout = require('../models/AgentPayout');
const AgentWallet = require('../models/AgentWallet');
const VendorPayout = require('../models/VendorPayout');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const PlatformCommission = require('../models/PlatformCommission');
const PlatformSettings = require('../models/PlatformSettings');

/**
 * Process payment when delivery is completed
 */
async function processDeliveryPayment(deliveryAssignment) {
  try {
    console.log(`💰 Processing payment for delivery ${deliveryAssignment._id}`);

    // STEP 1: Pay delivery agent immediately
    await payDeliveryAgent(deliveryAssignment);

    // STEP 2: Check if all deliveries for order are complete
    const order = await Order.findById(deliveryAssignment.order);
    const allAssignments = await DeliveryAssignment.find({
      order: order._id
    });

    const allDelivered = allAssignments.every(a => a.status === 'delivered');

    if (allDelivered) {
      console.log(`✅ All deliveries complete for order ${order.orderNumber}`);

      // Update order status
      order.status = 'delivered';
      order.deliveryStatus = 'all_delivered';
      order.completedDeliveries = allAssignments.length;
      order.agentPayoutCompleted = true;
      await order.save();

      // STEP 3: Schedule vendor payouts
      await scheduleVendorPayouts(order);

      // STEP 4: Mark commission as completed
      if (order.commissionRecord) {
        await PlatformCommission.findByIdAndUpdate(order.commissionRecord, {
          status: 'completed'
        });
      }
    } else {
      // Partial delivery
      order.deliveryStatus = 'partial_delivered';
      order.completedDeliveries = allAssignments.filter(a => a.status === 'delivered').length;
      await order.save();
    }

    return { success: true };

  } catch (error) {
    console.error('Process delivery payment error:', error);
    throw error;
  }
}

/**
 * Pay delivery agent immediately to wallet
 */
async function payDeliveryAgent(assignment) {
  try {
    const agent = await User.findById(assignment.deliveryAgent);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Calculate earnings (base + potential bonuses)
    let earnings = assignment.agentShare || 0;
    const bonuses = [];
    const penalties = [];

    // Check for on-time delivery bonus
    if (assignment.deliveredAt && assignment.estimatedDeliveryTime) {
      const actualTime = (assignment.deliveredAt - assignment.pickedUpAt) / 60000; // minutes
      if (actualTime <= assignment.estimatedDuration) {
        bonuses.push({
          type: 'on-time',
          amount: 5,
          reason: 'On-time delivery'
        });
        earnings += 5;
      }
    }

    // Check for high rating bonus
    if (assignment.customerRating >= 5) {
      bonuses.push({
        type: 'rating',
        amount: 10,
        reason: '5-star rating'
      });
      earnings += 10;
    }

    // Create payout record
    const payout = await AgentPayout.create({
      agent: agent._id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      assignment: assignment._id,
      order: assignment.order,
      deliveryDate: assignment.deliveredAt,
      deliveryNumber: assignment._id.toString().slice(-6),
      grossDeliveryFee: assignment.deliveryFee,
      platformShare: assignment.platformShare,
      agentShare: assignment.agentShare,
      bonuses: bonuses,
      penalties: penalties,
      totalBonus: bonuses.reduce((sum, b) => sum + b.amount, 0),
      totalPenalty: penalties.reduce((sum, p) => sum + p.amount, 0),
      netEarnings: earnings,
      status: 'completed',
      paidAt: new Date(),
      deliveryRating: assignment.customerRating || 0,
      deliveryTime: assignment.actualDuration || 0,
      onTimeDelivery: bonuses.some(b => b.type === 'on-time')
    });

    // Credit to wallet
    let wallet = await AgentWallet.findOne({ agent: agent._id });
    if (!wallet) {
      wallet = await AgentWallet.create({
        agent: agent._id,
        currentBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        transactions: []
      });
    }

    wallet.currentBalance += earnings;
    wallet.totalEarnings += earnings;
    wallet.transactions.push({
      type: 'credit',
      amount: earnings,
      balanceAfter: wallet.currentBalance,
      source: payout._id,
      description: `Delivery payment + ${bonuses.length} bonus(es)`,
      timestamp: new Date()
    });
    await wallet.save();

    // Update agent stats
    await User.findByIdAndUpdate(agent._id, {
      'staff.walletBalance': wallet.currentBalance,
      'staff.totalEarnings': wallet.totalEarnings,
      $inc: { 
        'staff.totalDeliveries': 1,
        'staff.currentDeliveries': -1 // Decrement active deliveries
      }
    });

    // Update assignment with earnings
    assignment.agentEarnings = earnings;
    await assignment.save();

    console.log(`✅ Paid ₹${earnings.toFixed(2)} to ${agent.firstName} ${agent.lastName}`);

    // TODO: Send notification to agent
    // await sendAgentNotification(agent, {
    //   type: 'payment_received',
    //   amount: earnings,
    //   balance: wallet.currentBalance
    // });

    return payout;

  } catch (error) {
    console.error('Pay delivery agent error:', error);
    throw error;
  }
}

/**
 * Schedule vendor payouts (weekly batches)
 */
async function scheduleVendorPayouts(order) {
  try {
    const settings = await PlatformSettings.getSettings();
    const payoutDay = settings.payouts.vendors.payoutDay || 'Friday';
    const holdingPeriod = settings.payouts.vendors.holdingPeriod || 7;

    // Calculate next payout date
    const nextPayoutDate = getNextPayoutDate(payoutDay, holdingPeriod);

    // Create payout for each vendor
    for (const vendorPayout of order.financials.vendorPayouts) {
      const vendor = await Vendor.findById(vendorPayout.vendor);

      if (!vendor) {
        console.log(`⚠️ Vendor ${vendorPayout.vendor} not found`);
        continue;
      }

      // Check if payout already exists for this order and vendor
      const existingPayout = await VendorPayout.findOne({
        vendor: vendor._id,
        'orders.order': order._id
      });

      if (existingPayout) {
        console.log(`⚠️ Payout already exists for vendor ${vendor.vendorName} and order ${order.orderNumber}`);
        continue;
      }

      await VendorPayout.create({
        vendor: vendor._id,
        vendorName: vendor.vendorName,
        payoutBatch: `BATCH-${new Date().getFullYear()}-W${getWeekNumber()}`,
        period: {
          startDate: order.createdAt,
          endDate: order.updatedAt
        },
        orders: [{
          order: order._id,
          orderNumber: order.orderNumber,
          orderDate: order.createdAt,
          grossAmount: vendorPayout.itemsAmount,
          platformFee: vendorPayout.commissionAmount,
          netAmount: vendorPayout.netPayout
        }],
        totalGrossAmount: vendorPayout.itemsAmount,
        totalPlatformFee: vendorPayout.commissionAmount,
        totalNetAmount: vendorPayout.netPayout,
        totalDeductions: 0,
        finalPayoutAmount: vendorPayout.netPayout,
        status: 'scheduled',
        scheduledDate: nextPayoutDate,
        bankAccount: vendor.bankDetails
      });

      // Update vendor stats
      await Vendor.findByIdAndUpdate(vendor._id, {
        $inc: {
          'stats.totalSales': vendorPayout.itemsAmount,
          'stats.totalOrders': 1,
          'stats.totalCommissionPaid': vendorPayout.commissionAmount,
          'stats.pendingPayout': vendorPayout.netPayout
        }
      });

      console.log(`✅ Scheduled payout of ₹${vendorPayout.netPayout.toFixed(2)} for ${vendor.vendorName} on ${nextPayoutDate.toDateString()}`);
    }

    order.vendorPayoutScheduled = true;
    await order.save();

  } catch (error) {
    console.error('Schedule vendor payouts error:', error);
    throw error;
  }
}

/**
 * Get next payout date based on schedule
 */
function getNextPayoutDate(day, holdingDays) {
  const today = new Date();
  const deliveryDate = new Date(today.getTime() + holdingDays * 24 * 60 * 60 * 1000);

  // Find next occurrence of specified day (e.g., Friday)
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = daysOfWeek.indexOf(day);
  const currentDay = deliveryDate.getDay();

  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }

  const payoutDate = new Date(deliveryDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return payoutDate;
}

/**
 * Get current week number
 */
function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

/**
 * Process agent withdrawal to bank
 */
async function processAgentWithdrawal(agentId, amount) {
  try {
    const wallet = await AgentWallet.findOne({ agent: agentId });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    if (amount < wallet.minimumWithdrawalAmount) {
      throw new Error(`Minimum withdrawal amount is ₹${wallet.minimumWithdrawalAmount}`);
    }

    // Create withdrawal request
    wallet.withdrawals.push({
      amount: amount,
      status: 'pending',
      requestedAt: new Date()
    });

    // Deduct from balance
    wallet.currentBalance -= amount;
    wallet.totalWithdrawn += amount;

    wallet.transactions.push({
      type: 'withdrawal',
      amount: amount,
      balanceAfter: wallet.currentBalance,
      description: 'Bank withdrawal request',
      timestamp: new Date()
    });

    await wallet.save();

    console.log(`✅ Withdrawal request of ₹${amount} created for agent ${agentId}`);

    // TODO: Process bank transfer via payment gateway

    return wallet;

  } catch (error) {
    console.error('Process withdrawal error:', error);
    throw error;
  }
}

module.exports = {
  processDeliveryPayment,
  payDeliveryAgent,
  scheduleVendorPayouts,
  processAgentWithdrawal
};
