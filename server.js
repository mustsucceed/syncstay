import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config'; // Loads the .env file

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. SECURE DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI; 

// Safety Check: Did you forget the .env file?
if (!MONGO_URI) {
  console.error("FATAL ERROR: MONGO_URI is missing. Check your .env file or Render Environment Variables.");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Database"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// --- 2. SCHEMAS (Data Shape) ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const PropertySchema = new mongoose.Schema({
  userId: String,
  name: String,
  location: String,
  pin: String
});

const RoomSchema = new mongoose.Schema({
  propertyId: String,
  name: String,
  price: String
});

const BookingSchema = new mongoose.Schema({
  roomId: String,
  start: String,
  end: String,
  source: String,
  label: String
});

// --- 3. MODELS ---
const User = mongoose.model('User', UserSchema);
const Property = mongoose.model('Property', PropertySchema);
const Room = mongoose.model('Room', RoomSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// --- 4. AUTH ENDPOINTS ---
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const newUser = await User.create({ username, password });
    res.json({ success: true, user: { id: newUser._id.toString(), username: newUser.username } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ success: true, user: { id: user._id.toString(), username: user.username } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. DATA ENDPOINTS ---
app.get('/api/data', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Get Properties for this user
    const properties = await Property.find({ userId });
    
    // Get Rooms belonging to those properties
    const propIds = properties.map(p => p._id.toString());
    const rooms = await Room.find({ propertyId: { $in: propIds } });
    
    // Get Bookings belonging to those rooms
    const roomIds = rooms.map(r => r._id.toString());
    const bookings = await Booking.find({ roomId: { $in: roomIds } });

    // Helper to format IDs nicely for frontend
    const mapId = (items) => items.map(item => ({ ...item.toObject(), id: item._id.toString() }));

    res.json({
      properties: mapId(properties),
      rooms: mapId(rooms),
      bookings: mapId(bookings)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 6. CREATE ENDPOINTS ---
app.post('/api/properties', async (req, res) => {
  try {
    await Property.create(req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rooms', async (req, res) => {
  try {
    await Room.create(req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { pin, ...bookingData } = req.body;
    
    // Security Check: Verify PIN
    const room = await Room.findById(bookingData.roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    
    const property = await Property.findById(room.propertyId);
    if (property.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });

    await Booking.create(bookingData);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 7. DELETE ENDPOINT ---
app.delete('/api/properties/:id', async (req, res) => {
  try {
    const { pin } = req.body;
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ error: "Not found" });
    if (property.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });

    // Delete property
    await Property.findByIdAndDelete(id);
    
    // Cleanup: Delete related rooms and bookings
    const rooms = await Room.find({ propertyId: id });
    const roomIds = rooms.map(r => r._id);
    await Room.deleteMany({ propertyId: id });
    await Booking.deleteMany({ roomId: { $in: roomIds } });

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Engine running on port ${PORT}`);
});