// ============================================================
// STATE
// ============================================================
const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null')
};

// ============================================================
// VIEW SWITCHER
// ============================================================
const allViews = ['landing-view','auth-view','dashboard-view'];
function showView(id) {
  allViews.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) target.style.display = 'flex';
}

// ============================================================
// API HELPERS
// ============================================================
async function apiGet(url) {
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${state.token}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function apiPost(url, body) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) { return { error: e.message }; }
}
async function apiPatch(url, body = {}) {
  try {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) { return { error: e.message }; }
}

// ============================================================
// STATUS BADGE HELPER
// ============================================================
function badge(text, color) {
  const colors = {
    green: 'background:rgba(78,222,163,0.15);color:#4edea3;border:1px solid rgba(78,222,163,0.3)',
    blue:  'background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3)',
    yellow:'background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)',
    red:   'background:rgba(255,180,171,0.15);color:#ffb4ab;border:1px solid rgba(255,180,171,0.3)',
    gray:  'background:rgba(187,202,191,0.1);color:#bbcabf;border:1px solid rgba(187,202,191,0.2)'
  };
  return `<span style="padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;${colors[color]||colors.gray}">${text}</span>`;
}

// ============================================================
// AUTH LOGIC
// ============================================================
function initAuth() {
  const loginForm   = document.getElementById('login-form');
  const registerForm= document.getElementById('register-form');
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginErr    = document.getElementById('loginError');
  const regErr      = document.getElementById('regError');

  const loginPanel    = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');

  tabLogin.onclick = () => {
    loginPanel.classList.add('visible');
    registerPanel.classList.remove('visible');
    tabLogin.classList.add('active-tab');
    tabRegister.classList.remove('active-tab');
  };
  tabRegister.onclick = () => {
    registerPanel.classList.add('visible');
    loginPanel.classList.remove('visible');
    tabRegister.classList.add('active-tab');
    tabLogin.classList.remove('active-tab');
  };

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginErr.style.display = 'none';
    const email    = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = loginForm.querySelector('button[type="submit"]');
    
    try {
      btn.disabled = true;
      btn.textContent = 'Connecting to Database...';

      const data = await apiPost('/api/login', { email, password });
      
      btn.disabled = false;
      btn.textContent = 'Initialize Session';

      if (data && data.token) {
        state.token = data.token;
        state.user  = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        loadDashboard();
      } else {
        loginErr.textContent = (data && data.error) || 'Login failed';
        loginErr.style.display = 'block';
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Initialize Session';
      loginErr.textContent = err.message || 'An unexpected error occurred';
      loginErr.style.display = 'block';
    }
  };

  registerForm.onsubmit = async (e) => {
    e.preventDefault();
    regErr.style.display = 'none';
    const body = {
      name:     document.getElementById('regName').value,
      email:    document.getElementById('regEmail').value,
      phone:    document.getElementById('regPhone').value,
      role:     document.getElementById('regRole').value,
      password: document.getElementById('regPassword').value
    };
    const data = await apiPost('/api/register', body);
    if (data && data.token) {
      state.token = data.token;
      state.user  = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      loadDashboard();
    } else {
      regErr.textContent = (data && data.error) || 'Registration failed';
      regErr.style.display = 'block';
    }
  };

  document.getElementById('logoutBtn').onclick = () => {
    state.token = null; state.user = null;
    localStorage.clear();
    showView('landing-view');
  };
}

// ============================================================
// DASHBOARD SHELL
// ============================================================
function loadDashboard() {
  showView('dashboard-view');
  const role = state.user.role;
  document.getElementById('user-role-badge').textContent = role.replace('_',' ').toUpperCase();
  document.getElementById('user-name-display').textContent = state.user.name || state.user.email;

  // Build sidebar based on role
  const navItems = {
    admin: [
      { label: 'Overview',   icon: 'dashboard',      fn: 'renderAdminOverview()' },
      { label: 'Users',      icon: 'group',           fn: 'renderAdminUsers()' },
      { label: 'Pickups',    icon: 'local_shipping',  fn: 'renderAdminPickups()' },
      { label: 'Smart Bins', icon: 'delete_sweep',    fn: 'renderAdminBins()' },
      { label: 'Lots',       icon: 'inventory_2',     fn: 'renderAdminLots()' }
    ],
    customer_hall: [
      { label: 'My Pickups', icon: 'local_shipping', fn: 'renderHallDash()' },
      { label: 'Book New',   icon: 'add_circle',     fn: 'openScheduleModal()' }
    ],
    customer_commercial: [
      { label: 'Smart Bins', icon: 'delete_sweep',   fn: 'renderCommercialDash()' }
    ],
    recycler: [
      { label: 'My Lots',    icon: 'inventory_2',    fn: 'renderRecyclerDash()' }
    ]
  };

  const items = navItems[role] || [];
  document.getElementById('sidebar-nav').innerHTML = items.map((item, i) => `
    <a href="#" onclick="${item.fn};return false;" class="nav-link ${i===0?'active':''}">
      <span class="material-symbols-outlined">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `).join('');

  // Load first page
  if (role === 'admin')               renderAdminOverview();
  else if (role === 'customer_hall')  renderHallDash();
  else if (role === 'customer_commercial') renderCommercialDash();
  else if (role === 'recycler')       renderRecyclerDash();
}

