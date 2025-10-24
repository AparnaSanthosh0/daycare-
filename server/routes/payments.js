const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');

// Initialize Razorpay with your credentials
const razorpay = new Razorpay({
  key_id: 'rzp_test_RGXWGOBliVCIpU',
  key_secret: '9Q49llzcN0kLD3021OoSstOp'
});

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1
    };

    console.log('Creating Razorpay order with options:', options);
    
    const order = await razorpay.orders.create(options);
    
    console.log('Razorpay order created:', order.id);
    
    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment order',
      error: error.message 
    });
  }
});

// Verify Razorpay payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification data' });
    }

    // Create signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', '9Q49llzcN0kLD3021OoSstOp')
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      console.log('Payment verified successfully:', razorpay_payment_id);

      // Fetch payment details from Razorpay to get buyer email/contact and amount
      let paymentDetails = null;
      try {
        paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      } catch (e) {
        console.warn('Unable to fetch payment details from Razorpay:', e?.message || e);
      }

      // Create order if orderData is provided
      let createdOrder = null;
      if (orderData && orderData.items && orderData.items.length > 0) {
        try {
          console.log('🔄 Starting order creation process...');
          console.log('📦 Order data received:', JSON.stringify(orderData, null, 2));

          const Order = require('../models/Order');
          const Product = require('../models/Product');
          const Customer = require('../models/Customer');
          const Vendor = require('../models/Vendor');

          console.log('✅ Models loaded successfully');

          // Validate products and get vendors
          const vendors = new Set();
          let subtotal = 0;
          const orderItems = [];

          console.log('🔍 Validating products...');
          for (const item of orderData.items) {
            console.log(`🔎 Checking product: ${item.product} (qty: ${item.quantity})`);
            const product = await Product.findById(item.product);
            if (!product) {
              console.warn(`❌ Product ${item.product} not found, skipping`);
              continue;
            }

            if (!product.inStock) {
              console.warn(`❌ Product ${product.name} is out of stock, skipping`);
              continue;
            }

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
              product: product._id,
              quantity: item.quantity,
              price: product.price,
              name: product.name,
              image: product.image,
              vendor: product.vendor
            });

            if (product.vendor) {
              vendors.add(product.vendor.toString());
            }
            console.log(`✅ Product ${product.name} validated (${product.price} × ${item.quantity} = ${itemTotal})`);
          }

          console.log(`📊 Order summary: ${orderItems.length} items, subtotal: ₹${subtotal}, vendors: ${Array.from(vendors).length}`);

          if (orderItems.length > 0) {
            const shipping = subtotal > 500 ? 0 : 50; // Free shipping over ₹500
            const tax = subtotal * 0.08; // 8% tax
            const total = subtotal + shipping + tax;

            console.log(`💰 Final calculation: subtotal=${subtotal}, shipping=${shipping}, tax=${tax}, total=${total}`);

            // Find or create customer
            let customer = null;
            if (orderData.customerEmail) {
              console.log(`👤 Looking for customer: ${orderData.customerEmail}`);
              customer = await Customer.findOne({ email: orderData.customerEmail });
              if (!customer) {
                console.log('🆕 Creating new customer...');
                customer = new Customer({
                  firstName: orderData.customerName?.split(' ')[0] || 'Customer',
                  lastName: orderData.customerName?.split(' ').slice(1).join(' ') || '',
                  email: orderData.customerEmail,
                  phone: orderData.customerPhone || '0000000000', // Default phone if not provided
                  password: 'guest123', // Default password for guest customers
                  address: orderData.shippingAddress || {}
                });
                await customer.save();
                console.log(`✅ Customer created: ${customer._id}`);
              } else {
                console.log(`✅ Existing customer found: ${customer._id}`);
              }
            }

            if (!customer) {
              console.error('❌ No customer information available');
              return res.status(400).json({
                success: false,
                message: 'Customer information is required to create order'
              });
            }

            // Create order
            console.log('📝 Creating order...');
            const order = new Order({
              customer: customer._id,
              items: orderItems,
              shippingAddress: orderData.shippingAddress,
              billingAddress: orderData.billingAddress || orderData.shippingAddress,
              subtotal,
              shipping,
              tax,
              total,
              paymentMethod: paymentDetails?.method || 'online',
              paymentId: razorpay_payment_id,
              paymentStatus: 'paid',
              assignedVendors: Array.from(vendors),
              status: 'confirmed'
            });

            createdOrder = await order.save();
            console.log(`✅ Order created successfully: ${createdOrder.orderNumber} (${createdOrder._id})`);

            // Initialize vendor confirmations for vendor dashboard visibility
            if (Array.from(vendors).length > 0) {
              console.log('🔄 Setting up vendor confirmations...');
              const vendorConfirmations = Array.from(vendors).map(vendorId => ({
                vendor: vendorId,
                status: 'pending'
              }));

              await Order.findByIdAndUpdate(createdOrder._id, {
                vendorConfirmations,
                adminConfirmed: true,
                adminConfirmedAt: new Date()
              });
              console.log('✅ Vendor confirmations and admin confirmation updated');
            }

            // Update customer stats
            await Customer.findByIdAndUpdate(customer._id, {
              $inc: { totalOrders: 1, totalSpent: total }
            });
            console.log('✅ Customer stats updated');

            // Notify admin and vendors about paid order
            try {
              const User = require('../models/User');

              const admin = await User.findOne({ role: 'admin' });
              if (admin) {
                console.log(`📧 Paid order ${createdOrder.orderNumber} placed - notify admin ${admin.email}`);
              }

              // Notify vendors about paid order
              const uniqueVendors = [...new Set(order.items.map(item => item.vendor?.toString()).filter(Boolean))];
              for (const vendorId of uniqueVendors) {
                const vendor = await Vendor.findById(vendorId);
                if (vendor) {
                  console.log(`📧 Paid order ${createdOrder.orderNumber} assigned to vendor ${vendor.email}`);
                }
              }
            } catch (e) {
              console.warn('⚠️ Order notification failed:', e.message);
            }

            console.log(`🎉 Order ${createdOrder.orderNumber} created successfully for payment ${razorpay_payment_id}`);
          } else {
            console.warn('⚠️ No valid products found for order creation, creating test order...');
            // Create a test order without products for debugging
            const customer = await Customer.findOne({ email: orderData.customerEmail });
            if (!customer) {
              console.log('🆕 Creating test customer...');
              const newCustomer = new Customer({
                firstName: orderData.customerName?.split(' ')[0] || 'Test Customer',
                lastName: orderData.customerName?.split(' ').slice(1).join(' ') || '',
                email: orderData.customerEmail || 'test@example.com',
                phone: orderData.customerPhone || '9999999999',
                password: 'guest123', // Default password for test customers
                address: orderData.shippingAddress || {}
              });
              await newCustomer.save();
              customer = newCustomer;
              console.log(`✅ Test customer created: ${customer._id}`);
            }

            const order = new Order({
              customer: customer._id,
              items: [{
                product: null,
                quantity: 1,
                price: paymentDetails?.amount / 100,
                name: 'Test Product',
                image: '/logo192.svg',
                vendor: null
              }],
              shippingAddress: orderData.shippingAddress,
              billingAddress: orderData.billingAddress || orderData.shippingAddress,
              subtotal: paymentDetails?.amount / 100,
              shipping: 0,
              tax: 0,
              total: paymentDetails?.amount / 100,
              paymentMethod: paymentDetails?.method || 'online',
              paymentId: razorpay_payment_id,
              paymentStatus: 'paid',
              assignedVendors: [],
              status: 'confirmed',
              adminConfirmed: true,
              adminConfirmedAt: new Date()
            });

            createdOrder = await order.save();
            console.log(`✅ Test order created: ${createdOrder.orderNumber} for payment ${razorpay_payment_id}`);
          }
        } catch (orderErr) {
          console.error('❌ Error creating order after payment:', orderErr);
          console.error('❌ Error stack:', orderErr.stack);
          console.error('❌ Order data that failed:', JSON.stringify(orderData, null, 2));
          
          // Return success for payment but indicate order creation failed
          return res.json({
            success: true,
            message: 'Payment verified successfully, but order creation failed',
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            order: null,
            payment: paymentDetails || undefined,
            orderError: orderErr.message
          });
        }
      } else {
        console.warn('⚠️ No order data provided for order creation');
      }

      // Attempt to send confirmation email if we have an email
      try {
        const buyerEmail = paymentDetails?.email || paymentDetails?.notes?.email || orderData?.customerEmail;
        if (buyerEmail) {
          const amountInRupees = paymentDetails?.amount ? (Number(paymentDetails.amount) / 100).toFixed(2) : '—';
          const method = paymentDetails?.method || 'payment';
          const status = paymentDetails?.status || 'captured';
          const currency = paymentDetails?.currency || 'INR';
          const brand = 'TinyTots';

          const subject = `${brand} — Payment Confirmation (#${razorpay_payment_id})`;
          const html = `
            <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
              <h2 style="margin:0 0 12px">Thank you for your payment</h2>
              <p>This email confirms we received your payment.</p>
              <table style="border-collapse:collapse;margin-top:12px">
                <tr>
                  <td style="padding:4px 8px;color:#555">Payment ID</td>
                  <td style="padding:4px 8px"><b>${razorpay_payment_id}</b></td>
                </tr>
                <tr>
                  <td style="padding:4px 8px;color:#555">Order ID</td>
                  <td style="padding:4px 8px">${razorpay_order_id}</td>
                </tr>
                ${createdOrder ? `
                <tr>
                  <td style="padding:4px 8px;color:#555">Order Number</td>
                  <td style="padding:4px 8px"><b>${createdOrder.orderNumber}</b></td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding:4px 8px;color:#555">Amount</td>
                  <td style="padding:4px 8px"><b>${currency} ${amountInRupees}</b></td>
                </tr>
                <tr>
                  <td style="padding:4px 8px;color:#555">Method</td>
                  <td style="padding:4px 8px">${method.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding:4px 8px;color:#555">Status</td>
                  <td style="padding:4px 8px">${status}</td>
                </tr>
              </table>
              <p style="margin-top:16px">If you have any questions, reply to this email and we'll be happy to help.</p>
              <p style="margin-top:8px">Regards,<br/>${brand} Team</p>
            </div>
          `;
          const text = `Thank you for your payment.\n\nPayment ID: ${razorpay_payment_id}\nOrder ID: ${razorpay_order_id}${createdOrder ? `\nOrder Number: ${createdOrder.orderNumber}` : ''}\nAmount: ${currency} ${amountInRupees}\nMethod: ${method}\nStatus: ${status}\n\nRegards,\n${brand} Team`;

          await sendMail({ to: buyerEmail, subject, html, text });
          console.log('Payment confirmation email sent to:', buyerEmail);
        } else {
          console.log('Buyer email not available on payment; skipping email.');
        }
      } catch (mailErr) {
        console.warn('Failed to send payment confirmation email:', mailErr?.message || mailErr);
      }

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        order: createdOrder,
        payment: paymentDetails || undefined
      });
    } else {
      console.log('Payment verification failed - invalid signature');
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification error',
      error: error.message
    });
  }
});

// Get payment details
router.get('/payment/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;
    const payment = await razorpay.payments.fetch(payment_id);
    
    res.json({
      success: true,
      payment: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payment details',
      error: error.message 
    });
  }
});

module.exports = router;
