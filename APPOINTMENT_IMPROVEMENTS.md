# Appointment System Improvements

## ✅ Issues Fixed

### 1. Past Date Confirmation Prevention
**Problem:** Doctors could confirm appointments even if the requested date had already passed.

**Solution:** Added date validation in the appointment status update endpoint.
- When a doctor tries to confirm an appointment, the system now checks if the appointment date is in the past
- If the date has passed, the system returns an error: "Cannot confirm past appointment. Please reschedule instead."
- This prevents doctors from confirming outdated appointments and encourages proper rescheduling

**Location:** `server/routes/appointments.js` - PATCH `/:id/status` endpoint

**Code Added:**
```javascript
// Check if appointment date has passed and trying to confirm
if (status === 'confirmed') {
  const appointmentDate = new Date(appointment.appointmentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (appointmentDate < today) {
    return res.status(400).json({ 
      message: 'Cannot confirm past appointment. Please reschedule instead.' 
    });
  }
}
```

---

### 2. Emergency Appointment Prioritization
**Problem:** Emergency appointments were buried in the chronological list, making it hard for doctors to identify urgent cases.

**Solution:** Updated the doctor's appointment list to prioritize emergency appointments.
- Emergency appointments (`isEmergency: true`) now appear at the top of the doctor's appointment list
- Sort order: Emergency first, then by date, then by time
- Doctors can immediately see and respond to urgent cases

**Location:** `server/routes/appointments.js` - GET `/doctor` endpoint

**Code Updated:**
```javascript
.sort({ 
  isEmergency: -1,  // Emergency appointments first (-1 = descending)
  appointmentDate: 1, 
  appointmentTime: 1 
})
```

---

### 3. Parent-Doctor Communication System
**Problem:** No way for parents and doctors to communicate about appointments.

**Solution:** Added a messaging system for appointment-specific communication.

#### Backend Changes:

**A. Model Update** (`server/models/Appointment.js`)
- Added `messages` array to store conversation history
- Each message includes:
  - `sender`: User who sent the message
  - `senderRole`: 'parent' or 'doctor'
  - `message`: The message content
  - `sentAt`: Timestamp

```javascript
messages: [{
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['parent', 'doctor'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}]
```

**B. New API Endpoints** (`server/routes/appointments.js`)

1. **POST `/:id/message`** - Send a message
   - Parents and doctors can send messages about their shared appointment
   - Validates that the user is part of the appointment (security check)
   - Auto-determines sender role (parent or doctor)
   - Returns updated message list

2. **GET `/:id/messages`** - Get all messages
   - Retrieves conversation history for an appointment
   - Only accessible to the parent and doctor involved
   - Includes sender details (name, email)

#### Usage:
```javascript
// Send a message
POST /api/appointments/:appointmentId/message
Body: { message: "Hello doctor, my child has a fever." }

// Get messages
GET /api/appointments/:appointmentId/messages
```

---

### 4. Curriculum Navigation Fix
**Problem:** Clicking the "Curriculum Plan" card was navigating to the Attendance tab instead of the Activities tab.

**Solution:** Fixed the navigation handler to go to the correct tab.
- Changed `setDaycareTab(3)` to `setDaycareTab(4)`
- Tab 3 = Attendance
- Tab 4 = Activities (correct destination)

**Location:** `client/src/pages/Parents/ParentDashboard.jsx` - Curriculum Plan card button

**Code Updated:**
```javascript
onClick={() => {
  setTab(1);
  setDaycareTab(4);  // Changed from 3 to 4
}}
```

---

## 📊 Tab Index Reference (Parent Dashboard - Daycare Section)

| Index | Tab Name |
|-------|----------|
| 0 | Profile |
| 1 | Medical & Emergency |
| 2 | Gallery |
| 3 | Attendance |
| 4 | Activities |
| 5 | Meals |
| 6 | Staff |

---

## 🚀 How to Use the Communication System

### For Frontend Implementation:

You'll need to add UI components in both Parent and Doctor dashboards to:

1. **Display message history** for each appointment
2. **Send new messages** with a text input and send button
3. **Auto-refresh or poll** for new messages (optional)

### Example Parent Dashboard Integration:

```javascript
// State for messages
const [appointmentMessages, setAppointmentMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');

// Fetch messages when viewing an appointment
const fetchMessages = async (appointmentId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/appointments/${appointmentId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    setAppointmentMessages(data.messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
};

// Send a message
const sendMessage = async (appointmentId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/appointments/${appointmentId}/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: newMessage })
    });
    const data = await response.json();
    setAppointmentMessages(data.messages);
    setNewMessage('');
  } catch (error) {
    console.error('Error sending message:', error);
  }
};
```

### Example UI Component:

```jsx
<Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
    Messages with Doctor
  </Typography>
  
  {/* Message History */}
  <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
    {appointmentMessages.map((msg, index) => (
      <Box 
        key={index} 
        sx={{ 
          mb: 1, 
          p: 1.5, 
          bgcolor: msg.senderRole === 'parent' ? '#e3f2fd' : '#fff3e0',
          borderRadius: 1,
          textAlign: msg.senderRole === 'parent' ? 'right' : 'left'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {msg.sender.name} • {new Date(msg.sentAt).toLocaleString()}
        </Typography>
        <Typography variant="body2">{msg.message}</Typography>
      </Box>
    ))}
  </Box>
  
  {/* Send Message */}
  <Box sx={{ display: 'flex', gap: 1 }}>
    <TextField
      fullWidth
      size="small"
      placeholder="Type your message..."
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
    />
    <Button 
      variant="contained" 
      onClick={() => sendMessage(appointment._id)}
      disabled={!newMessage.trim()}
    >
      Send
    </Button>
  </Box>
</Box>
```

---

## 🧪 Testing

### Test Past Date Validation:
1. Create an appointment with a past date
2. Try to confirm it as a doctor
3. Should receive error: "Cannot confirm past appointment. Please reschedule instead."

### Test Emergency Prioritization:
1. Create multiple appointments (some with `isEmergency: true`)
2. Check doctor's appointment list
3. Emergency appointments should appear at the top

### Test Communication:
1. As parent: Send a message on an appointment
2. As doctor: View the same appointment and reply
3. Both should see the conversation history

### Test Navigation:
1. Go to Parent Dashboard → Services tab
2. Click "View Curriculum" on the Curriculum Plan card
3. Should navigate to Activities tab (not Attendance)

---

## 📝 Notes

- All changes are backward compatible
- Existing appointments without messages will have an empty messages array
- The past date check only applies to "confirmed" status (other statuses like "rescheduled" or "cancelled" are not affected)
- Messages are stored permanently with the appointment (not deleted when appointment is completed)
- Admin users can also view and send messages for any appointment

---

## 🔄 Next Steps (Optional Enhancements)

1. **Real-time notifications** when new messages arrive (using WebSockets or polling)
2. **Read receipts** to show when doctor/parent has read messages
3. **File attachments** for sharing medical reports through chat
4. **Push notifications** for urgent messages or emergency appointments
5. **Message templates** for common doctor responses
6. **Auto-reminders** for appointments 24 hours before the scheduled time
