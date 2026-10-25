/**
 * Tamil Nadu Van Travels - Main Client Application Logic
 */

let APP_STATE = {
  settings: {},
  vehicles: [],
  destinations: [],
  packages: [],
  activeRegion: 'All'
};

document.addEventListener('DOMContentLoaded', async () => {
  setupStickyHeader();
  setupMobileMenu();
  await loadInitialData();
  setupAutocomplete();
  setupQuickBookingBar();
  setupBookingModal();
  setupTrackingModal();
  setupFloatingWhatsApp();
});

// --- 1. STICKY HEADER & MOBILE NAV ---
function setupStickyHeader() {
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = navLinks.style.display === 'flex';
      navLinks.style.display = isVisible ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '74px';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = '#ffffff';
      navLinks.style.padding = '20px';
      navLinks.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
    });
  }
}

// --- 2. LOAD INITIAL DATA FROM API ---
async function loadInitialData() {
  try {
    // 1. Settings
    const resSet = await fetch('/api/settings');
    const dataSet = await resSet.json();
    if (dataSet.success) {
      APP_STATE.settings = dataSet.settings;
      window.TN_COMPANY_SETTINGS = dataSet.settings;
      applyCompanySettings(dataSet.settings);
    }

    // 2. Vehicles
    const resVeh = await fetch('/api/vehicles');
    const dataVeh = await resVeh.json();
    if (dataVeh.success) {
      APP_STATE.vehicles = dataVeh.vehicles;
      renderVehicles(dataVeh.vehicles);
      populateVehicleSelectOptions(dataVeh.vehicles);
    }

    // 3. Destinations
    const resDest = await fetch('/api/destinations');
    const dataDest = await resDest.json();
    if (dataDest.success) {
      APP_STATE.destinations = dataDest.destinations;
      renderDestinations(dataDest.destinations);
      setupDestinationFilter();
    }

    // 4. Packages
    const resPkg = await fetch('/api/packages');
    const dataPkg = await resPkg.json();
    if (dataPkg.success) {
      APP_STATE.packages = dataPkg.packages;
      renderPackages(dataPkg.packages);
    }
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

function applyCompanySettings(s) {
  // Update texts across page
  document.querySelectorAll('.dyn-company-name').forEach(el => el.textContent = s.company_name || 'Tamil Nadu Van Travels');
  document.querySelectorAll('.dyn-company-phone').forEach(el => {
    el.textContent = s.phone || '+91 94440 12345';
    el.href = `tel:${(s.phone || '').replace(/[^0-9+]/g, '')}`;
  });
  document.querySelectorAll('.dyn-company-email').forEach(el => {
    el.textContent = s.email || 'booking@tamilnaduvanstravels.com';
    el.href = `mailto:${s.email || ''}`;
  });
  document.querySelectorAll('.dyn-company-address').forEach(el => el.textContent = s.office_address || '');
  document.querySelectorAll('.dyn-company-hours').forEach(el => el.textContent = s.operating_hours || '24/7 Booking Support');
  document.querySelectorAll('.dyn-company-tagline').forEach(el => el.textContent = s.tagline || '');
}

// --- 3. AUTOCOMPLETE ENGINE (38 DISTRICTS + KEY TOURIST SPOTS) ---
function setupAutocomplete() {
  const inputs = document.querySelectorAll('.tn-location-input');

  inputs.forEach(input => {
    const parent = input.parentElement;
    let dropdown = parent.querySelector('.autocomplete-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'autocomplete-dropdown';
      parent.appendChild(dropdown);
    }

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
        return;
      }

      // Filter from popular locations & all 38 districts
      const matches = [];

      // Check popular locations
      if (typeof POPULAR_TAMIL_NADU_LOCATIONS !== 'undefined') {
        POPULAR_TAMIL_NADU_LOCATIONS.forEach(loc => {
          if (loc.name.toLowerCase().includes(query) || loc.district.toLowerCase().includes(query)) {
            matches.push({ name: loc.name, subtitle: `${loc.district} District • ${loc.type}` });
          }
        });
      }

      // Check remaining districts
      if (typeof TAMIL_NADU_DISTRICTS !== 'undefined') {
        TAMIL_NADU_DISTRICTS.forEach(d => {
          if (d.toLowerCase().includes(query) && !matches.some(m => m.name.includes(d))) {
            matches.push({ name: `${d} (District HQ / Town)`, subtitle: 'Tamil Nadu District' });
          }
        });
      }

      const topMatches = matches.slice(0, 8);
      if (topMatches.length === 0) {
        dropdown.innerHTML = `<div class="autocomplete-item" style="cursor:default; color:#94a3b8;">No direct match. You can still type custom town/village.</div>`;
      } else {
        dropdown.innerHTML = topMatches.map(m => `
          <div class="autocomplete-item" data-value="${m.name}">
            <span>${m.name}</span>
            <span class="autocomplete-item-tag">${m.subtitle}</span>
          </div>
        `).join('');

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const val = item.getAttribute('data-value');
            if (val) {
              input.value = val.split(' (')[0];
              dropdown.classList.remove('active');
              input.dispatchEvent(new Event('change'));
            }
          });
        });
      }

      dropdown.classList.add('active');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!parent.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  });
}

