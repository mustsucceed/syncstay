import React, { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { Calendar, Copy, Plus, ChevronLeft, ChevronRight, X, Building, BedDouble, Check, Loader2, Lock, Trash2, LogOut } from 'lucide-react';
import './App.css';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- USER STATE ---
  const [user, setUser] = useState(null); 
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  // --- DATA STATE ---
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [activePropertyId, setActivePropertyId] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // MODALS
  const [modalType, setModalType] = useState(null); 
  const [forms, setForms] = useState({
    manual: { start: '', end: '', agent: '', pin: '' },
    property: { name: '', location: '', pin: '' },
    room: { name: '', price: '' },
    delete: { pin: '' }
  });

  const [copySuccess, setCopySuccess] = useState(false);
  
  // --- MAGIC LINK DETECTION ---
  const searchParams = new URLSearchParams(window.location.search);
  const isAgent = searchParams.get('view') === 'agent';
  const agentUid = searchParams.get('uid'); // The ID of the Landlord

  // --- INITIAL LOAD (Handle Agent View) ---
  useEffect(() => {
    if (isAgent && agentUid) {
      // If it's an agent link, load the specific Landlord's data immediately
      fetchUserData(agentUid);
    }
  }, [isAgent, agentUid]);

  // --- AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? 'login' : 'signup';
    try {
      const response = await fetch(`https://syncstay.onrender.com/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        fetchUserData(data.user.id);
      } else {
        alert(data.error);
      }
    } catch (err) { alert("Server connection failed"); }
  };

  const handleLogout = () => {
    setUser(null);
    setProperties([]);
    setRooms([]);
    setBookings([]);
    setActivePropertyId(null);
  };

  const fetchUserData = async (userId) => {
    setLoading(true);
    try {
      const response = await fetch(`https://syncstay.onrender.com/api/data?userId=${userId}`);
      const data = await response.json();
      setProperties(data.properties);
      setRooms(data.rooms);
      setBookings(data.bookings);
      
      // Auto-select first property
      if (data.properties.length > 0) {
        setActivePropertyId(data.properties[0].id);
        const firstPropRooms = data.rooms.filter(r => r.propertyId === data.properties[0].id);
        if (firstPropRooms.length > 0) setActiveRoomId(firstPropRooms[0].id);
      } else if (!isAgent) {
        setModalType('property'); // Prompt landlord to create one
      }
    } finally { setLoading(false); }
  };

  const activePropertyRooms = rooms.filter(r => r.propertyId === parseInt(activePropertyId));
  const activeRoom = rooms.find(r => r.id === parseInt(activeRoomId));
  const activeProperty = properties.find(p => p.id === parseInt(activePropertyId));

  useEffect(() => {
    if (activePropertyId && activePropertyRooms.length > 0) {
      const currentRoomInProp = activePropertyRooms.find(r => r.id === activeRoomId);
      if (!currentRoomInProp) setActiveRoomId(activePropertyRooms[0].id);
    }
  }, [activePropertyId, activePropertyRooms]);

  // --- ACTIONS ---
  
  const handleCopyLink = () => {
    // UPDATED: Now includes the Landlord's ID in the link
    const link = `${window.location.origin}/?view=agent&uid=${user.id}`;
    navigator.clipboard.writeText(link).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); });
  };
  
  const handleSaveBlock = async (e) => {
    e.preventDefault();
    if (!forms.manual.pin) return alert("Enter PIN");
    const newBooking = { id: Date.now(), roomId: activeRoomId, start: forms.manual.start, end: forms.manual.end, source: 'manual', label: forms.manual.agent || (isAgent ? 'Agent Booking' : 'Manual Block') };
    const response = await fetch('https://syncstay.onrender.com/api/bookings', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ...newBooking, pin: forms.manual.pin }) });
    if (response.ok) { setBookings([...bookings, newBooking]); setModalType(null); setForms({...forms, manual: {start:'', end:'', agent:'', pin:''}}); alert("Blocked!"); } else { alert("Incorrect PIN"); }
  };
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    if (!forms.property.pin) return alert("Set a PIN");
    const newProp = { id: Date.now(), userId: user.id, name: forms.property.name, location: forms.property.location, pin: forms.property.pin };
    setProperties([...properties, newProp]); setActivePropertyId(newProp.id); setModalType(null);
    await fetch('https://syncstay.onrender.com/api/properties', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newProp) });
  };
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    const newRoom = { id: Date.now(), propertyId: activePropertyId, name: forms.room.name, price: forms.room.price };
    setRooms([...rooms, newRoom]); setActiveRoomId(newRoom.id); setModalType(null);
    await fetch('https://syncstay.onrender.com/api/rooms', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newRoom) });
  };
  const handleDeleteProperty = async (e) => {
    e.preventDefault();
    const response = await fetch(`https://syncstay.onrender.com/api/properties/${activePropertyId}`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ pin: forms.delete.pin }) });
    if (response.ok) { 
        const updatedProps = properties.filter(p => p.id !== activePropertyId); setProperties(updatedProps); 
        if (updatedProps.length > 0) setActivePropertyId(updatedProps[0].id); else { setActivePropertyId(null); setActiveRoomId(null); } setModalType(null); 
    } else { alert("Incorrect PIN"); }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const calendarDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(startOfMonth(currentDate))) });
  const getBookingForDay = (day) => { if (!activeRoomId) return null; return bookings.find(booking => { if (booking.roomId !== activeRoomId) return false; const start = typeof booking.start === 'string' ? parseISO(booking.start.substring(0, 10)) : new Date(booking.start); const end = typeof booking.end === 'string' ? parseISO(booking.end.substring(0, 10)) : new Date(booking.end); return isWithinInterval(day, { start, end }); }); };

  // --- RENDER: LOGIN SCREEN ---
  if (!user && !isAgent) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="brand-header">
            <Calendar size={40} strokeWidth={2.5} color="#ff385c" />
            <span className="brand-name">SyncStay</span>
          </div>
          
          <h2 className="login-title">
            {authMode === 'login' ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="login-subtitle">
            {authMode === 'login' ? 'Login to manage your properties' : 'Create an account to start syncing'}
          </p>
          
          <form onSubmit={handleAuth}>
            <input className="login-input" placeholder="Username" required 
               value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
            
            <input className="login-input" type="password" placeholder="Password" required 
               value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            
            <button className="login-btn">
              {authMode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
          
          <div className="auth-switch" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
             {authMode === 'login' ? "New here? Create an account" : "Already have an account? Log In"}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: APP ---
  return (
    <div className="container">
      <header className="header">
        <div className="logo"><Calendar size={28} /> SyncStay</div>
        <div className="controls-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
            <Building size={16} color="#717171" />
            <select className="property-selector" value={activePropertyId || ''} onChange={(e) => setActivePropertyId(parseInt(e.target.value))}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!isAgent && properties.length > 0 && <button onClick={() => setModalType('delete')} style={{border:'none', background:'none', cursor:'pointer', color:'#ff385c', padding:'5px'}}><Trash2 size={18} /></button>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
            <BedDouble size={16} color="#717171" />
            <select className="property-selector" value={activeRoomId || ''} onChange={(e) => setActiveRoomId(parseInt(e.target.value))} disabled={!activePropertyRooms.length}>
              {activePropertyRooms.length === 0 ? <option>No Rooms</option> : activePropertyRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {!isAgent && (
            <>
              <button className="btn-outline" onClick={() => setModalType('property')}><Plus size={14} /> Property</button>
              <button className="btn-primary" onClick={() => setModalType('room')}><Plus size={14} /> Room</button>
              <button className="btn-outline" onClick={handleLogout} style={{color:'#666'}}><LogOut size={14}/></button>
            </>
          )}
        </div>
      </header>

      <div className="grid">
        <main>
          {activeRoom ? (
            <div className="property-header">
              <h1 className="property-title">{activeRoom.name}</h1>
              <div className="property-meta"><span>📍 {activeProperty?.name}</span><span>💰 {activeRoom.price} / night</span></div>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', border: '2px dashed #ddd', borderRadius: '12px' }}>
              <Building size={48} color="#ddd" style={{marginBottom:'20px'}}/>
              <h3>No Properties Found</h3>
              <p style={{marginBottom:'20px', color:'#777'}}>
                {isAgent ? "This link might be invalid or has no properties." : "Create your first building to start managing."}
              </p>
              {!isAgent && <button className="btn-primary" style={{margin:'0 auto'}} onClick={() => setModalType('property')}>+ Create Property</button>}
            </div>
          )}

          {activeRoom && (
            <div className="calendar-container">
              <div className="month-header">
                <button onClick={prevMonth} className="nav-btn"><ChevronLeft size={16} /></button>
                <span>{format(currentDate, 'MMMM yyyy')}</span>
                <button onClick={nextMonth} className="nav-btn"><ChevronRight size={16} /></button>
              </div>
              <div className="days-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="day-label">{day}</div>)}</div>
              <div className="dates-grid">
                {calendarDays.map((day, idx) => {
                  const booking = getBookingForDay(day);
                  return (
                    <div key={idx} className={`date-cell ${isSameDay(day, new Date()) ? 'today' : ''}`} style={{ opacity: isSameMonth(day, startOfMonth(currentDate)) ? 1 : 0.3 }}>
                      <span className="date-number">{format(day, 'd')}</span>
                      {booking && <div className={`booking-pill source-${booking.source}`}>{booking.source === 'manual' ? booking.label : booking.source}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <aside>
          <div className="sidebar-card" style={{ background: '#222', color: 'white' }}>
            <h3 className="card-title" style={{ color: 'white' }}>{isAgent ? "Report Booking" : "Quick Actions"}</h3>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setModalType('block')}>
              <Lock size={16} /> {isAgent ? "Block Dates (PIN Required)" : "Block Dates Manually"}
            </button>
          </div>

          {!isAgent && (
            <div className="sidebar-card">
              <h3 className="card-title">Share Calendar</h3>
              <div className="link-box">{window.location.host}/?view=agent&uid={user?.id}</div>
              <button className="btn-outline" style={{ width: '100%', justifyContent: 'center', borderColor: copySuccess ? 'green' : '#dddddd', color: copySuccess ? 'green' : 'inherit' }} onClick={handleCopyLink}>
                {copySuccess ? <Check size={16} /> : <Copy size={16} />} {copySuccess ? ' Copied!' : ' Copy Link'}
              </button>
            </div>
          )}
        </aside>
      </div>

      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalType === 'delete' ? 'Delete Property' : 'Manage'}</h3>
              <button className="close-btn" onClick={() => setModalType(null)}><X size={20} /></button>
            </div>
            {modalType === 'delete' && (
              <form onSubmit={handleDeleteProperty}>
                <p style={{marginBottom:'15px', color:'red'}}>Warning: This will delete <strong>{activeProperty?.name}</strong>.</p>
                <div className="form-group" style={{background: '#fff0f0', padding: '10px', borderRadius: '8px', border:'1px solid #fed7d7'}}><label className="form-label" style={{color:'#c53030'}}>Enter PIN to Confirm</label><input type="password" className="form-input" required placeholder="PIN" value={forms.delete.pin} onChange={e => setForms({...forms, delete: {pin: e.target.value}})} /></div>
                <button type="submit" className="btn-submit" style={{background:'#e53e3e'}}>Delete Forever</button>
              </form>
            )}
            {modalType === 'block' && (
              <form onSubmit={handleSaveBlock}>
                <div className="form-group"><label className="form-label">Check-in</label><input type="date" className="form-input" required value={forms.manual.start} onChange={e => setForms({...forms, manual: {...forms.manual, start: e.target.value}})} /></div>
                <div className="form-group"><label className="form-label">Check-out</label><input type="date" className="form-input" required value={forms.manual.end} onChange={e => setForms({...forms, manual: {...forms.manual, end: e.target.value}})} /></div>
                <div className="form-group"><label className="form-label">Agent Name</label><input type="text" className="form-input" value={forms.manual.agent} placeholder="e.g. Booking from Agent" onChange={e => setForms({...forms, manual: {...forms.manual, agent: e.target.value}})} /></div>
                <div className="form-group" style={{background: '#f8f8f8', padding: '10px', borderRadius: '8px'}}><label className="form-label">Security PIN <span style={{color:'red'}}>*</span></label><input type="password" className="form-input" required placeholder="Enter 4-digit PIN" value={forms.manual.pin} onChange={e => setForms({...forms, manual: {...forms.manual, pin: e.target.value}})} /></div>
                <button type="submit" className="btn-submit">Verify & Block</button>
              </form>
            )}
            {modalType === 'property' && (
              <form onSubmit={handleSaveProperty}>
                 <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-input" required value={forms.property.name} onChange={e => setForms({...forms, property: {...forms.property, name: e.target.value}})} /></div>
                 <div className="form-group"><label className="form-label">Location</label><input type="text" className="form-input" required value={forms.property.location} onChange={e => setForms({...forms, property: {...forms.property, location: e.target.value}})} /></div>
                 <div className="form-group" style={{background: '#eef2ff', padding: '10px', borderRadius: '8px', border:'1px solid #c7d2fe'}}><label className="form-label" style={{color: '#3730a3'}}>Create Booking PIN</label><input type="text" className="form-input" required placeholder="e.g. 1234" value={forms.property.pin} onChange={e => setForms({...forms, property: {...forms.property, pin: e.target.value}})} /></div>
                 <button type="submit" className="btn-submit">Create Property</button>
              </form>
            )}
            {modalType === 'room' && (
              <form onSubmit={handleSaveRoom}>
                 <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-input" required value={forms.room.name} onChange={e => setForms({...forms, room: {...forms.room, name: e.target.value}})} /></div>
                 <div className="form-group"><label className="form-label">Price</label><input type="text" className="form-input" required value={forms.room.price} onChange={e => setForms({...forms, room: {...forms.room, price: e.target.value}})} /></div>
                 <button type="submit" className="btn-submit">Create Room</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;