import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- DATA STORAGE ---
let db = {
  properties: [
    { id: 1, name: "Blue Water Duplex", location: "Lekki Phase 1", pin: "1234" }
  ],
  rooms: [
    { id: 101, propertyId: 1, name: "Whole Apartment", price: "₦200,000" }
  ],
  bookings: [
    { id: 999, roomId: 101, start: new Date().toISOString(), end: new Date(Date.now() + 86400000).toISOString(), source: 'manual', label: 'Demo' }
  ]
};

// --- GET ---
app.get('/api/data', (req, res) => {
  res.json(db);
});

// --- POST (Create) ---
app.post('/api/properties', (req, res) => {
  const newProp = req.body;
  if (!newProp.pin) newProp.pin = "1234";
  db.properties.push(newProp);
  res.json({ success: true });
});

app.post('/api/rooms', (req, res) => {
  db.rooms.push(req.body);
  res.json({ success: true });
});

app.post('/api/bookings', (req, res) => {
  const { pin, ...bookingData } = req.body;
  const room = db.rooms.find(r => r.id === parseInt(bookingData.roomId));
  if (!room) return res.status(404).json({ error: "Room not found" });

  const property = db.properties.find(p => p.id === room.propertyId);
  if (property.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });

  db.bookings.push(bookingData);
  res.json({ success: true });
});

// --- NEW: DELETE PROPERTY ---
app.delete('/api/properties/:id', (req, res) => {
  const { pin } = req.body;
  const id = parseInt(req.params.id);

  const propIndex = db.properties.findIndex(p => p.id === id);
  if (propIndex === -1) return res.status(404).json({ error: "Not found" });

  // CHECK PIN
  if (db.properties[propIndex].pin !== pin) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  // DELETE
  db.properties.splice(propIndex, 1);
  
  // CLEANUP (Remove rooms and bookings for this property)
  const roomIds = db.rooms.filter(r => r.propertyId === id).map(r => r.id);
  db.rooms = db.rooms.filter(r => r.propertyId !== id);
  db.bookings = db.bookings.filter(b => !roomIds.includes(b.roomId));

  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Engine running on port ${PORT}`);
});