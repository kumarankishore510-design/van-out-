/**
 * Comprehensive Automated Verification Suite for Tamil Nadu Van Travels
 */

const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Settings
    const resSet = await request({ host: 'localhost', port: 3000, path: '/api/settings', method: 'GET' });
    assert(resSet.status === 200 && resSet.data.success, 'GET /api/settings returns 200');
    assert(resSet.data.settings.company_name === 'Tamil Nadu Van Travels', 'Company name matches "Tamil Nadu Van Travels"');
    assert(resSet.data.settings.admin_pin === undefined, 'Admin PIN is not exposed in public settings');

    // 2. Vehicles
    const resVeh = await request({ host: 'localhost', port: 3000, path: '/api/vehicles', method: 'GET' });
    assert(resVeh.status === 200 && resVeh.data.vehicles.length === 4, 'GET /api/vehicles returns exactly 4 vehicle categories');
    const vehicleNames = resVeh.data.vehicles.map(v => v.name).join(', ');
    console.log(`   Fleet: ${vehicleNames}`);
    assert(resVeh.data.vehicles.some(v => v.capacity.includes('18')), '18-seater vehicle is present');
    assert(resVeh.data.vehicles.some(v => v.capacity.includes('19')), '19-seater vehicle is present');
    assert(resVeh.data.vehicles.some(v => v.capacity.includes('21')), '21-seater vehicle is present');
    assert(resVeh.data.vehicles.some(v => v.capacity.includes('22')), '22-seater vehicle is present');

    // 3. Destinations
    const resDest = await request({ host: 'localhost', port: 3000, path: '/api/destinations', method: 'GET' });
    assert(resDest.status === 200 && resDest.data.destinations.length === 18, 'GET /api/destinations returns 18 destinations');

    // 4. Tour Packages
    const resPkg = await request({ host: 'localhost', port: 3000, path: '/api/packages', method: 'GET' });
    assert(resPkg.status === 200 && resPkg.data.packages.length === 8, 'GET /api/packages returns 8 tour packages');

    // 5. Booking Creation
    const testBooking = {
      customer_name: 'Murugan Swaminathan',
      mobile: '9840123456',
      whatsapp_number: '9840123456',
      pickup_location: 'Chennai (Central)',
      destination: 'Ooty (Udhagamandalam)',
      pickup_date: '2026-11-15',
      return_date: '2026-11-18',
      pickup_time: '06:00 AM',
      trip_type: 'Round-Trip',
      passengers: 18,
      vehicle_type: '18-Seater Luxury Tourist Van',
      ac_preference: 'AC',
      instructions: 'Family holiday with elderly parents, please arrange pushback seats.'
    };

    const resBook = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, testBooking);

    assert(resBook.status === 201 && resBook.data.success, 'POST /api/bookings creates booking successfully (201)');
    const createdRef = resBook.data.ref_number;
    console.log(`   Created Ref: ${createdRef}`);
    assert(createdRef && createdRef.startsWith('TNV-2026-'), 'Generated reference follows TNV-2026-XXXX format');
    assert(resBook.data.whatsapp_url && resBook.data.whatsapp_url.includes('wa.me'), 'Generated WhatsApp click-to-chat URL is valid');

    // 6. Track Booking Status
    const resTrack = await request({ host: 'localhost', port: 3000, path: `/api/bookings/track/${createdRef}`, method: 'GET' });
    assert(resTrack.status === 200 && resTrack.data.success, `GET /api/bookings/track/${createdRef} retrieves booking status`);
    assert(resTrack.data.booking.customer_name === 'Murugan Swaminathan', 'Tracked customer name matches');
    assert(resTrack.data.booking.status === 'Pending', 'Initial booking status is Pending');

    // 7. Fare Estimate
    const resFare = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/fare/estimate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      pickup: 'Chennai',
      destination: 'Ooty',
      trip_type: 'Round-Trip',
      days: 3,
      vehicle_slug: '18-seater-tourist-van'
    });

    assert(resFare.status === 200 && resFare.data.success, 'POST /api/fare/estimate returns 200');
    assert(resFare.data.estimate.estimated_total > 20000, `Estimated fare is calculated: ₹${resFare.data.estimate.estimated_total}`);

    // 8. Admin Authentication
    const resAuthFail = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { pin: 'wrongpin' });
    assert(resAuthFail.status === 401, 'POST /api/admin/login rejects wrong PIN (401)');

    const resAuthSuccess = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { pin: 'admin123' });
    assert(resAuthSuccess.status === 200 && resAuthSuccess.data.token, 'POST /api/admin/login succeeds with correct PIN (200)');
    const adminToken = resAuthSuccess.data.token;

    // 9. Admin Stats & Bookings
    const resAdminStats = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(resAdminStats.status === 200 && resAdminStats.data.stats.total_enquiries >= 1, 'GET /api/admin/stats returns enquiry metrics');

    const resAdminBookings = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/admin/bookings',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(resAdminBookings.status === 200 && resAdminBookings.data.bookings.length >= 1, 'GET /api/admin/bookings lists created enquiries');
    const bookingId = resAdminBookings.data.bookings[0].id;

    // 10. Admin Update Booking (Quotation)
    const resUpdateBooking = await request({
      host: 'localhost',
      port: 3000,
      path: `/api/admin/bookings/${bookingId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      status: 'Quoted',
      quoted_amount: 26500,
      admin_notes: '18-seater Deluxe van reserved, driver Ramesh assigned.'
    });
    assert(resUpdateBooking.status === 200 && resUpdateBooking.data.booking.status === 'Quoted', 'PATCH /api/admin/bookings/:id updates status to Quoted');
    assert(resUpdateBooking.data.booking.quoted_amount === 26500, 'Quoted amount updated to ₹26,500');

    // 11. Static Pages
    const resIndex = await request({ host: 'localhost', port: 3000, path: '/', method: 'GET' });
    assert(resIndex.status === 200 && resIndex.raw.includes('Tamil Nadu Van Travels'), 'GET / serves customer homepage');

    const resAdminPage = await request({ host: 'localhost', port: 3000, path: '/admin', method: 'GET' });
    assert(resAdminPage.status === 200 && resAdminPage.raw.includes('Admin Portal'), 'GET /admin serves administrator interface');

    const resRoutePage = await request({ host: 'localhost', port: 3000, path: '/routes/chennai-to-ooty', method: 'GET' });
    assert(resRoutePage.status === 200 && resRoutePage.raw.includes('Tourist Van Rental'), 'GET /routes/:slug serves SEO landing page');

    console.log(`\n========================================`);
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);

  } catch (err) {
    console.error('Fatal test error:', err);
  }
}

runTests();
