/**
 * Tamil Nadu Van Travels - Admin Dashboard Application Logic
 */

let ADMIN_TOKEN = sessionStorage.getItem('tn_admin_token') || null;
let ALL_BOOKINGS = [];
let ACTIVE_BOOKING_MODAL = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdminAuth();
  bindAdminEvents();
});

function initAdminAuth() {
  if (ADMIN_TOKEN) {
    showAdminDashboard();
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('admin-login-view').style.display = 'flex';
  document.getElementById('admin-dashboard-view').style.display = 'none';
}

function showAdminDashboard() {
  document.getElementById('admin-login-view').style.display = 'none';
  document.getElementById('admin-dashboard-view').style.display = 'block';
  loadDashboardData();
}

function bindAdminEvents() {
  // Login Form
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('admin-pin-input').value.trim();
      const loginErr = document.getElementById('login-error-msg');
      loginErr.textContent = '';

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();
        if (data.success && data.token) {
          ADMIN_TOKEN = data.token;
          sessionStorage.setItem('tn_admin_token', ADMIN_TOKEN);
          showAdminDashboard();
        } else {
          loginErr.textContent = data.error || 'Invalid PIN code';
        }
      } catch (err) {
        loginErr.textContent = 'Connection error. Please try again.';
      }
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (ADMIN_TOKEN) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
        });
      }
      ADMIN_TOKEN = null;
      sessionStorage.removeItem('tn_admin_token');
      showLoginScreen();
    });
  }

  // Tab Navigation in Admin
  const tabBtns = document.querySelectorAll('.admin-nav-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
      document.getElementById(target).style.display = 'block';
    });
  });

  // Booking Status Filters
  const filterBtns = document.querySelectorAll('.booking-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterAndRenderBookings(btn.getAttribute('data-status'));
    });
  });

  // Search Bookings
  const searchInput = document.getElementById('booking-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = ALL_BOOKINGS.filter(b => 
        b.ref_number.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q) ||
        b.mobile.includes(q) ||
        b.destination.toLowerCase().includes(q)
      );
      renderBookingsTable(filtered);
    });
  }

  // Settings Form Submit
  const settingsForm = document.getElementById('admin-settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        company_name: document.getElementById('set-company-name').value.trim(),
        tagline: document.getElementById('set-tagline').value.trim(),
        phone: document.getElementById('set-phone').value.trim(),
        whatsapp_number: document.getElementById('set-whatsapp').value.trim(),
        email: document.getElementById('set-email').value.trim(),
        office_address: document.getElementById('set-address').value.trim(),
        operating_hours: document.getElementById('set-hours').value.trim(),
        admin_pin: document.getElementById('set-pin').value.trim()
      };

      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert('Settings updated successfully! Changes are live across the website.');
        } else {
          alert('Error: ' + data.error);
        }
      } catch (err) {
        alert('Failed to save settings.');
      }
    });
  }
}

async function loadDashboardData() {
  await Promise.all([
    loadStats(),
    loadBookings(),
    loadVehiclesForAdmin(),
    loadSettingsForAdmin()
  ]);
}