// ============================================================
// ADMIN DASHBOARDS
// ============================================================
async function renderAdminOverview() {
  setTitle('Admin Command Center');
  setContent('<p class="loading">Loading overview...</p>');
  const [users, pickups, bins, lots] = await Promise.all([
    apiGet('/api/admin/users'),
    apiGet('/api/admin/pickups'),
    apiGet('/api/admin/smartbins'),
    apiGet('/api/admin/lots')
  ]);
  if (!users) return setContent(offlineMsg());

  const totalKg = Array.isArray(lots) ? lots.reduce((s,l)=>s+l.weightKg,0) : 0;
  const criticalBins = Array.isArray(bins) ? bins.filter(b=>b.needsCollection).length : 0;

  setContent(`
    <div class="stats-grid">
      ${statCard('group','Users',Array.isArray(users)?users.length:0,'#4edea3')}
      ${statCard('local_shipping','Total Pickups',Array.isArray(pickups)?pickups.length:0,'#60a5fa')}
      ${statCard('delete_sweep','Critical Bins',criticalBins,'#ffb4ab')}
      ${statCard('inventory_2','Total kg Lots',totalKg,'#fbbf24')}
    </div>
    <div class="section-hint">Use the sidebar to manage Users, Pickups, Smart Bins, and Lots.</div>
  `);
}

