import express from 'express';
import cors from 'cors';
import ical from 'node-ical';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE (Simulated for MVP) ---
// In a real app, you would save these links in a database like MongoDB/Supabase
const PROPERTIES = [
  {
    id: 1,
    name: "Luxury 2-Bed Ocean View",
    icalLinks: [
      // PASTE THE LINK HERE inside quotes
      "https://calendar.google.com/calendar/ical/en.ng%23holiday%40group.v.calendar.google.com/public/basic.ics"
    ]
  }
];

// --- THE API ENDPOINT ---
app.get('/api/bookings', async (req, res) => {
  try {
    const property = PROPERTIES[0]; // Just getting the first one for now
    let allBookings = [];

    // Loop through all iCal links (Airbnb, Booking.com, etc)
    for (const link of property.icalLinks) {
      // 1. Fetch the raw file
      const response = await axios.get(link);
      
      // 2. Parse the confusing text into Objects
      const data = ical.parseICS(response.data);

      // 3. Extract just the dates
      for (let k in data) {
        const event = data[k];
        if (event.type === 'VEVENT') {
            
          // Identify Source based on URL (Simple logic)
          let source = 'manual';
          if (link.includes('airbnb')) source = 'airbnb';
          if (link.includes('booking')) source = 'booking';

          allBookings.push({
            id: event.uid,
            start: event.start,
            end: event.end,
            source: source,
            label: event.summary || 'Booked'
          });
        }
      }
    }

    res.json(allBookings);

  } catch (error) {
    console.error("Error fetching calendar:", error);
    res.status(500).json({ error: "Failed to sync calendars" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Engine running on http://localhost:${PORT}`);
});