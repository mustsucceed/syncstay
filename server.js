import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE ---
let db = {
  users: [], // Stores { id, username, password }
  properties: [],
  rooms: [],
  bookings: []
};

// --- AUTH ENDPOINTS ---
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  if (db.users.find(u => u.username === username)) {
    return res.status(400).json({ error: "User already exists" });
  }
  const newUser = { id: Date.now(), username, password };
  db.users.push(newUser);
  res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// --- DATA ENDPOINTS (Now Filtered by User) ---
app.get('/api/data', (req, res) => {
  const userId = parseInt(req.query.userId); // Who is asking?
  
  // Filter: Only send data belonging to this user
  const userProps = db.properties.filter(p => p.userId === userId);
  const propIds = userProps.map(p => p.id);
  const userRooms = db.rooms.filter(r => propIds.includes(r.propertyId));
  const roomIds = userRooms.map(r => r.id);
  const userBookings = db.bookings.filter(b => roomIds.includes(b.roomId));

  res.json({
    properties: userProps,
    rooms: userRooms,
    bookings: userBookings
  });
});

// --- CREATE ENDPOINTS (Attach User ID) ---
app.post('/api/properties', (req, res) => {
  const { userId, ...propData } = req.body;
  const newProp = { ...propData, userId }; 
  db.properties.push(newProp);
  res.json({ success: true });
});

app.post('/api/rooms', (req, res) => {
  db.rooms.push(req.body);
  res.json({ success: true });
});

app.post('/api/bookings', (req, res) => {
  const { pin, ...bookingData } = req.body;
  
  // Verify PIN
  const room = db.rooms.find(r => r.id === parseInt(bookingData.roomId));
  if (!room) return res.status(404).json({ error: "Room not found" });
  
  const property = db.properties.find(p => p.id === room.propertyId);
  if (property.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });

  db.bookings.push(bookingData);
  res.json({ success: true });
});

app.delete('/api/properties/:id', (req, res) => {
  const { pin } = req.body;
  const id = parseInt(req.params.id);
  const propIndex = db.properties.findIndex(p => p.id === id);
  
  if (propIndex === -1) return res.status(404).json({ error: "Not found" });
  if (db.properties[propIndex].pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });

  db.properties.splice(propIndex, 1);
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Engine running on port ${PORT}`);
});