// --- 4. RENDER VEHICLES (18, 19, 21, 22-SEATER) ---
function renderVehicles(vehicles) {
  const container = document.getElementById('vehicles-grid');
  if (!container) return;

  container.innerHTML = vehicles.map(v => `
    <div class="vehicle-card">
      <div class="vehicle-image-wrap">
        <img src="${v.image_url}" alt="${v.name}" class="vehicle-image" loading="lazy">
        <span class="vehicle-badge-category">${v.capacity}</span>
        <span class="vehicle-badge-status">${v.is_available ? '✓ Available for Booking' : 'Limited Slot'}</span>
      </div>
      <div class="vehicle-card-body">
        <h3 class="vehicle-name">${v.name}</h3>
        <p style="font-size:0.85rem; color:#64748b; margin-bottom:12px;">${v.description}</p>
        
        <div class="vehicle-specs-list">
          <div class="spec-item">💺 <span><strong>${v.capacity}</strong></span></div>
          <div class="spec-item">❄️ <span><strong>AC Included</strong></span></div>
          <div class="spec-item">🧳 <span><strong>${v.luggage_capacity.split('+')[0]}</strong></span></div>
          <div class="spec-item">🛡️ <span><strong>Verified Driver</strong></span></div>
        </div>

        <div class="vehicle-amenities-tags">
          ${(v.amenities || []).slice(0, 4).map(a => `<span class="amenity-chip">✓ ${a}</span>`).join('')}
        </div>

        <div class="vehicle-card-footer">
          <div class="vehicle-price-box">
            <span class="vehicle-price-label">Starting Rate</span>
            <div>
              <span class="vehicle-price-val">₹${v.price_per_km}</span>
              <span class="vehicle-price-unit">/ km</span>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="openVehicleDetailsModal('${v.slug}')">Details</button>
            <button class="btn btn-primary btn-sm" onclick="openBookingModalWithVehicle('${v.name}')">Book Now</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function populateVehicleSelectOptions(vehicles) {
  const selects = document.querySelectorAll('.vehicle-select-dropdown');
  selects.forEach(select => {
    select.innerHTML = vehicles.map(v => 
      `<option value="${v.name}">${v.name} (${v.capacity} - ₹${v.price_per_km}/km)</option>`
    ).join('');
  });
}

window.openVehicleDetailsModal = function(slug) {
  const vehicle = APP_STATE.vehicles.find(v => v.slug === slug);
  if (!vehicle) return;

  const modal = document.getElementById('vehicle-details-modal');
  const title = document.getElementById('veh-modal-title');
  const body = document.getElementById('veh-modal-content');

  title.textContent = vehicle.name;
  body.innerHTML = `
    <div style="margin-bottom:20px; border-radius:12px; overflow:hidden; max-height:280px;">
      <img src="${vehicle.image_url}" alt="${vehicle.name}" style="width:100%; height:100%; object-fit:cover;">
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; background:#f8fafc; padding:16px; border-radius:12px;">
      <div><span style="font-size:0.8rem; color:#64748b;">Seating Capacity:</span><br><strong>${vehicle.capacity_details}</strong></div>
      <div><span style="font-size:0.8rem; color:#64748b;">Air Conditioning:</span><br><strong>${vehicle.ac_type}</strong></div>
      <div><span style="font-size:0.8rem; color:#64748b;">Luggage Space:</span><br><strong>${vehicle.luggage_capacity}</strong></div>
      <div><span style="font-size:0.8rem; color:#64748b;">Seating Style:</span><br><strong>${vehicle.seating_layout}</strong></div>
    </div>

    <h4 style="margin-bottom:10px; font-size:1rem; color:#0b1f3a;">Vehicle Amenities & Features</h4>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:24px;">
      ${(vehicle.amenities || []).map(a => `<div style="font-size:0.85rem; color:#334155;">✓ ${a}</div>`).join('')}
    </div>

    <div style="background:#f0fdfa; border:1px solid rgba(13,148,136,0.3); border-radius:10px; padding:16px; margin-bottom:24px;">
      <h4 style="color:#0f766e; font-size:0.95rem; margin-bottom:6px;">Transparent Pricing Rule:</h4>
      <p style="font-size:0.85rem; color:#134e4a; margin-bottom:4px;">• Base Rate: <strong>₹${vehicle.price_per_km}/km</strong> (Min. ${vehicle.min_km_per_day} km/day outstation)</p>
      <p style="font-size:0.85rem; color:#134e4a; margin-bottom:4px;">• Driver Bata: <strong>₹${vehicle.driver_bata}/day</strong></p>
      <p style="font-size:0.85rem; color:#134e4a;">• Toll, parking, and permit charges are payable at actuals.</p>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:12px;">
      <button class="btn btn-outline" onclick="closeModal('vehicle-details-modal')">Close</button>
      <button class="btn btn-primary" onclick="closeModal('vehicle-details-modal'); openBookingModalWithVehicle('${vehicle.name}')">Book This Van</button>
    </div>
  `;

  modal.classList.add('active');
};

// --- 5. RENDER DESTINATIONS WITH REGIONAL FILTER ---
function renderDestinations(destinations) {
  const container = document.getElementById('destinations-grid');
  if (!container) return;

  const filtered = APP_STATE.activeRegion === 'All' 
    ? destinations 
    : destinations.filter(d => d.region.toLowerCase().includes(APP_STATE.activeRegion.toLowerCase()));

  container.innerHTML = filtered.map(d => `
    <div class="destination-card" onclick="openDestinationTour('${d.name}')">
      <img src="${d.image_url}" alt="${d.name}" class="destination-img" loading="lazy">
      <div class="destination-overlay">
        <span class="destination-region-badge">${d.region}</span>
        <h3 class="destination-name">${d.name}</h3>
        <p class="destination-desc">${d.description}</p>
        <button class="btn btn-outline-white btn-sm" style="width:fit-content;">Explore Tours ➔</button>
      </div>
    </div>
  `).join('');
}

function setupDestinationFilter() {
  const buttons = document.querySelectorAll('.region-tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      APP_STATE.activeRegion = btn.getAttribute('data-region') || 'All';
      renderDestinations(APP_STATE.destinations);
    });
  });
}

window.openDestinationTour = function(destName) {
  // Pre-fill destination and open booking enquiry
  const destInput = document.getElementById('book-dest');
  if (destInput) destInput.value = destName;
  openBookingModal();
};

// --- 6. RENDER TOUR PACKAGES ---
function renderPackages(packages) {
  const container = document.getElementById('packages-grid');
  if (!container) return;

  container.innerHTML = packages.map(p => `
    <div class="package-card">
      <div class="package-header">
        <img src="${p.image_url}" alt="${p.title}" class="package-img" loading="lazy">
        <span class="package-duration-badge">⏱️ ${p.duration}</span>
      </div>
      <div class="package-body">
        <h3 class="package-title">${p.title}</h3>
        <p style="font-size:0.82rem; color:#64748b; margin-bottom:12px;">Suitable for: <strong>${p.group_size}</strong></p>
        
        <ul class="package-highlights">
          ${(p.highlights || []).slice(0, 4).map(h => `<li>${h}</li>`).join('')}
        </ul>

        <div style="margin-top:auto; padding-top:14px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:0.72rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">From Approx.</span>
            <div style="font-size:1.15rem; font-weight:800; color:#0d9488;">₹${p.starting_price.toLocaleString('en-IN')}*</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openPackageDetails('${p.slug}')">View Plan & Book</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.openPackageDetails = function(slug) {
  const pkg = APP_STATE.packages.find(p => p.slug === slug);
  if (!pkg) return;

  const modal = document.getElementById('package-details-modal');
  const title = document.getElementById('pkg-modal-title');
  const content = document.getElementById('pkg-modal-content');

  title.textContent = pkg.title;
  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; background:#f8fafc; padding:12px 18px; border-radius:10px;">
      <div><strong>Duration:</strong> ${pkg.duration}</div>
      <div><strong>Group Size:</strong> ${pkg.group_size}</div>
      <div><strong>Starting Fare:</strong> ₹${pkg.starting_price.toLocaleString('en-IN')}*</div>
    </div>

    <h4 style="margin-bottom:12px; color:#0b1f3a;">Suggested Itinerary</h4>
    <div style="margin-bottom:24px; display:flex; flex-direction:column; gap:10px;">
      ${(pkg.suggested_itinerary || []).map((step, idx) => `
        <div style="display:flex; gap:12px; font-size:0.9rem; line-height:1.5;">
          <span style="background:#0b1f3a; color:#fff; width:26px; height:26px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; flex-shrink:0;">${idx + 1}</span>
          <div>${step}</div>
        </div>
      `).join('')}
    </div>

    <h4 style="margin-bottom:8px; color:#0b1f3a; font-size:0.95rem;">Available Vehicle Types</h4>
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
      ${(pkg.available_vehicles || []).map(v => `<span class="amenity-chip" style="font-size:0.85rem;">🚐 ${v}</span>`).join('')}
    </div>

    <p style="font-size:0.78rem; color:#94a3b8; margin-bottom:24px;">*Note: Example itineraries and prices are illustrative until confirmed by company representative based on exact travel date and pickup location.</p>

    <div style="display:flex; justify-content:flex-end; gap:12px;">
      <button class="btn btn-outline" onclick="closeModal('package-details-modal')">Close</button>
      <button class="btn btn-primary" onclick="closeModal('package-details-modal'); openBookingModalForPackage('${pkg.title}')">Enquire This Tour</button>
    </div>
  `;

  modal.classList.add('active');
};

// --- 7. QUICK BOOKING BAR SETUP ---
function setupQuickBookingBar() {
  const btn = document.getElementById('btn-hero-quote');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const pickup = document.getElementById('hero-pickup')?.value;
    const dest = document.getElementById('hero-dest')?.value;
    const date = document.getElementById('hero-date')?.value;
    const type = document.getElementById('hero-trip-type')?.value;
    const pax = document.getElementById('hero-pax')?.value;
    const veh = document.getElementById('hero-vehicle')?.value;

    if (pickup) document.getElementById('book-pickup').value = pickup;
    if (dest) document.getElementById('book-dest').value = dest;
    if (date) document.getElementById('book-date').value = date;
    if (type) document.getElementById('book-trip-type').value = type;
    if (pax) document.getElementById('book-passengers').value = pax;
    if (veh) document.getElementById('book-vehicle').value = veh;

    openBookingModal();
  });
}

// --- 8. BOOKING MODAL & SUBMISSION SYSTEM ---
function setupBookingModal() {
  const form = document.getElementById('booking-form');
  const returnDateGroup = document.getElementById('return-date-group');
  const tripTypeSelect = document.getElementById('book-trip-type');

  if (tripTypeSelect && returnDateGroup) {
    tripTypeSelect.addEventListener('change', () => {
      const isRoundOrMulti = tripTypeSelect.value === 'Round-Trip' || tripTypeSelect.value === 'Multi-Day Outstation';
      returnDateGroup.style.display = isRoundOrMulti ? 'flex' : 'none';
    });
  }

  // Same as Mobile checkbox logic
  const sameWaCheckbox = document.getElementById('book-same-wa');
  const mobileInput = document.getElementById('book-mobile');
  const waInput = document.getElementById('book-wa');

  if (sameWaCheckbox && mobileInput && waInput) {
    sameWaCheckbox.addEventListener('change', () => {
      if (sameWaCheckbox.checked) {
        waInput.value = mobileInput.value;
        waInput.disabled = true;
      } else {
        waInput.disabled = false;
      }
    });
    mobileInput.addEventListener('input', () => {
      if (sameWaCheckbox.checked) waInput.value = mobileInput.value;
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Submitting Enquiry...';
      submitBtn.disabled = true;

      const payload = {
        customer_name: document.getElementById('book-name').value.trim(),
        mobile: document.getElementById('book-mobile').value.trim(),
        whatsapp_number: document.getElementById('book-wa').value.trim() || document.getElementById('book-mobile').value.trim(),
        pickup_location: document.getElementById('book-pickup').value.trim(),
        destination: document.getElementById('book-dest').value.trim(),
        pickup_date: document.getElementById('book-date').value,
        return_date: document.getElementById('book-return-date')?.value || null,
        pickup_time: document.getElementById('book-time')?.value || '08:00 AM',
        trip_type: document.getElementById('book-trip-type').value,
        passengers: parseInt(document.getElementById('book-passengers').value, 10) || 12,
        vehicle_type: document.getElementById('book-vehicle').value,
        ac_preference: document.getElementById('book-ac')?.value || 'AC',
        instructions: document.getElementById('book-instructions')?.value.trim() || ''
      };

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          form.reset();
          closeModal('booking-modal');
          showConfirmationModal(data);
        } else {
          alert('Error: ' + (data.error || 'Failed to submit enquiry.'));
        }
      } catch (err) {
        console.error('Submission error:', err);
        alert('Connection error. Please try again or WhatsApp us directly.');
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
}

function showConfirmationModal(data) {
  const modal = document.getElementById('confirmation-modal');
  const refEl = document.getElementById('conf-ref-number');
  const detailsEl = document.getElementById('conf-details');
  const waBtn = document.getElementById('conf-wa-btn');

  if (refEl) refEl.textContent = data.ref_number;
  if (detailsEl && data.enquiry) {
    const e = data.enquiry;
    detailsEl.innerHTML = `
      <p><strong>Customer:</strong> ${e.customer_name} (${e.mobile})</p>
      <p><strong>Trip:</strong> ${e.pickup_location} ➔ ${e.destination}</p>
      <p><strong>Date:</strong> ${e.pickup_date}</p>
      <p><strong>Vehicle:</strong> ${e.vehicle_type}</p>
      <p style="color:#d97706; font-size:0.85rem; margin-top:8px;">⚠️ Note: Bookings are confirmed only after quotation review by our authorized team.</p>
    `;
  }

  if (waBtn && data.whatsapp_url) {
    waBtn.href = data.whatsapp_url;
    waBtn.target = '_blank';
  }

  modal.classList.add('active');
}

// --- 9. TRACKING MODAL ---
function setupTrackingModal() {
  const form = document.getElementById('tracking-form');
  const resultDiv = document.getElementById('tracking-result');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const refInput = document.getElementById('track-ref-input').value.trim();
      if (!refInput) return;

      resultDiv.innerHTML = '<div style="color:#64748b;">Searching booking records...</div>';

      try {
        const res = await fetch(`/api/bookings/track/${encodeURIComponent(refInput)}`);
        const data = await res.json();

        if (data.success && data.booking) {
          const b = data.booking;
          let badgeColor = '#f59e0b';
          if (b.status === 'Confirmed') badgeColor = '#10b981';
          if (b.status === 'Quoted') badgeColor = '#0d9488';
          if (b.status === 'Cancelled') badgeColor = '#ef4444';

          resultDiv.innerHTML = `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin-top:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <strong>${b.ref_number}</strong>
                <span style="background:${badgeColor}; color:#fff; font-size:0.8rem; font-weight:700; padding:4px 10px; border-radius:20px;">
                  ${b.status}
                </span>
              </div>
              <p style="font-size:0.88rem; margin-bottom:6px;"><strong>Customer:</strong> ${b.customer_name}</p>
              <p style="font-size:0.88rem; margin-bottom:6px;"><strong>Route:</strong> ${b.pickup_location} ➔ ${b.destination}</p>
              <p style="font-size:0.88rem; margin-bottom:6px;"><strong>Travel Date:</strong> ${b.pickup_date}</p>
              <p style="font-size:0.88rem; margin-bottom:6px;"><strong>Vehicle:</strong> ${b.vehicle_type}</p>
              ${b.quoted_amount > 0 ? `<p style="font-size:0.95rem; font-weight:bold; color:#0d9488; margin-top:10px;">Quoted Amount: ₹${b.quoted_amount.toLocaleString('en-IN')}</p>` : ''}
            </div>
          `;
        } else {
          resultDiv.innerHTML = `<div style="color:#ef4444; margin-top:12px;">No record found for "${refInput}". Please verify your reference number.</div>`;
        }
      } catch (err) {
        resultDiv.innerHTML = `<div style="color:#ef4444; margin-top:12px;">Error checking status. Please try again.</div>`;
      }
    });
  }
}

// --- 10. FLOATING WHATSAPP BUTTON ---
function setupFloatingWhatsApp() {
  const btn = document.getElementById('floating-wa-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const phone = window.TN_COMPANY_SETTINGS?.whatsapp_number || '919444012345';
    const text = `Hello Tamil Nadu Van Travels! I would like to enquire about tourist van booking for my family/group trip across Tamil Nadu.`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  });
}

// Global Modal Helpers
window.openBookingModal = function() {
  document.getElementById('booking-modal').classList.add('active');
};

window.openBookingModalWithVehicle = function(vehicleName) {
  const vehSelect = document.getElementById('book-vehicle');
  if (vehSelect) vehSelect.value = vehicleName;
  openBookingModal();
};

window.openBookingModalForPackage = function(pkgTitle) {
  const instructions = document.getElementById('book-instructions');
  if (instructions) instructions.value = `Enquiring for package: ${pkgTitle}`;
  openBookingModal();
};

window.openTrackingModal = function() {
  document.getElementById('tracking-modal').classList.add('active');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.remove('active');
};
