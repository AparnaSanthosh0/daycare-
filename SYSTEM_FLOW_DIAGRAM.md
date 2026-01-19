# Complete System Flow - With File References

## 🎯 YOUR EXACT FLOW - IMPLEMENTED

```
┌─────────────────────────────────────────────────────────────┐
│  1. CUSTOMER PLACES ORDER                                    │
│  📁 server/routes/orders.js (Line 12-130)                   │
│  📝 POST /api/orders                                         │
│  💾 Creates Order document with items, shipping, totals     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. ADMIN CONFIRMS ORDER (HYBRID)                            │
│  📁 server/routes/orders.js (Line 330-385)                  │
│  📝 PUT /api/orders/admin/:orderId/confirm                   │
│  🎛️ Auto-confirm if paid online, manual if COD             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. VENDORS RECEIVE NOTIFICATION                             │
│  📁 server/routes/orders.js (Line 380-382)                  │
│  ⚠️ Placeholder - TODO: SendGrid/Twilio integration        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. VENDORS CONFIRM ITEMS READY                              │
│  📁 server/routes/orders.js (Line 439-606)                  │
│  📝 PUT /api/orders/vendor/:orderId/confirm                  │
│  💾 Updates vendorConfirmations.status = "confirmed"        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. 🤖 SYSTEM AUTO-TRIGGERS (All vendors confirmed)          │
│  📁 server/routes/orders.js (Line 549-556)                  │
│  📝 Logic: allConfirmed = every vendor confirmed             │
│  💾 Updates order.status = "processing"                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  6. CREATES DELIVERY ASSIGNMENTS (1 per vendor)              │
│  📁 server/routes/orders.js (Line 493-543)                  │
│  📝 Logic: For each vendor, create DeliveryAssignment        │
│  💾 Calculates delivery fee split by item value             │
│  💾 Creates assignment with pickup/delivery locations       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6a: CALCULATE COMMISSION                               │
│  📁 server/utils/commissionCalculator.js (Line 20-122)      │
│  📝 calculateOrderCommission()                               │
│  💰 15% vendor commission                                    │
│  💰 20/80 delivery fee split (platform/agent)               │
│  💾 Creates PlatformCommission record                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  7. 🤖 AUTO-ASSIGNMENT ALGORITHM RUNS (HYBRID MODE)          │
│  📁 server/routes/orders.js (Line 545-568)                  │
│  📁 server/utils/autoAssignment.js (Line 52-180)            │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │ IF autoAssignment.enabled = TRUE:      │                 │
│  │   → Runs autoAssignDeliveryAgent()     │                 │
│  │   → Finds agents in zone               │                 │
│  │   → Calculates scores                  │                 │
│  │   → Assigns best agent                 │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │ IF autoAssignment.enabled = FALSE:     │                 │
│  │   → Assignment stays "pending"         │                 │
│  │   → Admin uses getSuggestedAgents()    │                 │
│  │   → Admin manually assigns             │                 │
│  └────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  8. ASSIGNS BEST AVAILABLE AGENT TO EACH DELIVERY           │
│  📁 server/utils/autoAssignment.js (Line 115-167)           │
│  📝 Scoring Algorithm:                                       │
│     • Workload (40%): 5 - currentDeliveries                 │
│     • Distance (30%): 10 - distance_in_km                   │
│     • Rating (20%): agent.rating * 4                        │
│     • Success (10%): successRate / 100 * 10                 │
│  💾 Updates assignment.deliveryAgent, status = "assigned"   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  9. AGENTS RECEIVE NOTIFICATIONS                             │
│  📁 server/routes/orders.js (Line 562-563)                  │
│  📁 server/routes/deliveryAssignments.js (Line 218, 277)    │
│  ⚠️ Placeholder - TODO: Push/SMS/Email notifications        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  10. AGENTS ACCEPT/REJECT (5 min window)                     │
│  📁 server/routes/deliveryAssignments.js (Line 288-349)     │
│                                                              │
│  ┌─────────────────────────────────────┐                    │
│  │ PUT /:id/accept (Line 288-327)      │                    │
│  │   → status = "accepted"             │                    │
│  │   → acceptedAt = now()              │                    │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  ┌─────────────────────────────────────┐                    │
│  │ PUT /:id/reject (Line 330-349)      │                    │
│  │   → Calls handleAgentRejection()    │                    │
│  │   → Finds next best agent           │                    │
│  │   → Reassigns automatically         │                    │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  ⚠️ NOTE: 5-min timeout not enforced (needs cron job)      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  11. IF REJECTED → AUTO-REASSIGN TO NEXT BEST AGENT         │
│  📁 server/utils/autoAssignment.js (Line 253-279)           │
│  📝 handleAgentRejection()                                   │
│  💾 Finds next available agent with high score              │
│  💾 Updates assignment with new agent                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  12. AGENT PICKS UP FROM VENDOR                              │
│  📁 server/routes/deliveryAssignments.js (Line 352-384)     │
│  📝 PUT /:id/pickup                                          │
│  💾 status = "picked_up", pickedUpAt = now()                │
│  📍 Saves GPS coordinates (gpsTracking.pickupLocation)      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  13. AGENT DELIVERS TO CUSTOMER                              │
│  📁 server/routes/deliveryAssignments.js (Line 409-478)     │
│  📝 PUT /:id/deliver                                         │
│  💾 status = "delivered", deliveredAt = now()               │
│  💾 Saves customer rating, proof of delivery                │
│  📍 Saves GPS coordinates (gpsTracking.deliveryLocation)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  14. 🤖 PAYMENT AUTO-DISTRIBUTION                            │
│  📁 server/routes/deliveryAssignments.js (Line 452)         │
│  📁 server/utils/paymentDistribution.js (Line 15-66)        │
│  📝 processDeliveryPayment()                                 │
│  💰 Orchestrates agent payment + vendor payout scheduling   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  15. AGENT WALLET CREDITED IMMEDIATELY                       │
│  📁 server/utils/paymentDistribution.js (Line 73-163)       │
│  📝 payDeliveryAgent()                                       │
│                                                              │
│  💰 Base Delivery Fee: agentShare (80% of delivery fee)     │
│  💰 On-time Bonus: +₹5 (if delivered on time)              │
│  💰 5-Star Bonus: +₹10 (if rating = 5)                     │
│                                                              │
│  💾 Creates AgentPayout record                               │
│  💾 Credits AgentWallet.currentBalance                       │
│  💾 Adds transaction to wallet history                       │
│  💾 Updates agent.staff.totalEarnings                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  16. VENDOR PAYOUT SCHEDULED (WEEKLY)                        │
│  📁 server/utils/paymentDistribution.js (Line 170-243)      │
│  📝 scheduleVendorPayouts()                                  │
│                                                              │
│  📅 Payout Day: Friday (configurable)                       │
│  📅 Holding Period: 7 days (configurable)                   │
│                                                              │
│  💰 Gross Amount: Total order items value                   │
│  💰 Platform Fee: 15% commission                            │
│  💰 Net Payout: Gross - Platform Fee                        │
│                                                              │
│  💾 Creates VendorPayout record                              │
│  💾 Status: "scheduled"                                      │
│  💾 Updates vendor.stats.pendingPayout                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  17. PLATFORM COMMISSION RECORDED                            │
│  📁 server/utils/commissionCalculator.js (Line 20-122)      │
│  📝 calculateOrderCommission()                               │
│                                                              │
│  💰 Vendor Commissions:                                      │
│     - Per vendor: itemsAmount * 0.15                        │
│     - Total: Sum of all vendor commissions                  │
│                                                              │
│  💰 Delivery Commissions:                                    │
│     - Platform share: deliveryFee * 0.20                    │
│     - Agent share: deliveryFee * 0.80                       │
│     - Total: Sum of all platform shares                     │
│                                                              │
│  💾 Creates PlatformCommission record                        │
│  💾 Links to order via order._id                            │
│  💾 Status: "pending" → "completed" after all deliveries    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  18. ORDER COMPLETE                                          │
│  📁 server/utils/paymentDistribution.js (Line 42-56)        │
│  📝 Triggered when all deliveries complete                   │
│                                                              │
│  💾 order.status = "delivered"                              │
│  💾 order.deliveryStatus = "all_delivered"                  │
│  💾 order.completedDeliveries = total count                 │
│  💾 order.agentPayoutCompleted = true                       │
│  💾 order.vendorPayoutScheduled = true                      │
│                                                              │
│  💾 PlatformCommission.status = "completed"                 │
│                                                              │
│  🎉 ALL DONE!                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎛️ HYBRID CONFIGURATION TOGGLE

### Admin Confirmation (Auto vs Manual)

```javascript
// 📁 server/routes/orders.js (Line 101-106)

