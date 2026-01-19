const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Emails will be logged to console only.');
    return null;
  }

  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send order confirmation email to customer
const sendOrderConfirmationEmail = async (order, customer) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      // Log to console if email not configured
      console.log('\n📧 ===== ORDER CONFIRMATION EMAIL =====');
      console.log(`To: ${customer.email}`);
      console.log(`Subject: Order Confirmation - Order #${order.orderNumber}`);
      console.log(`\nDear ${customer.name},`);
      console.log(`\nThank you for your order! Your order has been received and is being processed.`);
      console.log(`\nOrder Details:`);
      console.log(`Order Number: ${order.orderNumber}`);
      console.log(`Order Date: ${new Date(order.createdAt).toLocaleString()}`);
      console.log(`Total Amount: ₹${order.total.toFixed(2)}`);
      console.log(`Payment Method: ${order.paymentMethod}`);
      console.log(`\nItems:`);
      order.items.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.product.name} x ${item.quantity} = ₹${(item.quantity * item.price).toFixed(2)}`);
      });
      console.log(`\nDelivery Address:`);
      console.log(`${order.shippingAddress.street || ''}`);
      console.log(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''}`);
      console.log(`${order.shippingAddress.zipCode || ''} ${order.shippingAddress.country || ''}`);
      console.log(`\nYou can track your order at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/track-order/${order.orderNumber}`);
      console.log('\n===================================\n');
      return;
    }

    // Build items list HTML
    const itemsHtml = order.items.map((item, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product?.name || 'Product'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"TinyTots" <${process.env.EMAIL_USER}>`,
      to: customer.email,
      subject: `Order Confirmation - Order #${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
            .order-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border: 1px solid #eee; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #f0f0f0; padding: 10px; text-align: left; }
            .total-row { font-weight: bold; background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed! 🎉</h1>
            </div>
            <div class="content">
              <p>Dear ${customer.firstName || customer.name || 'Customer'},</p>
              
              <p>Thank you for your order! We're excited to process your purchase.</p>
              
              <div class="order-info">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
              </div>

              <h3>Items Ordered</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td colspan="4" style="padding: 10px; text-align: right;">Subtotal:</td>
                    <td style="padding: 10px; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
                  </tr>
                  ${order.discount > 0 ? `
                  <tr>
                    <td colspan="4" style="padding: 10px; text-align: right; color: green;">Discount:</td>
                    <td style="padding: 10px; text-align: right; color: green;">-₹${order.discount.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td colspan="4" style="padding: 10px; text-align: right;">Delivery Fee:</td>
                    <td style="padding: 10px; text-align: right;">₹${(order.shipping || 0).toFixed(2)}</td>
                  </tr>
                  <tr class="total-row" style="font-size: 1.1em;">
                    <td colspan="4" style="padding: 10px; text-align: right;">Total Amount:</td>
                    <td style="padding: 10px; text-align: right; color: #4CAF50;">₹${order.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="order-info">
                <h3>Delivery Address</h3>
                <p>
                  ${order.shippingAddress.street || ''}<br>
                  ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zipCode || ''}<br>
                  ${order.shippingAddress.country || ''}
                </p>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/track-order/${order.orderNumber}" class="button">
                  Track Your Order
                </a>
              </div>

              <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
                If you have any questions about your order, please don't hesitate to contact us.
              </p>

              <p style="font-size: 0.9em; color: #666;">
                Thank you for shopping with TinyTots!<br>
                <strong>The TinyTots Team</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${customer.email}`);
    
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error.message);
    // Don't throw - email failure shouldn't break order creation
  }
};

// Send order status update email
const sendOrderStatusEmail = async (order, customer, newStatus) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log(`\n📧 Order #${order.orderNumber} status updated to: ${newStatus}`);
      console.log(`Email would be sent to: ${customer.email}\n`);
      return;
    }

    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is now being processed and will be shipped soon.',
      shipped: 'Great news! Your order has been shipped and is on its way.',
      delivered: 'Your order has been delivered! We hope you enjoy your purchase.',
      cancelled: 'Your order has been cancelled. If you have any questions, please contact us.'
    };

    const mailOptions = {
      from: `"TinyTots" <${process.env.EMAIL_USER}>`,
      to: customer.email,
      subject: `Order Update - Order #${order.orderNumber} is ${newStatus.toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
            .status-badge { display: inline-block; padding: 8px 16px; background-color: #4CAF50; color: white; border-radius: 20px; font-weight: bold; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
            </div>
            <div class="content">
              <p>Dear ${customer.name},</p>
              
              <p>Your order <strong>#${order.orderNumber}</strong> status has been updated:</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <span class="status-badge">${newStatus.toUpperCase()}</span>
              </div>

              <p>${statusMessages[newStatus]}</p>

              ${newStatus === 'shipped' && order.deliveryAssignments && order.deliveryAssignments.length > 0 ? `
                <p><strong>Tracking Information:</strong></p>
                ${order.deliveryAssignments.map((delivery, idx) => `
                  <p>
                    Package ${idx + 1}: ${delivery.trackingNumber || 'Tracking number will be updated soon'}
                    ${delivery.agent ? `<br>Delivery Agent: ${delivery.agent.name}` : ''}
                  </p>
                `).join('')}
              ` : ''}

              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/track-order/${order.orderNumber}" class="button">
                  Track Your Order
                </a>
              </div>

              <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
                Thank you for shopping with TinyTots!<br>
                <strong>The TinyTots Team</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order status email sent to ${customer.email}`);
    
  } catch (error) {
    console.error('❌ Error sending order status email:', error.message);
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail
};
