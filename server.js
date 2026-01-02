import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- DATA STORAGE ---
let db = {
  properties: [
    // Default property with a default PIN '1234'
    { id: 1, name: "Blue Water Duplex", location: "Lekki Phase 1", pin: "1234" }
  ],
  rooms: [
    { id: 101, propertyId: 1, name: "Whole Apartment", price: "₦200,000" }
  ],
  bookings: [
    { id: 999, roomId: 101, start: new Date().toISOString(), end: new Date(Date.now() + 86400000).toISOString(), source: 'manual', label: 'Demo' }
  ]
};

// --- GET ENDPOINTS ---
app.get('/api/data', (req, res) => {
  res.json(db);
});

// --- POST ENDPOINTS ---
app.post('/api/properties', (req, res) => {
  // Save the PIN when creating property
  const newProp = req.body;
  if (!newProp.pin) newProp.pin = "1234"; // Default pin if none provided
  db.properties.push(newProp);
  res.json({ success: true });
});

app.post('/api/rooms', (req, res) => {
  db.rooms.push(req.body);
  res.json({ success: true });
});

app.post('/api/bookings', (req, res) => {
  const { pin, ...bookingData } = req.body;
  
  // 1. FIND THE PROPERTY FOR THIS BOOKING
  const room = db.rooms.find(r => r.id === parseInt(bookingData.roomId));
  if (!room) return res.status(404).json({ error: "Room not found" });

  const property = db.properties.find(p => p.id === room.propertyId);
  
  // 2. CHECK THE PIN
  if (property.pin !== pin) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  // 3. SAVE IF PIN IS CORRECT
  db.bookings.push(bookingData);
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Engine running on port ${PORT}`);
});