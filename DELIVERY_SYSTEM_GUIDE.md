# Hybrid Delivery Assignment System - Implementation Guide

## 🎯 Overview
This system implements a **HYBRID** delivery assignment approach for TinyTots multi-vendor marketplace. It starts with manual assignment (like Flipkart) and can be upgraded to full auto-assignment (like Swiggy/Zomato) later.

## ✅ What Has Been Implemented

### 1. Database Models (100% Complete)
All models are created and configured:

#### New Models:
- **DeliveryAssignment** - Tracks each vendor's delivery (one per vendor per order)
- **PlatformCommission** - Records platform revenue from commissions
- **VendorPayout** - Manages weekly vendor payments
- **AgentPayout** - Tracks instant agent payments
- **AgentWallet** - Agent balance and transaction history
- **PlatformSettings** - System configuration (zones, commission rates)

#### Updated Models:
- **Order** - Added delivery tracking, commission fields
- **Vendor** - Added warehouse location, bank details, stats
- **User** - Enhanced delivery agent fields (zones, wallet, ratings)

### 2. Backend Utilities (100% Complete)
Three core utility modules:

#### autoAssignment.js
- `autoAssignDeliveryAgent()` - Fully automated assignment
- `getSuggestedAgents()` - Returns top 3 agents for manual selection
- `handleAgentRejection()` - Reassigns when agent rejects
- Zone-based scoring algorithm (workload, distance, rating, success rate)

#### commissionCalculator.js
- `calculateOrderCommission()` - Calculates all commission splits
- Groups items by vendor
- Applies 15% vendor commission
- Splits delivery fees (80/20 agent/platform)

#### paymentDistribution.js
- `processDeliveryPayment()` - Orchestrates payment flow
- `payDeliveryAgent()` - Instant wallet credit with bonuses
- `scheduleVendorPayouts()` - Creates weekly payout batches
- `processAgentWithdrawal()` - Bank withdrawal handling

### 3. API Routes (100% Complete)
Comprehensive REST API for delivery management:

#### Delivery Assignment Routes (`/api/delivery-assignments`)
```javascript
POST   /create                       // Create assignment when vendor confirms
GET    /:id/suggested-agents         // Get top 3 agents (HYBRID MODE)
POST   /:id/assign-manual            // Manually assign agent (HYBRID MODE)
POST   /:id/auto-assign              // Auto-assign agent (future use)
GET    /available                    // Agents see available orders
GET    /my-assignments               // Agent's current deliveries
PUT    /:id/accept                   // Agent accepts assignment
PUT    /:id/reject                   // Agent rejects (reassigns)
PUT    /:id/pickup                   // Mark picked up from vendor
PUT    /:id/location                 // Update GPS location (real-time)
PUT    /:id/deliver                  // Mark delivered (triggers payment)
GET    /:id                          // Get assignment details
GET    /                             // Admin: view all assignments
```

### 4. Order Integration (100% Complete)
Updated order flow to automatically:
1. Calculate commission when vendor confirms
2. Create delivery assignments (one per vendor)
3. Split delivery fees across vendors
4. Track all assignments in order

## 🚀 How to Use the System

### Phase 1: Manual Assignment (Start Here)

#### For Admin:
1. **View Pending Assignments**
   ```javascript
   GET /api/delivery-assignments?status=pending
   ```

2. **Get Smart Suggestions**
   ```javascript
   GET /api/delivery-assignments/{assignmentId}/suggested-agents
   ```
   Returns top 3 agents with scores:
   ```json
   {
     "suggestions": [
       {
         "agent": {...},
         "score": 85.5,
         "scoreBreakdown": {
           "workload": 35,    // 40% weight
           "distance": 28,    // 30% weight
           "rating": 18,      // 20% weight
           "successRate": 9   // 10% weight
         },
         "currentDeliveries": 2,
         "distance": 3.5,
         "rating": 4.8,
         "successRate": 98
       }
     ]
   }
   ```

3. **Manually Assign Agent**
   ```javascript
   POST /api/delivery-assignments/{assignmentId}/assign-manual
   Body: { agentId: "..." }
   ```

#### For Delivery Agents:
1. **View Available Orders** (in their zones)
   ```javascript
   GET /api/delivery-assignments/available
   ```

2. **View My Assignments**
   ```javascript
   GET /api/delivery-assignments/my-assignments
   ```

3. **Accept Assignment**
   ```javascript
   PUT /api/delivery-assignments/{id}/accept
   ```

4. **Pickup from Vendor**
   ```javascript
   PUT /api/delivery-assignments/{id}/pickup
   Body: { location: { lat: 12.34, lng: 56.78 } }
   ```

5. **Update Location** (real-time tracking)
   ```javascript
   PUT /api/delivery-assignments/{id}/location
   Body: { location: { lat: 12.34, lng: 56.78 } }
   ```

6. **Complete Delivery**
   ```javascript
   PUT /api/delivery-assignments/{id}/deliver
   Body: {
     location: { lat: 12.34, lng: 56.78 },
     customerRating: 5,
     notes: "Delivered successfully",
     proofOfDelivery: "signature_image_url"
   }
   ```
   **Triggers automatic payment to agent's wallet!**

### Phase 2: Auto-Assignment (Future Upgrade)

When ready, enable auto-assignment in PlatformSettings:

```javascript
// Update settings
const settings = await PlatformSettings.getSettings();
settings.autoAssignment.enabled = true;
await settings.save();

// Auto-assignment will trigger automatically
// when vendors confirm orders
```

## 💰 Commission & Payment Flow

### 1. When Customer Places Order:
- Order created with items and shipping charges
- Status: `pending` (COD) or `confirmed` (paid online)

