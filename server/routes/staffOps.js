const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// In-memory store (simple stub). Replace with DB writes later.
const memory = {
  attendance: [],
  activities: [],
  meals: { plans: [], consumption: [] },
  visitors: [],
  alerts: [],
  incidents: [],
  transport: [],
  pickups: [],
  messages: []
};

// Enforce staff role for writes
function staffOnly(req, res, next) {
  if (req.user?.role !== 'staff' && req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Staff only' });
  }
  next();
}

// Attendance
router.post('/attendance/child/:id', auth, staffOnly, (req, res) => {
  const entry = { type: 'child', id: req.params.id, status: req.body.status || 'present', at: new Date(), by: req.user.userId };
  memory.attendance.push(entry);
  res.json({ message: 'Recorded', entry });
});
router.post('/attendance/staff/:id', auth, staffOnly, (req, res) => {
  const entry = { type: 'staff', id: req.params.id, status: req.body.status || 'present', at: new Date(), by: req.user.userId };
  memory.attendance.push(entry);
  res.json({ message: 'Recorded', entry });
});

// Activities & curriculum
router.post('/activities', auth, staffOnly, (req, res) => {
  const item = { _id: String(Date.now()), ...req.body, createdAt: new Date(), by: req.user.userId };
  memory.activities.unshift(item);
  res.status(201).json({ message: 'Activity scheduled', item });
});
router.get('/activities', auth, (req, res) => {
  res.json(memory.activities);
});

// Meals
router.post('/meals/plan', auth, staffOnly, (req, res) => {
  const plan = { _id: String(Date.now()), ...req.body, createdAt: new Date(), by: req.user.userId };
  memory.meals.plans.unshift(plan);
  res.status(201).json({ message: 'Meal plan saved', plan });
});
router.get('/meals/plan', auth, (req, res) => {
  res.json(memory.meals.plans);
});
router.post('/meals/consumption', auth, staffOnly, (req, res) => {
  const rec = { _id: String(Date.now()), ...req.body, createdAt: new Date(), by: req.user.userId };
  memory.meals.consumption.unshift(rec);
  res.status(201).json({ message: 'Consumption recorded', rec });
});

// Visitors
router.post('/visitors', auth, staffOnly, (req, res) => {
  const v = { _id: String(Date.now()), ...req.body, at: new Date(), by: req.user.userId };
  memory.visitors.unshift(v);
  res.status(201).json({ message: 'Visitor logged', visitor: v });
});
router.get('/visitors', auth, (req, res) => {
  res.json(memory.visitors);
});

// Emergency
router.post('/alerts', auth, staffOnly, (req, res) => {
  const a = { _id: String(Date.now()), level: req.body.level || 'info', message: req.body.message || 'Test alert', at: new Date(), by: req.user.userId };
  memory.alerts.unshift(a);
  res.status(201).json({ message: 'Alert queued', alert: a });
});
router.post('/incidents', auth, staffOnly, (req, res) => {
  const i = { _id: String(Date.now()), incident: req.body.incident || '', followUp: req.body.followUp || '', at: new Date(), by: req.user.userId };
  memory.incidents.unshift(i);
  res.status(201).json({ message: 'Incident logged', incident: i });
});
router.get('/incidents', auth, (req, res) => {
  res.json(memory.incidents);
});

// Transport & pickups
router.post('/transport', auth, staffOnly, (req, res) => {
  const t = { _id: String(Date.now()), ...req.body, at: new Date(), by: req.user.userId };
  memory.transport.unshift(t);
  res.status(201).json({ message: 'Transport saved', transport: t });
});
router.get('/transport', auth, (req, res) => {
  res.json(memory.transport);
});
router.post('/pickups', auth, staffOnly, (req, res) => {
  const p = { _id: String(Date.now()), ...req.body, at: new Date(), by: req.user.userId };
  memory.pickups.unshift(p);
  res.status(201).json({ message: 'Pickup added', pickup: p });
});
router.get('/pickups', auth, (req, res) => {
  res.json(memory.pickups);
});

// Communication
router.post('/messages', auth, staffOnly, (req, res) => {
  const m = { _id: String(Date.now()), to: req.body.to || 'parent', subject: req.body.subject || '', body: req.body.body || '', at: new Date(), by: req.user.userId };
  memory.messages.unshift(m);
  res.status(201).json({ message: 'Message sent', item: m });
});
router.get('/messages', auth, (req, res) => {
  res.json(memory.messages);
});

module.exports = router;