async function renderAdminUsers() {
  setTitle('User Management');
  setContent('<p class="loading">Loading users...</p>');
  const users = await apiGet('/api/admin/users');
  if (!users) return setContent(offlineMsg());

  const roleColor = { admin:'green', customer_hall:'blue', customer_commercial:'yellow', recycler:'gray' };
  setContent(`
    <div class="table-card">
      <div class="table-header"><h3>All Users (${users.length})</h3></div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
        <tbody>
          ${users.map(u=>`
            <tr>
              <td><strong>${u.name||'—'}</strong></td>
              <td>${u.email}</td>
              <td>${u.phone||'—'}</td>
              <td>${badge(u.role.replace('_',' '), roleColor[u.role]||'gray')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `);
}

async function renderAdminPickups() {
  setTitle('All Pickup Requests');
  setContent('<p class="loading">Loading pickups...</p>');
  const pickups = await apiGet('/api/admin/pickups');
  if (!pickups) return setContent(offlineMsg());

  setContent(`
    <div class="table-card">
      <div class="table-header"><h3>Pickup Requests (${pickups.length})</h3></div>
      <table>
        <thead><tr><th>Hall</th><th>Location</th><th>Date</th><th>Est. kg</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${pickups.length ? pickups.map(p=>`
            <tr>
              <td>${p.hallId?.name||'Unknown'}</td>
              <td>${p.location}</td>
              <td>${new Date(p.date).toLocaleDateString()}</td>
              <td><strong>${p.estimatedKg} kg</strong></td>
              <td>${badge(p.status, p.status==='Collected'?'green':p.status==='Pending'?'yellow':'blue')}</td>
              <td>${p.status!=='Collected'?`<button class="btn-sm btn-green" onclick="markPickupComplete('${p._id}')">Mark Collected</button>`:'—'}</td>
            </tr>
          `).join('') : '<tr><td colspan="6" class="empty">No pickups yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
}

async function renderAdminBins() {
  setTitle('Smart Bin Fleet');
  setContent('<p class="loading">Loading bins...</p>');
  const bins = await apiGet('/api/admin/smartbins');
  if (!bins) return setContent(offlineMsg());

  setContent(`
    <div class="table-card">
      <div class="table-header"><h3>Smart Bins (${bins.length})</h3></div>
      <table>
        <thead><tr><th>Location</th><th>Assigned To</th><th>Fill Level</th><th>Status</th></tr></thead>
        <tbody>
          ${bins.length ? bins.map(b=>`
            <tr>
              <td><strong>${b.location}</strong></td>
              <td>${b.assignedToUserId?.name||'Unassigned'}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${b.sensorFillLevelPercentage}%;background:${b.needsCollection?'#ffb4ab':'#4edea3'}"></div>
                </div>
                <span class="progress-label">${b.sensorFillLevelPercentage}%</span>
              </td>
              <td>${b.needsCollection ? badge('Critical','red') : badge('Optimal','green')}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" class="empty">No bins deployed.</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
}

async function renderAdminLots() {
  setTitle('Plastic Lots');
  setContent('<p class="loading">Loading lots...</p>');
  const [lots, recyclers] = await Promise.all([
    apiGet('/api/admin/lots'),
    apiGet('/api/admin/users')
  ]);
  if (!lots) return setContent(offlineMsg());

  const recyclerList = Array.isArray(recyclers) ? recyclers.filter(u=>u.role==='recycler') : [];
  const recyclerOptions = recyclerList.map(r=>`<option value="${r._id}">${r.name}</option>`).join('');

  setContent(`
    <div class="table-card" style="margin-bottom:24px">
      <div class="table-header">
        <h3>Create New Lot</h3>
      </div>
      <form class="inline-form" onsubmit="createLot(event)">
        <input id="lotId" placeholder="Lot ID (e.g. LOT-1002)" required />
        <input id="lotKg" type="number" placeholder="Weight (kg)" required />
        <select id="lotRecycler" required>
          <option value="">Assign to Recycler...</option>
          ${recyclerOptions}
        </select>
        <button type="submit" class="btn-green">Create Lot</button>
      </form>
    </div>
    <div class="table-card">
      <div class="table-header"><h3>All Lots (${lots.length})</h3></div>
      <table>
        <thead><tr><th>Lot ID</th><th>Weight</th><th>Recycler</th><th>Status</th></tr></thead>
        <tbody>
          ${lots.length ? lots.map(l=>`
            <tr>
              <td><strong class="text-primary">${l.lotId}</strong></td>
              <td>${l.weightKg} kg</td>
              <td>${l.assignedRecyclerId?.name||'Unassigned'}</td>
              <td>${badge(l.status, l.status==='Completed'?'green':l.status==='Processing'?'blue':'yellow')}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" class="empty">No lots yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
}

async function createLot(e) {
  e.preventDefault();
  const body = {
    lotId: document.getElementById('lotId').value,
    weightKg: document.getElementById('lotKg').value,
    assignedRecyclerId: document.getElementById('lotRecycler').value
  };
  await apiPost('/api/admin/lots', body);
  renderAdminLots();
}

async function markPickupComplete(id) {
  await apiPatch(`/api/admin/pickups/${id}/complete`);
  renderAdminPickups();
}

// ============================================================
// HALL DASHBOARD
// ============================================================
async function renderHallDash() {
  setTitle('My Pickup Directives');
  setContent('<p class="loading">Loading pickups...</p>');
  const pickups = await apiGet('/api/customer/pickups');
  if (!pickups) return setContent(offlineMsg());

  setContent(`
    <div class="page-header">
      <div></div>
      <button class="btn-green" onclick="openScheduleModal()">
        <span class="material-symbols-outlined">add</span> Book New Pickup
      </button>
    </div>
    <div class="cards-grid">
      ${Array.isArray(pickups) && pickups.length ? pickups.map(p=>`
        <div class="pickup-card ${p.status==='Collected'?'border-green':'border-yellow'}">
          <div class="pickup-card-top">
            <span class="pickup-date">${new Date(p.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
            ${badge(p.status, p.status==='Collected'?'green':'yellow')}
          </div>
          <div class="pickup-location">
            <span class="material-symbols-outlined">location_on</span> ${p.location}
          </div>
          <div class="pickup-kg">${p.estimatedKg} <span>kg</span></div>
        </div>
      `).join('') : '<p class="empty-state">No pickups booked yet. Click "Book New Pickup" to get started.</p>'}
    </div>
  `);
}

// ============================================================
// COMMERCIAL DASHBOARD
// ============================================================
async function renderCommercialDash() {
  setTitle('Smart Bin Telemetry');
  setContent('<p class="loading">Loading telemetry...</p>');
  const bin = await apiGet('/api/customer/smartbin');
  if (!bin) return setContent('<p class="empty-state">No Smart Bin assigned to your account. Contact admin.</p>');

  const pct = bin.sensorFillLevelPercentage;
  setContent(`
    <div class="bin-detail-card">
      <div class="bin-icon-wrap">
        <span class="material-symbols-outlined bin-icon">delete_sweep</span>
      </div>
      <h2>${bin.location}</h2>
      <p class="bin-id">Unit ID: ${bin._id.toString().slice(-8).toUpperCase()}</p>
      <div class="fill-section">
        <div class="fill-labels"><span>Capacity Used</span><span style="color:${pct>80?'#ffb4ab':'#4edea3'};font-weight:700">${pct}%</span></div>
        <div class="fill-track"><div class="fill-bar" style="width:${pct}%;background:${pct>80?'linear-gradient(90deg,#ffb4ab,#ff897d)':'linear-gradient(90deg,#4edea3,#10b981)'}"></div></div>
      </div>
      <div class="bin-status-msg ${bin.needsCollection?'status-critical':'status-ok'}">
        <span class="material-symbols-outlined">${bin.needsCollection?'warning':'check_circle'}</span>
        ${bin.needsCollection?'Collection Required — Squad Dispatched':'Capacity Nominal — Operating Normally'}
      </div>
    </div>
  `);
}

// ============================================================
// RECYCLER DASHBOARD
// ============================================================
async function renderRecyclerDash() {
  setTitle('Assigned Lots');
  setContent('<p class="loading">Loading lots...</p>');
  const lots = await apiGet('/api/recycler/lots');
  if (!lots) return setContent(offlineMsg());

  const nextStatus = { Allocated:'Acknowledged', Acknowledged:'Processing', Processing:'Completed' };

  setContent(`
    <div class="table-card">
      <div class="table-header"><h3>My Lots (${lots.length})</h3></div>
      <table>
        <thead><tr><th>Lot ID</th><th>Weight</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${lots.length ? lots.map(l=>`
            <tr>
              <td><strong class="text-primary">${l.lotId}</strong></td>
              <td>${l.weightKg} kg</td>
              <td>${badge(l.status, l.status==='Completed'?'green':l.status==='Processing'?'blue':'yellow')}</td>
              <td>${nextStatus[l.status]
                ? `<button class="btn-sm btn-blue" onclick="updateLotStatus('${l._id}','${nextStatus[l.status]}')">→ ${nextStatus[l.status]}</button>`
                : badge('Done','green')}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" class="empty">No lots assigned yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
}

async function updateLotStatus(id, status) {
  await apiPatch(`/api/recycler/lots/${id}/status`, { status });
  renderRecyclerDash();
}

// ============================================================
// SCHEDULE MODAL
// ============================================================
function openScheduleModal() {
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-box" onclick="event.stopPropagation()">
        <h2 class="modal-title">Book Waste Collection</h2>
        <form onsubmit="submitPickup(event)" class="modal-form">
          <label>Location / Venue Name</label>
          <input id="m-location" placeholder="e.g. Grand Palace Hall" required />
          <label>Date</label>
          <input id="m-date" type="date" required />
          <label>Time</label>
          <input id="m-time" type="time" required />
          <label>Estimated Payload (kg)</label>
          <input id="m-kg" type="number" placeholder="150" required />
          <div class="modal-actions">
            <button type="button" class="btn-outline" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-green">Confirm Booking</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function submitPickup(e) {
  e.preventDefault();
  await apiPost('/api/customer/pickups', {
    location: document.getElementById('m-location').value,
    date:     document.getElementById('m-date').value,
    time:     document.getElementById('m-time').value,
    estimatedKg: document.getElementById('m-kg').value
  });
  closeModal();
  renderHallDash();
}

function closeModal() {
  document.getElementById('modal-container').innerHTML = '';
}

// ============================================================
// UI HELPERS
// ============================================================
function setTitle(t) {
  const el = document.getElementById('dashboard-title');
  if (el) el.textContent = t;
}
function setContent(html) {
  const el = document.getElementById('dashboard-content');
  if (el) el.innerHTML = html;
}
function offlineMsg() {
  return `<div class="offline-msg"><span class="material-symbols-outlined">cloud_off</span><strong>Database Offline</strong><p>Cannot connect to MongoDB Atlas. Please whitelist your IP at cloud.mongodb.com → Network Access → Add IP → Allow Anywhere.</p></div>`;
}
function statCard(icon, label, value, color) {
  return `
    <div class="stat-card" style="border-top:3px solid ${color}">
      <div class="stat-icon" style="color:${color};background:${color}22"><span class="material-symbols-outlined">${icon}</span></div>
      <div class="stat-body">
        <p class="stat-label">${label}</p>
        <h3 class="stat-value" style="color:${color}">${value}</h3>
      </div>
    </div>
  `;
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  initAuth();
  // Expose functions for landing page buttons
  window.goToAuth = () => showView('auth-view');

  if (state.token && state.user) {
    loadDashboard();
  } else {
    showView('landing-view');
  }
});
