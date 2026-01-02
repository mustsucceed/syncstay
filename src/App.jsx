import React, { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { Calendar, Copy, Plus, ChevronLeft, ChevronRight, X, Building, BedDouble, Check, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- STATE ---
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [activePropertyId, setActivePropertyId] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // MODALS & FORMS
  const [modalType, setModalType] = useState(null); 
  const [forms, setForms] = useState({
    manual: { start: '', end: '', agent: '' },
    property: { name: '', location: '' },
    room: { name: '', price: '' }
  });

  const [copySuccess, setCopySuccess] = useState(false);
  const isAgent = window.location.search.includes('view=agent');

  // --- 1. FETCH EVERYTHING ON LOAD ---
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Using your live Render URL
        const response = await fetch('https://syncstay.onrender.com/api/data');
        const data = await response.json();
        
        setProperties(data.properties);
        setRooms(data.rooms);
        setBookings(data.bookings);

        // Set Defaults
        if (data.properties.length > 0) setActivePropertyId(data.properties[0].id);
        if (data.rooms.length > 0) setActiveRoomId(data.rooms[0].id);

      } catch (error) { 
        console.error("Fetch failed", error);
      } finally { 
        setLoading(false); 
      }
    };
    fetchAllData();
  }, []);

  // DERIVED DATA
  const activePropertyRooms = rooms.filter(r => r.propertyId === parseInt(activePropertyId));
  const activeRoom = rooms.find(r => r.id === parseInt(activeRoomId));
  const activeProperty = properties.find(p => p.id === parseInt(activePropertyId));

  // --- ACTIONS ---

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?view=agent`;
    navigator.clipboard.writeText(link).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleSaveBlock = async (e) => {
    e.preventDefault();
    if (!forms.manual.start || !forms.manual.end) return alert("Select dates");
    
    const newBooking = {
      id: Date.now(),
      roomId: activeRoomId,
      start: forms.manual.start,
      end: forms.manual.end,
      source: 'manual',
      label: forms.manual.agent || 'Manual Block'
    };

    // Optimistic Update (Show immediately)
    setBookings([...bookings, newBooking]);
    setModalType(null);
    setForms({ ...forms, manual: { start: '', end: '', agent: '' } });

    // Send to Server
    await fetch('https://syncstay.onrender.com/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking)
    });
  };

  const handleSaveProperty = async (e) => {
    e.preventDefault();
    const newProp = { id: Date.now(), name: forms.property.name, location: forms.property.location };
    
    setProperties([...properties, newProp]);
    setActivePropertyId(newProp.id);
    setModalType(null);

    await fetch('https://syncstay.onrender.com/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProp)
    });
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    const newRoom = { id: Date.now(), propertyId: activePropertyId, name: forms.room.name, price: forms.room.price };
    
    setRooms([...rooms, newRoom]);
    setActiveRoomId(newRoom.id);
    setModalType(null);

    await fetch('https://syncstay.onrender.com/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoom)
    });
  };

  // CALENDAR HELPERS
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const calendarDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(startOfMonth(currentDate))) });

  const getBookingForDay = (day) => {
    if (!activeRoomId) return null;
    return bookings.find(booking => {
      if (booking.roomId !== activeRoomId) return false;
      const start = typeof booking.start === 'string' ? parseISO(booking.start.substring(0, 10)) : new Date(booking.start);
      const end = typeof booking.end === 'string' ? parseISO(booking.end.substring(0, 10)) : new Date(booking.end);
      return isWithinInterval(day, { start, end });
    });
  };

  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><Loader2 className="animate-spin"/> Loading Calendar...</div>;

  return (
    <div className="container">
      <header className="header">
        <div className="logo"><Calendar size={28} /> SyncStay</div>
        
        {!isAgent && (
          <div className="controls-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
              <Building size={16} color="#717171" />
              <select className="property-selector" value={activePropertyId || ''} onChange={(e) => setActivePropertyId(parseInt(e.target.value))}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
              <BedDouble size={16} color="#717171" />
              <select className="property-selector" value={activeRoomId || ''} onChange={(e) => setActiveRoomId(parseInt(e.target.value))} disabled={!activePropertyRooms.length}>
                {activePropertyRooms.length === 0 ? <option>No Rooms</option> : activePropertyRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <button className="btn-outline" onClick={() => setModalType('property')}><Plus size={14} /> Property</button>
            <button className="btn-primary" onClick={() => setModalType('room')}><Plus size={14} /> Room</button>
          </div>
        )}
      </header>

      <div className="grid">
        <main style={{ gridColumn: isAgent ? '1 / -1' : 'auto' }}>
          {activeRoom ? (
            <div className="property-header">
              <h1 className="property-title">{activeRoom.name}</h1>
              <div className="property-meta">
                <span>📍 {activeProperty?.name}</span>
                <span>💰 {activeRoom.price} / night</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed #ddd', borderRadius: '12px' }}>
              <h3>No Data Found</h3>
              <p>Please create a Property and Room first.</p>
            </div>
          )}

          {activeRoom && (
            <div className="calendar-container">
              <div className="month-header">
                <button onClick={prevMonth} className="nav-btn"><ChevronLeft size={16} /></button>
                <span>{format(currentDate, 'MMMM yyyy')}</span>
                <button onClick={nextMonth} className="nav-btn"><ChevronRight size={16} /></button>
              </div>
              <div className="days-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="day-label">{day}</div>)}
              </div>
              <div className="dates-grid">
                {calendarDays.map((day, idx) => {
                  const booking = getBookingForDay(day);
                  return (
                    <div key={idx} className={`date-cell ${isSameDay(day, new Date()) ? 'today' : ''}`} style={{ opacity: isSameMonth(day, startOfMonth(currentDate)) ? 1 : 0.3 }}>
                      <span className="date-number">{format(day, 'd')}</span>
                      {booking && (
                        <div className={`booking-pill source-${booking.source}`}>
                          {booking.source === 'manual' ? booking.label : booking.source}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {!isAgent && activeRoom && (
          <aside>
            <div className="sidebar-card" style={{ background: '#222', color: 'white' }}>
              <h3 className="card-title" style={{ color: 'white' }}>Quick Actions</h3>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setModalType('block')}>
                <Plus size={18} /> Block Dates
              </button>
            </div>

            <div className="sidebar-card">
              <h3 className="card-title">Share Calendar</h3>
              <div className="link-box">{window.location.host}/?view=agent</div>
              <button 
                className="btn-outline" 
                style={{ width: '100%', justifyContent: 'center', borderColor: copySuccess ? 'green' : '#dddddd', color: copySuccess ? 'green' : 'inherit' }}
                onClick={handleCopyLink}
              >
                {copySuccess ? <Check size={16} /> : <Copy size={16} />} 
                {copySuccess ? ' Copied!' : ' Copy Link'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* --- MODALS (Same as before) --- */}
      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Manage</h3>
              <button className="close-btn" onClick={() => setModalType(null)}><X size={20} /></button>
            </div>
            {/* Keeping Forms Simple for Brevity - They work as mapped above */}
            {modalType === 'block' && (
              <form onSubmit={handleSaveBlock}>
                <div className="form-group"><label className="form-label">Check-in</label><input type="date" className="form-input" required value={forms.manual.start} onChange={e => setForms({...forms, manual: {...forms.manual, start: e.target.value}})} /></div>
                <div className="form-group"><label className="form-label">Check-out</label><input type="date" className="form-input" required value={forms.manual.end} onChange={e => setForms({...forms, manual: {...forms.manual, end: e.target.value}})} /></div>
                <div className="form-group"><label className="form-label">Agent</label><input type="text" className="form-input" value={forms.manual.agent} onChange={e => setForms({...forms, manual: {...forms.manual, agent: e.target.value}})} /></div>
                <button type="submit" className="btn-submit">Save</button>
              </form>
            )}
            {modalType === 'property' && (
              <form onSubmit={handleSaveProperty}>
                 <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-input" required value={forms.property.name} onChange={e => setForms({...forms, property: {...forms.property, name: e.target.value}})} /></div>
                 <div className="form-group"><label className="form-label">Location</label><input type="text" className="form-input" required value={forms.property.location} onChange={e => setForms({...forms, property: {...forms.property, location: e.target.value}})} /></div>
                 <button type="submit" className="btn-submit">Create</button>
              </form>
            )}
            {modalType === 'room' && (
              <form onSubmit={handleSaveRoom}>
                 <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-input" required value={forms.room.name} onChange={e => setForms({...forms, room: {...forms.room, name: e.target.value}})} /></div>
                 <div className="form-group"><label className="form-label">Price</label><input type="text" className="form-input" required value={forms.room.price} onChange={e => setForms({...forms, room: {...forms.room, price: e.target.value}})} /></div>
                 <button type="submit" className="btn-submit">Create</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;