async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('stat-total-enquiries').textContent = data.stats.total_enquiries;
      document.getElementById('stat-pending-quotes').textContent = data.stats.pending_quotes;
      document.getElementById('stat-confirmed-trips').textContent = data.stats.confirmed_trips;
      document.getElementById('stat-active-fleet').textContent = data.stats.active_vehicles;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadBookings() {
  try {
    const res = await fetch('/api/admin/bookings', {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await res.json();
    if (data.success) {
      ALL_BOOKINGS = data.bookings;
      renderBookingsTable(data.bookings);
    }
  } catch (err) {
    console.error('Failed to load bookings:', err);
  }
}

function filterAndRenderBookings(status) {
  if (!status || status === 'All') {
    renderBookingsTable(ALL_BOOKINGS);
  } else {
    renderBookingsTable(ALL_BOOKINGS.filter(b => b.status === status));
  }
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#94a3b8;">No enquiry records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    let badgeClass = 'badge-pending';
    if (b.status === 'Confirmed') badgeClass = 'badge-confirmed';
    if (b.status === 'Quoted') badgeClass = 'badge-quoted';
    if (b.status === 'Cancelled') badgeClass = 'badge-cancelled';

    return `
      <tr>
        <td><strong>${b.ref_number}</strong><br><small style="color:#64748b;">${new Date(b.created_at).toLocaleDateString()}</small></td>
        <td><strong>${b.customer_name}</strong><br><small>${b.mobile}</small></td>
        <td>${b.pickup_location} ➔<br><strong>${b.destination}</strong></td>
        <td>${b.pickup_date} <br><small style="color:#64748b;">${b.trip_type}</small></td>
        <td><strong>${b.vehicle_type}</strong> (${b.passengers} Pax)</td>
        <td><span class="status-badge ${badgeClass}">${b.status}</span></td>
        <td>${b.quoted_amount > 0 ? `<strong>₹${b.quoted_amount.toLocaleString('en-IN')}</strong>` : '<span style="color:#94a3b8;">Unquoted</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openAdminBookingModal(${b.id})">Review & Quote</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openAdminBookingModal = function(id) {
  const b = ALL_BOOKINGS.find(item => item.id === id);
  if (!b) return;
  ACTIVE_BOOKING_MODAL = b;

  const modal = document.getElementById('admin-booking-modal');
  document.getElementById('adm-modal-ref').textContent = b.ref_number;
  document.getElementById('adm-modal-cust').textContent = `${b.customer_name} (${b.mobile})`;
  document.getElementById('adm-modal-route').textContent = `${b.pickup_location} to ${b.destination} (${b.trip_type})`;
  document.getElementById('adm-modal-date').textContent = `${b.pickup_date} at ${b.pickup_time || '08:00 AM'}`;
  document.getElementById('adm-modal-veh').textContent = `${b.vehicle_type} (${b.passengers} Passengers, ${b.ac_preference || 'AC'})`;
  document.getElementById('adm-modal-instructions').textContent = b.instructions || 'None provided';

  document.getElementById('adm-modal-status').value = b.status;
  document.getElementById('adm-modal-quote').value = b.quoted_amount || '';
  document.getElementById('adm-modal-notes').value = b.admin_notes || '';

  modal.classList.add('active');
};

window.saveAdminBookingChanges = async function() {
  if (!ACTIVE_BOOKING_MODAL) return;
  const id = ACTIVE_BOOKING_MODAL.id;

  const payload = {
    status: document.getElementById('adm-modal-status').value,
    quoted_amount: parseFloat(document.getElementById('adm-modal-quote').value) || 0,
    admin_notes: document.getElementById('adm-modal-notes').value.trim()
  };

  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('Booking enquiry updated successfully.');
      document.getElementById('admin-booking-modal').classList.remove('active');
      loadDashboardData();
    } else {
      alert('Update failed: ' + data.error);
    }
  } catch (err) {
    alert('Connection error.');
  }
};

window.sendWhatsAppQuoteToCustomer = function() {
  if (!ACTIVE_BOOKING_MODAL) return;
  const b = ACTIVE_BOOKING_MODAL;
  const quoteVal = document.getElementById('adm-modal-quote').value;
  const phone = (b.whatsapp_number || b.mobile).replace(/[^0-9]/g, '');

  const text = 
`Van Greetings from *Tamil Nadu Van Travels*!
Dear ${b.customer_name},

Regarding your Enquiry *${b.ref_number}*:
• *Route:* ${b.pickup_location} to ${b.destination}
• *Travel Date:* ${b.pickup_date}
• *Vehicle:* ${b.vehicle_type}
• *Total Passengers:* ${b.passengers} Pax
${quoteVal ? `• *Quoted Fare:* ₹${parseFloat(quoteVal).toLocaleString('en-IN')} (Fuel, Chauffeur Allowance Included)` : ''}

Please confirm this trip so we can allocate your dedicated tourist van.
For questions, feel free to reply back!`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
};

async function loadVehiclesForAdmin() {
  try {
    const res = await fetch('/api/vehicles');
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('admin-vehicles-list');
      if (!container) return;

      container.innerHTML = data.vehicles.map(v => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h4 style="margin:0; font-size:1.15rem; color:#0b1f3a;">${v.name} (${v.capacity})</h4>
            <span style="font-size:0.8rem; background:${v.is_available ? '#dcfce7' : '#fee2e2'}; color:${v.is_available ? '#15803d' : '#b91c1c'}; padding:4px 10px; border-radius:20px; font-weight:700;">
              ${v.is_available ? 'Active in Fleet' : 'Inactive'}
            </span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:14px; margin-bottom:14px;">
            <div>
              <label style="font-size:0.75rem; color:#64748b; font-weight:700;">Rate Per Km (₹)</label>
              <input type="number" id="veh-rate-${v.id}" class="form-input" value="${v.price_per_km}">
            </div>
            <div>
              <label style="font-size:0.75rem; color:#64748b; font-weight:700;">Driver Bata / Day (₹)</label>
              <input type="number" id="veh-bata-${v.id}" class="form-input" value="${v.driver_bata}">
            </div>
            <div>
              <label style="font-size:0.75rem; color:#64748b; font-weight:700;">Min. Km Per Day</label>
              <input type="number" id="veh-min-${v.id}" class="form-input" value="${v.min_km_per_day}">
            </div>
            <div>
              <label style="font-size:0.75rem; color:#64748b; font-weight:700;">Night Halt (₹)</label>
              <input type="number" id="veh-night-${v.id}" class="form-input" value="${v.night_halt}">
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label style="font-size:0.85rem; display:flex; align-items:center; gap:6px;">
              <input type="checkbox" id="veh-avail-${v.id}" ${v.is_available ? 'checked' : ''}> Active for Bookings
            </label>
            <button class="btn btn-primary btn-sm" onclick="saveVehicleSettings(${v.id})">Save Pricing</button>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load vehicles for admin:', err);
  }
}

window.saveVehicleSettings = async function(id) {
  const payload = {
    price_per_km: document.getElementById(`veh-rate-${id}`).value,
    driver_bata: document.getElementById(`veh-bata-${id}`).value,
    min_km_per_day: document.getElementById(`veh-min-${id}`).value,
    night_halt: document.getElementById(`veh-night-${id}`).value,
    is_available: document.getElementById(`veh-avail-${id}`).checked
  };

  try {
    const res = await fetch(`/api/admin/vehicles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('Vehicle pricing updated successfully.');
    } else {
      alert('Update failed: ' + data.error);
    }
  } catch (err) {
    alert('Connection error.');
  }
};

async function loadSettingsForAdmin() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      if (document.getElementById('set-company-name')) document.getElementById('set-company-name').value = s.company_name || '';
      if (document.getElementById('set-tagline')) document.getElementById('set-tagline').value = s.tagline || '';
      if (document.getElementById('set-phone')) document.getElementById('set-phone').value = s.phone || '';
      if (document.getElementById('set-whatsapp')) document.getElementById('set-whatsapp').value = s.whatsapp_number || '';
      if (document.getElementById('set-email')) document.getElementById('set-email').value = s.email || '';
      if (document.getElementById('set-address')) document.getElementById('set-address').value = s.office_address || '';
      if (document.getElementById('set-hours')) document.getElementById('set-hours').value = s.operating_hours || '';
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function handleUnauthorized() {
  ADMIN_TOKEN = null;
  sessionStorage.removeItem('tn_admin_token');
  showLoginScreen();
}