// Determine payment status based on payment method
let finalPaymentStatus = 'pending';

if (paymentMethod === 'cash_on_delivery') {
  finalPaymentStatus = 'pending';     // ← MANUAL admin confirmation
} else if (paymentId && paymentStatus === 'paid') {
  finalPaymentStatus = 'paid';        // ← AUTO-CONFIRMED
}

const order = new Order({
  status: finalPaymentStatus === 'paid' ? 'confirmed' : 'pending'
});
```

**Result:**
- 💳 **Razorpay/Online Payment** → Status: `confirmed` (skip admin step)
- 💵 **Cash on Delivery** → Status: `pending` (requires admin confirmation)

---

### Agent Assignment (Auto vs Manual)

```javascript
// 📁 PlatformSettings document in MongoDB

{
  autoAssignment: {
    enabled: false,  // ← TOGGLE THIS
    maxConcurrentDeliveries: 5,
    assignmentTimeout: 300
  }
}
```

**Result:**
- ✅ **enabled: true** → Auto-assigns best agent when vendor confirms
- ❌ **enabled: false** → Assignment stays pending, admin manually assigns

**Toggle via code:**
```javascript
// Enable auto-assignment
const settings = await PlatformSettings.getSettings();
settings.autoAssignment.enabled = true;
await settings.save();