### 2. When Vendor Confirms:
✅ **Commission calculated automatically:**
```
Vendor Items Total: ₹1000
Platform Commission (15%): ₹150
Vendor Gets: ₹850 (paid weekly on Friday)
```

✅ **Delivery assignment created:**
```
Delivery Fee: ₹50
Agent Share (80%): ₹40
Platform Share (20%): ₹10
```

### 3. When Agent Delivers:
✅ **Agent paid instantly to wallet:**
```
Base Delivery Fee: ₹40
On-time Bonus: ₹5
5-Star Rating Bonus: ₹10
Total Earnings: ₹55
```

✅ **Vendor payout scheduled:**
```
Next Friday payout batch includes this order
```

### 4. Weekly Vendor Payouts:
Every Friday (configurable):
```
Total Orders: 10
Gross Sales: ₹10,000
Platform Commission: ₹1,500
Net Payout: ₹8,500 → Bank transfer
```

## 🗺️ Zone Configuration

5 default zones configured in PlatformSettings:

```javascript
{
  name: 'Downtown',
  zipCodes: ['10001', '10002', '10003'],
  enabled: true
}
```

**Zones:**
- Downtown: ZIP 10001-10003
- North Zone: ZIP 10010-10012
- South Zone: ZIP 10020-10022
- East Zone: ZIP 10030-10032
- West Zone: ZIP 10040-10042

Agents can be assigned to specific zones for efficient delivery.

## 📊 Agent Wallet System

### Features:
- **Instant Credits**: Paid immediately after delivery
- **Bonuses**: On-time delivery (+₹5), 5-star rating (+₹10)
- **Withdrawals**: Minimum ₹100, max ₹5000/day
- **Transaction History**: Complete audit trail

### Agent Can:
1. View current balance
2. See earnings breakdown
3. Request withdrawals to bank
4. Track transaction history

## 🎮 Admin Capabilities

### 1. View All Assignments
```javascript
GET /api/delivery-assignments
Query params: status, vendor, agent, page, limit
```

### 2. Manual Override
```javascript
POST /api/delivery-assignments/{id}/assign-manual
```

### 3. View Suggested Agents
```javascript
GET /api/delivery-assignments/{id}/suggested-agents
```

### 4. Enable/Disable Auto-Assignment
```javascript
// Update PlatformSettings.autoAssignment.enabled
```

### 5. Configure Zones
```javascript
// Update PlatformSettings.zones
```

### 6. Adjust Commission Rates
```javascript
// Update PlatformSettings.commissions
{
  vendor: { rate: 15 },           // 15% from vendors
  delivery: {
    platformShare: 20,            // 20% of delivery fee
    agentShare: 80                // 80% to agent
  }
}
```

## 🔔 Notifications (TODO)

System has placeholders for:
- Agent assignment notification
- Pickup notification to customer
- Delivery completion notification
- Payment received notification

Integrate with:
- Email (SendGrid/Nodemailer)
- SMS (Twilio)
- Push notifications (Firebase)
- In-app notifications

## 🧪 Testing Checklist

### Backend Testing:
- [ ] Create order with multiple vendors
- [ ] Vendor confirms order → commission calculated
- [ ] Delivery assignment created
- [ ] Get suggested agents
- [ ] Manually assign agent
- [ ] Agent accepts/rejects
- [ ] Agent picks up order
- [ ] Agent delivers order
- [ ] Payment processed to wallet
- [ ] Vendor payout scheduled

### Frontend Testing:
- [ ] Agent dashboard shows real data
- [ ] Accept/reject buttons work
- [ ] Status updates in real-time
- [ ] Wallet balance updates
- [ ] Admin can assign manually
- [ ] Admin sees suggestions

## 📝 Next Steps

### Immediate:
1. ✅ Update delivery agent dashboard UI
2. ✅ Create admin assignment interface
3. ⏳ Add notification system
4. ⏳ Test complete flow
5. ⏳ Deploy to production

### Future Enhancements:
- Real-time GPS tracking map
- Customer delivery tracking page
- Agent performance analytics
- Dynamic pricing based on distance
- Surge pricing during peak hours
- Multi-language support
- Agent ratings and reviews
- Automated dispute resolution

## 🛠️ Configuration

### Environment Variables:
```bash
# MongoDB
MONGODB_URI=mongodb://...

# JWT
JWT_SECRET=your_secret

# Payment Gateway (for withdrawals)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Notifications
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

### PlatformSettings (Database):
All system configuration stored in PlatformSettings collection:
- Commission rates
- Delivery zones
- Auto-assignment settings
- Payout schedules
- Bonus/penalty rules

## 📈 Performance Metrics

Track these KPIs:
- Average delivery time
- Agent acceptance rate
- On-time delivery rate
- Customer satisfaction (ratings)
- Platform revenue
- Agent earnings
- Vendor payout amounts

## 🎯 Success Indicators

System is working correctly when:
1. ✅ Vendors confirm orders → commission calculated
2. ✅ Delivery assignments created automatically
3. ✅ Admin can see suggested agents with scores
4. ✅ Agents can accept/reject assignments
5. ✅ Delivery completion triggers instant payment
6. ✅ Vendor payouts scheduled weekly
7. ✅ Agent wallet updates in real-time
8. ✅ All financial records accurate

## 📞 Support

For issues or questions:
- Check console logs for errors
- Verify MongoDB connection
- Ensure all environment variables set
- Check PlatformSettings configuration
- Review API responses for error messages

---

**System Status**: ✅ Ready for Phase 1 (Manual Assignment)

**Upgrade Path**: Enable auto-assignment when comfortable with manual process

**Estimated Setup Time**: 2-3 hours (mostly frontend UI updates)
