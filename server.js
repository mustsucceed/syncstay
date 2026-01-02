import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- DATA STORAGE (Resets on Server Restart) ---
// We pre-fill this with data so the Agent view is NEVER blank for your demo.
let db = {
  properties: [
    { id: 1, name: "Blue Water Duplex", location: "Lekki Phase 1" }
  ],
  rooms: [
    { id: 101, propertyId: 1, name: "Whole Apartment", price: "₦200,000" },
    { id: 102, propertyId: 1, name: "Master Bedroom", price: "₦65,000" }
  ],
  bookings: [
    // Pre-filled booking so you can see it working immediately
    { 
      id: 999, 
      roomId: 101, 
      start: new Date().toISOString(), // Today
      end: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days later
      source: 'manual', 
      label: 'Demo Booking' 
    }
  ]
};

// --- GET ENDPOINTS ---
app.get('/api/data', (req, res) => {
  res.json(db);
});

// --- POST ENDPOINTS (Save Data) ---
app.post('/api/bookings', (req, res) => {
  const newBooking = req.body;
  if (!newBooking.start || !newBooking.end) return res.status(400).json({ error: "Missing dates" });
  db.bookings.push(newBooking);
  res.json({ success: true, booking: newBooking });
});

app.post('/api/properties', (req, res) => {
  db.properties.push(req.body);
  res.json({ success: true });
});

app.post('/api/rooms', (req, res) => {
  db.rooms.push(req.body);
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Engine running on port ${PORT}`);
});