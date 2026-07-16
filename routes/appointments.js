const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const store = require('../services/data-store');

// Track used slot IDs to prevent double-booking
const bookedSlots = new Set();

// Initialize booked slots from persisted appointments
(function init() {
  const appts = store.getAppointments();
  appts.forEach(a => { if (a.slotId) bookedSlots.add(a.slotId); });
})();

// Generate available time slots for next 14 days
function generateTimeSlots() {
  const slots = [];
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let d = 0; d < 14; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const day = date.getDay();
    if (day === 0) continue; // Skip Sunday

    const isSaturday = day === 6;
    const startHour = isSaturday ? 10 : 9;
    const endHour = isSaturday ? 14 : 18;

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotDate = new Date(date);
        slotDate.setHours(h, m, 0, 0);
        if (slotDate > now) {
          const sid = uuidv4();
          slots.push({
            id: sid,
            date: slotDate.toISOString().split('T')[0],
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            label: `${dayNames[day]}, ${slotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'} (VUT)`,
            available: !bookedSlots.has(sid),
            displayDate: slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          });
        }
      }
    }
  }
  return slots;
}

// GET /api/appointments/slots - Get available time slots
router.get('/slots', (req, res) => {
  const slots = generateTimeSlots();
  const available = slots.filter(s => s.available).slice(0, 40);
  res.json(available);
});

// POST /api/appointments/book - Book an appointment
router.post('/book', async (req, res) => {
  try {
    const { slotId, name, email, phone, service, message } = req.body;

    if (!slotId || !name || !email) {
      return res.status(400).json({ error: 'Slot ID, name, and email are required' });
    }

    // Check for double-booking
    if (bookedSlots.has(slotId)) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    bookedSlots.add(slotId);

    // Persist to data store
      const appointment = await store.addAppointment({
      slotId,
      name,
      email,
      phone: phone || '',
      service: service || 'general',
      message: message || '',
      slotLabel: '',
      status: 'confirmed'
    });

    res.json({
      success: true,
      appointment: {
        id: appointment.id,
        status: appointment.status
      },
      message: 'Your consultation has been booked. You will receive a confirmation email shortly.'
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// GET /api/appointments/check/:id - Check appointment status
router.get('/check/:id', async (req, res) => {
  const appts = await store.getAppointments();
  const appt = appts.find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ status: appt.status, date: appt.createdAt });
});

module.exports = router;