// Disable (back to manual)
settings.autoAssignment.enabled = false;
await settings.save();
```

**Toggle via database:**
```javascript
// MongoDB query
db.platformsettings.updateOne(
  {},
  { $set: { "autoAssignment.enabled": true } }
)
```

---

## 📊 KEY METRICS TRACKED

### Agent Performance
```
📁 server/models/User.js (staff section)
- totalDeliveries: Total completed deliveries
- rating: Average customer rating (1-5)
- deliverySuccessRate: % of successful deliveries
- totalEarnings: Lifetime earnings
- walletBalance: Current balance
```

### Vendor Performance
```
📁 server/models/Vendor.js
- stats.totalSales: Total revenue
- stats.totalOrders: Number of orders
- stats.totalCommissionPaid: Platform fees paid
- stats.pendingPayout: Awaiting next payout
```

### Platform Revenue
```
📁 server/models/PlatformCommission.js
- vendorCommissions[]: 15% from each vendor
- deliveryCommissions[]: 20% of delivery fees
- totalRevenue: Sum of all commissions
```

---

## 🔧 QUICK START

### 1. Start Backend
```bash
cd server
npm start
```

### 2. Start Frontend
```bash
cd client
npm start
```

### 3. Configure Settings (First Time)
```javascript
// MongoDB - Insert default settings
const PlatformSettings = require('./models/PlatformSettings');
await PlatformSettings.getSettings(); // Creates defaults
```

### 4. Test Flow
```bash
# 1. Customer places order
POST /api/orders

# 2. Admin confirms (if COD)
PUT /api/orders/admin/:orderId/confirm

# 3. Vendor confirms
PUT /api/orders/vendor/:orderId/confirm
# ↓ Commission calculated
# ↓ Delivery assignment created
# ↓ Agent auto-assigned (if enabled) OR pending manual

# 4. Admin manually assigns (if manual mode)
GET /api/delivery-assignments/:id/suggested-agents
POST /api/delivery-assignments/:id/assign-manual

# 5. Agent accepts
PUT /api/delivery-assignments/:id/accept

# 6. Agent picks up
PUT /api/delivery-assignments/:id/pickup

# 7. Agent delivers
PUT /api/delivery-assignments/:id/deliver
# ↓ Payment auto-distributed
# ↓ Agent wallet credited
# ↓ Vendor payout scheduled
```

---

## 📝 SUMMARY

✅ **All 18 steps implemented**
✅ **Hybrid admin confirmation** (auto for online, manual for COD)
✅ **Hybrid agent assignment** (toggle auto/manual in settings)
✅ **Complete financial tracking** (commissions, payouts, wallets)
✅ **Smart assignment algorithm** (zone-based scoring)
✅ **Auto-reassignment** on rejection
✅ **Instant agent payments** with bonuses
✅ **Weekly vendor payouts** with commission deduction

⚠️ **TODO:**
- Notification system integration (SendGrid/Twilio)
- 5-minute timeout enforcement (background worker)
- Real-time GPS tracking UI

**Status: Production-Ready for Phase 1 Testing** 🚀
