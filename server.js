/**
 * Tamil Nadu Van Travels - Professional Booking Platform & API Server
 * Built with Node.js & SQLite (with universal serverless fallback)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE = isVercel ? path.join('/tmp', 'database.sqlite') : path.join(__dirname, 'database.sqlite');
const SEED_FILE = path.join(__dirname, 'data', 'seed.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- DISTANCE ESTIMATOR (Tamil Nadu Distance Matrix) ---
const POPULAR_TAMIL_NADU_LOCATIONS = [
  { name: "Chennai", district: "Chennai", distFromChennai: 0 },
  { name: "Coimbatore", district: "Coimbatore", distFromChennai: 505 },
  { name: "Madurai", district: "Madurai", distFromChennai: 462 },
  { name: "Tiruchirappalli", district: "Tiruchirappalli", distFromChennai: 330 },
  { name: "Salem", district: "Salem", distFromChennai: 345 },
  { name: "Tirunelveli", district: "Tirunelveli", distFromChennai: 625 },
  { name: "Tiruppur", district: "Tiruppur", distFromChennai: 465 },
  { name: "Erode", district: "Erode", distFromChennai: 400 },
  { name: "Vellore", district: "Vellore", distFromChennai: 140 },
  { name: "Kanchipuram", district: "Kanchipuram", distFromChennai: 75 },
  { name: "Ooty", district: "Nilgiris (Ooty)", distFromChennai: 540 },
  { name: "Coonoor", district: "Nilgiris (Ooty)", distFromChennai: 520 },
  { name: "Kodaikanal", district: "Dindigul", distFromChennai: 525 },
  { name: "Yercaud", district: "Salem", distFromChennai: 375 },
  { name: "Mahabalipuram", district: "Chengalpattu", distFromChennai: 55 },
  { name: "Kanyakumari", district: "Kanyakumari", distFromChennai: 705 },
  { name: "Rameswaram", district: "Ramanathapuram", distFromChennai: 560 },
  { name: "Thanjavur", district: "Thanjavur", distFromChennai: 345 },
  { name: "Kumbakonam", district: "Thanjavur", distFromChennai: 295 },
  { name: "Chidambaram", district: "Cuddalore", distFromChennai: 235 },
  { name: "Tiruvannamalai", district: "Tiruvannamalai", distFromChennai: 195 }
];

const DIRECT_ROUTES = {
  "chennai_to_nilgiris (ooty)": 540,
  "chennai_to_dindigul": 430,
  "chennai_to_coimbatore": 505,
  "chennai_to_madurai": 462,
  "chennai_to_ramanathapuram": 560,
  "chennai_to_chengalpattu": 55,
  "chennai_to_kanchipuram": 75,
  "chennai_to_thanjavur": 345,
  "chennai_to_tiruchirappalli": 330,
  "chennai_to_kanyakumari": 705,
  "chennai_to_tiruvannamalai": 195,
  "chennai_to_salem": 345,
  "chennai_to_vellore": 140,
  "coimbatore_to_nilgiris (ooty)": 86,
  "coimbatore_to_dindigul": 155,
  "coimbatore_to_madurai": 215,
  "madurai_to_ramanathapuram": 170,
  "madurai_to_kanyakumari": 245,
  "madurai_to_tirunelveli": 160,
  "tiruchirappalli_to_thanjavur": 58,
  "tiruchirappalli_to_madurai": 135,
  "salem_to_nilgiris (ooty)": 210,
  "salem_to_coimbatore": 165
};

function estimateTamilNaduDistanceKm(pickupText, dropText) {
  if (!pickupText || !dropText) return 150;
  const cleanPick = pickupText.toLowerCase().trim();
  const cleanDrop = dropText.toLowerCase().trim();
  if (cleanPick === cleanDrop) return 25;

  const findNode = (text) => {
    return POPULAR_TAMIL_NADU_LOCATIONS.find(loc => 
      text.includes(loc.name.toLowerCase()) || text.includes(loc.district.toLowerCase())
    );
  };

  const pNode = findNode(cleanPick);
  const dNode = findNode(cleanDrop);

  if (pNode && dNode) {
    if (pNode.name === dNode.name) return 30;
    const routeKey = `${pNode.district.toLowerCase()}_to_${dNode.district.toLowerCase()}`;
    const reverseKey = `${dNode.district.toLowerCase()}_to_${pNode.district.toLowerCase()}`;
    if (DIRECT_ROUTES[routeKey]) return DIRECT_ROUTES[routeKey];
    if (DIRECT_ROUTES[reverseKey]) return DIRECT_ROUTES[reverseKey];
    const delta = Math.abs(pNode.distFromChennai - dNode.distFromChennai);
    if (delta > 0) return Math.round(Math.max(45, delta * 1.12));
  }
  return 220;
}

// --- DATABASE INITIALIZATION (Native SQLite with Universal Fallback) ---
let db;
let useNativeSqlite = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_FILE);
  db.exec(`PRAGMA journal_mode = WAL;`);
  db.exec(`PRAGMA synchronous = NORMAL;`);
  useNativeSqlite = true;

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      capacity TEXT NOT NULL,
      capacity_details TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      ac_type TEXT NOT NULL,
      luggage_capacity TEXT NOT NULL,
      seating_layout TEXT NOT NULL,
      price_per_km REAL NOT NULL,
      min_km_per_day REAL NOT NULL,
      driver_bata REAL NOT NULL,
      night_halt REAL NOT NULL,
      is_available INTEGER DEFAULT 1,
      description TEXT NOT NULL,
      amenities_json TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      region TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL,
      best_time TEXT NOT NULL,
      top_attractions_json TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      duration TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      group_size TEXT NOT NULL,
      starting_price REAL NOT NULL,
      image_url TEXT NOT NULL,
      available_vehicles_json TEXT NOT NULL,
      highlights_json TEXT NOT NULL,
      suggested_itinerary_json TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      whatsapp_number TEXT,
      pickup_location TEXT NOT NULL,
      destination TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      return_date TEXT,
      pickup_time TEXT,
      trip_type TEXT NOT NULL,
      passengers INTEGER NOT NULL,
      vehicle_type TEXT NOT NULL,
      ac_preference TEXT DEFAULT 'AC',
      additional_req TEXT,
      instructions TEXT,
      status TEXT DEFAULT 'Pending',
      quoted_amount REAL DEFAULT 0,
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
} catch (e) {
  // In-Memory Fallback Adapter for Serverless/Node environments without node:sqlite
  const mem = {
    settings: {},
    vehicles: [],
    destinations: [],
    packages: [],
    enquiries: [],
    nextEnquiryId: 1
  };

  db = {
    exec: () => {},
    prepare: (sql) => {
      const s = sql.trim();
      return {
        run: (...params) => {
          if (s.includes('INSERT OR REPLACE INTO settings')) {
            mem.settings[params[0]] = String(params[1]);
          } else if (s.includes('INSERT INTO vehicles')) {
            mem.vehicles.push({
              id: mem.vehicles.length + 1,
              name: params[0], slug: params[1], capacity: params[2], capacity_details: params[3],
              category: params[4], image_url: params[5], ac_type: params[6], luggage_capacity: params[7],
              seating_layout: params[8], price_per_km: params[9], min_km_per_day: params[10],
              driver_bata: params[11], night_halt: params[12], is_available: params[13],
              description: params[14], amenities_json: params[15], sort_order: params[16]
            });
          } else if (s.includes('INSERT INTO destinations')) {
            mem.destinations.push({
              id: mem.destinations.length + 1,
              name: params[0], slug: params[1], region: params[2], image_url: params[3],
              description: params[4], best_time: params[5], top_attractions_json: params[6], sort_order: params[7]
            });
          } else if (s.includes('INSERT INTO packages')) {
            mem.packages.push({
              id: mem.packages.length + 1,
              title: params[0], slug: params[1], duration: params[2], duration_days: params[3],
              group_size: params[4], starting_price: params[5], image_url: params[6],
              available_vehicles_json: params[7], highlights_json: params[8],
              suggested_itinerary_json: params[9], sort_order: params[10]
            });
          } else if (s.includes('INSERT INTO enquiries')) {
            const newEnquiry = {
              id: mem.nextEnquiryId++,
              ref_number: params[0], customer_name: params[1], mobile: params[2], whatsapp_number: params[3],
              pickup_location: params[4], destination: params[5], pickup_date: params[6], return_date: params[7],
              pickup_time: params[8], trip_type: params[9], passengers: params[10], vehicle_type: params[11],
              ac_preference: params[12], additional_req: params[13], instructions: params[14],
              status: 'Pending', quoted_amount: 0, admin_notes: '',
              created_at: params[15], updated_at: params[16]
            };
            mem.enquiries.unshift(newEnquiry);
          } else if (s.includes('UPDATE enquiries')) {
            const id = params[4];
            const item = mem.enquiries.find(e => e.id === id);
            if (item) {
              item.status = params[0];
              item.quoted_amount = params[1];
              item.admin_notes = params[2];
              item.updated_at = params[3];
            }
          } else if (s.includes('UPDATE vehicles')) {
            const id = params[5];
            const v = mem.vehicles.find(item => item.id === id);
            if (v) {
              v.price_per_km = params[0];
              v.min_km_per_day = params[1];
              v.driver_bata = params[2];
              v.night_halt = params[3];
              v.is_available = params[4];
            }
          }
          return { changes: 1 };
        },
        get: (...params) => {
          if (s.includes('COUNT(*) as count FROM vehicles WHERE is_available = 1')) {
            return { count: mem.vehicles.filter(v => v.is_available).length };
          }
          if (s.includes('COUNT(*) as count FROM vehicles')) {
            return { count: mem.vehicles.length };
          }
          if (s.includes("COUNT(*) as count FROM enquiries WHERE status = 'Pending'")) {
            return { count: mem.enquiries.filter(e => e.status === 'Pending').length };
          }
          if (s.includes("COUNT(*) as count FROM enquiries WHERE status = 'Confirmed'")) {
            return { count: mem.enquiries.filter(e => e.status === 'Confirmed').length };
          }
          if (s.includes("COUNT(*) as count FROM enquiries WHERE status = 'Quoted'")) {
            return { count: mem.enquiries.filter(e => e.status === 'Quoted').length };
          }
          if (s.includes('COUNT(*) as count FROM enquiries')) {
            return { count: mem.enquiries.length };
          }
          if (s.includes('FROM vehicles WHERE slug = ?')) {
            return mem.vehicles.find(v => v.slug === params[0]) || null;
          }
          if (s.includes('FROM enquiries WHERE ref_number = ?')) {
            return mem.enquiries.find(e => e.ref_number === params[0]) || null;
          }
          if (s.includes('FROM enquiries WHERE id = ?')) {
            return mem.enquiries.find(e => e.id === params[0]) || null;
          }
          return null;
        },
        all: (...params) => {
          if (s.includes('FROM settings')) {
            return Object.entries(mem.settings).map(([key, value]) => ({ key, value }));
          }
          if (s.includes('FROM vehicles')) {
            return [...mem.vehicles].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
          }
          if (s.includes('FROM destinations')) {
            return [...mem.destinations].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
          }
          if (s.includes('FROM packages')) {
            return [...mem.packages].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
          }
          if (s.includes('FROM enquiries')) {
            let list = [...mem.enquiries];
            if (params.length > 0 && params[0]) {
              list = list.filter(e => e.status === params[0]);
            }
            if (s.includes('LIMIT 5')) {
              list = list.slice(0, 5);
            }
            return list;
          }
          return [];
        }
      };
    }
  };
}

// --- SEED DATABASE IF EMPTY ---
function seedDatabase() {
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM vehicles');
  const result = checkStmt.get();
  if (result.count === 0) {
    let seedData;
    if (fs.existsSync(SEED_FILE)) {
      seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    } else {
      try {
        seedData = require('./data/seed.json');
      } catch (err) {
        seedData = null;
      }
    }

    if (!seedData) return;

    // Insert settings
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(seedData.settings || {})) {
      insertSetting.run(k, String(v));
    }

    // Insert vehicles
    const insertVeh = db.prepare(`
      INSERT INTO vehicles (
        name, slug, capacity, capacity_details, category, image_url, ac_type,
        luggage_capacity, seating_layout, price_per_km, min_km_per_day, driver_bata,
        night_halt, is_available, description, amenities_json, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    (seedData.vehicles || []).forEach(v => {
      insertVeh.run(
        v.name, v.slug, v.capacity, v.capacity_details, v.category, v.image_url, v.ac_type,
        v.luggage_capacity, v.seating_layout, v.price_per_km, v.min_km_per_day, v.driver_bata,
        v.night_halt, v.is_available, v.description, JSON.stringify(v.amenities), v.sort_order
      );
    });

    // Insert destinations
    const insertDest = db.prepare(`
      INSERT INTO destinations (
        name, slug, region, image_url, description, best_time, top_attractions_json, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    (seedData.destinations || []).forEach((d, idx) => {
      insertDest.run(
        d.name, d.slug, d.region, d.image_url, d.description, d.best_time,
        JSON.stringify(d.top_attractions), idx + 1
      );
    });

    // Insert packages
    const insertPkg = db.prepare(`
      INSERT INTO packages (
        title, slug, duration, duration_days, group_size, starting_price,
        image_url, available_vehicles_json, highlights_json, suggested_itinerary_json, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    (seedData.packages || []).forEach((p, idx) => {
      insertPkg.run(
        p.title, p.slug, p.duration, p.duration_days, p.group_size, p.starting_price,
        p.image_url, JSON.stringify(p.available_vehicles), JSON.stringify(p.highlights),
        JSON.stringify(p.suggested_itinerary), idx + 1
      );
    });
  }
}

seedDatabase();

// --- IN-MEMORY SESSION STORE FOR ADMIN ---
const adminSessions = new Set();

// --- HELPER UTILITIES ---
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function getSettingsMap() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

function generateWhatsAppUrl(phone, text) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

// --- MIME TYPES & STATIC FILE SERVING ---
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404 Not Found</h1><p>The requested file does not exist.</p>`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// --- HTTP REQUEST HANDLER ---
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS pre-flight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // --- PUBLIC API ROUTES ---

  // 1. GET /api/settings
  if (method === 'GET' && pathname === '/api/settings') {
    const settings = getSettingsMap();
    delete settings.admin_pin; // Never expose admin credentials
    return sendJson(res, 200, { success: true, settings });
  }

  // 2. GET /api/vehicles
  if (method === 'GET' && pathname === '/api/vehicles') {
    const rows = db.prepare('SELECT * FROM vehicles ORDER BY sort_order ASC').all();
    const vehicles = rows.map(v => ({
      ...v,
      amenities: typeof v.amenities_json === 'string' ? JSON.parse(v.amenities_json || '[]') : (v.amenities_json || [])
    }));
    return sendJson(res, 200, { success: true, vehicles });
  }

  // 3. GET /api/destinations
  if (method === 'GET' && pathname === '/api/destinations') {
    const rows = db.prepare('SELECT * FROM destinations ORDER BY sort_order ASC').all();
    const destinations = rows.map(d => ({
      ...d,
      top_attractions: typeof d.top_attractions_json === 'string' ? JSON.parse(d.top_attractions_json || '[]') : (d.top_attractions_json || [])
    }));
    return sendJson(res, 200, { success: true, destinations });
  }

  // 4. GET /api/packages
  if (method === 'GET' && pathname === '/api/packages') {
    const rows = db.prepare('SELECT * FROM packages ORDER BY sort_order ASC').all();
    const packages = rows.map(p => ({
      ...p,
      available_vehicles: typeof p.available_vehicles_json === 'string' ? JSON.parse(p.available_vehicles_json || '[]') : (p.available_vehicles_json || []),
      highlights: typeof p.highlights_json === 'string' ? JSON.parse(p.highlights_json || '[]') : (p.highlights_json || []),
      suggested_itinerary: typeof p.suggested_itinerary_json === 'string' ? JSON.parse(p.suggested_itinerary_json || '[]') : (p.suggested_itinerary_json || [])
    }));
    return sendJson(res, 200, { success: true, packages });
  }

  // 5. POST /api/bookings - Create Booking Enquiry
  if (method === 'POST' && pathname === '/api/bookings') {
    try {
      const data = await parseJsonBody(req);

      // Validate required fields
      if (!data.customer_name || !data.customer_name.trim()) {
        return sendJson(res, 400, { success: false, error: 'Customer name is required' });
      }
      if (!data.mobile || data.mobile.replace(/[^0-9]/g, '').length < 10) {
        return sendJson(res, 400, { success: false, error: 'Valid 10-digit mobile number is required' });
      }
      if (!data.pickup_location || !data.pickup_location.trim()) {
        return sendJson(res, 400, { success: false, error: 'Pickup location is required' });
      }
      if (!data.destination || !data.destination.trim()) {
        return sendJson(res, 400, { success: false, error: 'Destination is required' });
      }
      if (!data.pickup_date) {
        return sendJson(res, 400, { success: false, error: 'Travel pickup date is required' });
      }
      if (!data.vehicle_type) {
        return sendJson(res, 400, { success: false, error: 'Preferred vehicle category is required' });
      }

      // Generate Unique Reference ID: TNV-2026-XXXX
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const refNumber = `TNV-2026-${randomSuffix}`;
      const now = new Date().toISOString();

      const insertStmt = db.prepare(`
        INSERT INTO enquiries (
          ref_number, customer_name, mobile, whatsapp_number, pickup_location, destination,
          pickup_date, return_date, pickup_time, trip_type, passengers, vehicle_type,
          ac_preference, additional_req, instructions, status, quoted_amount, admin_notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0, '', ?, ?)
      `);

      insertStmt.run(
        refNumber,
        data.customer_name.trim(),
        data.mobile.trim(),
        (data.whatsapp_number || data.mobile).trim(),
        data.pickup_location.trim(),
        data.destination.trim(),
        data.pickup_date,
        data.return_date || null,
        data.pickup_time || '08:00 AM',
        data.trip_type || 'Round-Trip',
        parseInt(data.passengers, 10) || 12,
        data.vehicle_type,
        data.ac_preference || 'AC',
        data.additional_req || '',
        data.instructions || '',
        now,
        now
      );

      // Generate pre-filled WhatsApp click-to-chat message
      const settings = getSettingsMap();
      const companyWaNumber = settings.whatsapp_number || '919444012345';
      const returnDateStr = data.return_date ? `\n*Return Date:* ${data.return_date}` : '';

      const waText = 
`🚐 *NEW TOURIST VAN BOOKING ENQUIRY*
━━━━━━━━━━━━━━━━━━━━━━
*Ref No:* ${refNumber}
*Customer:* ${data.customer_name}
*Mobile:* ${data.mobile}
*Pickup:* ${data.pickup_location}
*Destination:* ${data.destination}
*Trip Type:* ${data.trip_type || 'Round-Trip'}
*Pickup Date:* ${data.pickup_date}${returnDateStr}
*Time:* ${data.pickup_time || '08:00 AM'}
*Passengers:* ${data.passengers || '12'} Pax
*Vehicle Needed:* ${data.vehicle_type} (${data.ac_preference || 'AC'})
${data.instructions ? `*Special Request:* ${data.instructions}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
Please provide quotation and availability. Thank you!`;

      const whatsappUrl = generateWhatsAppUrl(companyWaNumber, waText);

      return sendJson(res, 201, {
        success: true,
        ref_number: refNumber,
        message: 'Your booking enquiry has been registered successfully! An executive will review and provide a confirmed quote.',
        whatsapp_url: whatsappUrl,
        enquiry: {
          ref_number: refNumber,
          customer_name: data.customer_name,
          mobile: data.mobile,
          pickup_location: data.pickup_location,
          destination: data.destination,
          pickup_date: data.pickup_date,
          vehicle_type: data.vehicle_type,
          status: 'Pending'
        }
      });
    } catch (err) {
      console.error('Error creating booking:', err);
      return sendJson(res, 500, { success: false, error: 'Database error while saving booking' });
    }
  }

  // 6. GET /api/bookings/track/:ref - Public Status Tracking
  if (method === 'GET' && pathname.startsWith('/api/bookings/track/')) {
    const ref = pathname.split('/api/bookings/track/')[1];
    if (!ref) {
      return sendJson(res, 400, { success: false, error: 'Reference number is required' });
    }

    const row = db.prepare('SELECT ref_number, customer_name, pickup_location, destination, pickup_date, vehicle_type, status, quoted_amount, created_at FROM enquiries WHERE ref_number = ?').get(ref.toUpperCase());
    if (!row) {
      return sendJson(res, 404, { success: false, error: `No enquiry found for reference ${ref}` });
    }

    return sendJson(res, 200, { success: true, booking: row });
  }

  // 7. POST /api/fare/estimate - Dynamic Fare Calculation
  if (method === 'POST' && pathname === '/api/fare/estimate') {
    try {
      const data = await parseJsonBody(req);
      const { pickup, destination, trip_type, days, vehicle_slug } = data;

      const vehicle = db.prepare('SELECT * FROM vehicles WHERE slug = ?').get(vehicle_slug || '18-seater-tourist-van');
      if (!vehicle) {
        return sendJson(res, 404, { success: false, error: 'Vehicle not found' });
      }

      const estOneWayKm = estimateTamilNaduDistanceKm(pickup, destination);
      const numDays = Math.max(1, parseInt(days, 10) || 1);
      const isRoundTrip = trip_type === 'Round-Trip' || trip_type === 'Multi-Day Outstation';
      const isLocal = trip_type === 'Local Sightseeing';

      let totalBillableKm = 0;
      let minKmCharge = vehicle.min_km_per_day * numDays;

      if (isLocal) {
        totalBillableKm = 80;
      } else if (isRoundTrip) {
        const actualEstKm = estOneWayKm * 2;
        totalBillableKm = Math.max(actualEstKm, minKmCharge);
      } else {
        totalBillableKm = Math.max(Math.round(estOneWayKm * 1.5), minKmCharge);
      }

      const kmFare = totalBillableKm * vehicle.price_per_km;
      const driverBataTotal = vehicle.driver_bata * numDays;
      const nightHaltTotal = numDays > 1 ? (vehicle.night_halt * (numDays - 1)) : 0;
      const estimatedTotal = Math.round(kmFare + driverBataTotal + nightHaltTotal);

      return sendJson(res, 200, {
        success: true,
        vehicle: {
          name: vehicle.name,
          capacity: vehicle.capacity,
          price_per_km: vehicle.price_per_km,
          driver_bata: vehicle.driver_bata
        },
        estimate: {
          estimated_one_way_km: estOneWayKm,
          total_billable_km: Math.round(totalBillableKm),
          number_of_days: numDays,
          km_fare: Math.round(kmFare),
          driver_bata_total: driverBataTotal,
          night_halt_total: nightHaltTotal,
          estimated_total: estimatedTotal,
          inclusions: ["Van rental", "Fuel charges", "Professional driver allowance"],
          exclusions: ["Highway toll plaza charges (at actuals)", "Parking & entry tickets", "Inter-state/Hill station permit if applicable"]
        }
      });
    } catch (err) {
      console.error('Error calculating fare:', err);
      return sendJson(res, 500, { success: false, error: 'Fare estimation calculation error' });
    }
  }

  // --- ADMIN AUTHENTICATION & MANAGEMENT ENDPOINTS ---
  function isAuthorizedAdmin(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '').trim();
    return adminSessions.has(token);
  }

  // 8. POST /api/admin/login
  if (method === 'POST' && pathname === '/api/admin/login') {
    try {
      const data = await parseJsonBody(req);
      const settings = getSettingsMap();
      const configuredPin = settings.admin_pin || 'admin123';

      if (data.pin === configuredPin || data.password === configuredPin) {
        const sessionToken = crypto.randomBytes(24).toString('hex');
        adminSessions.add(sessionToken);
        return sendJson(res, 200, {
          success: true,
          token: sessionToken,
          message: 'Admin authentication successful'
        });
      } else {
        return sendJson(res, 401, { success: false, error: 'Invalid PIN or password' });
      }
    } catch (err) {
      return sendJson(res, 500, { success: false, error: 'Server error during login' });
    }
  }

  // 9. POST /api/admin/logout
  if (method === 'POST' && pathname === '/api/admin/logout') {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      adminSessions.delete(token);
    }
    return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
  }

  // 10. GET /api/admin/stats
  if (method === 'GET' && pathname === '/api/admin/stats') {
    if (!isAuthorizedAdmin(req)) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

    const totalEnquiries = db.prepare('SELECT COUNT(*) as count FROM enquiries').get().count;
    const pendingQuotes = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'Pending'").get().count;
    const confirmedTrips = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'Confirmed'").get().count;
    const quotedTrips = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'Quoted'").get().count;
    const totalVehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE is_available = 1').get().count;

    const recentEnquiries = db.prepare('SELECT * FROM enquiries ORDER BY id DESC LIMIT 5').all();

    return sendJson(res, 200, {
      success: true,
      stats: {
        total_enquiries: totalEnquiries,
        pending_quotes: pendingQuotes,
        confirmed_trips: confirmedTrips,
        quoted_trips: quotedTrips,
        active_vehicles: totalVehicles
      },
      recent_enquiries: recentEnquiries
    });
  }

  // 11. GET /api/admin/bookings
  if (method === 'GET' && pathname === '/api/admin/bookings') {
    if (!isAuthorizedAdmin(req)) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

    const statusFilter = parsedUrl.query.status;
    let query = 'SELECT * FROM enquiries';
    const params = [];

    if (statusFilter && statusFilter !== 'All') {
      query += ' WHERE status = ?';
      params.push(statusFilter);
    }
    query += ' ORDER BY id DESC';

    const bookings = db.prepare(query).all(...params);
    return sendJson(res, 200, { success: true, bookings });
  }

  // 12. PATCH /api/admin/bookings/:id
  if (method === 'PATCH' && pathname.startsWith('/api/admin/bookings/')) {
    if (!isAuthorizedAdmin(req)) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

    const bookingId = parseInt(pathname.split('/api/admin/bookings/')[1], 10);
    if (!bookingId) return sendJson(res, 400, { success: false, error: 'Invalid booking ID' });

    try {
      const data = await parseJsonBody(req);
      const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(bookingId);
      if (!existing) return sendJson(res, 404, { success: false, error: 'Booking not found' });

      const newStatus = data.status || existing.status;
      const newQuoted = data.quoted_amount !== undefined ? parseFloat(data.quoted_amount) : existing.quoted_amount;
      const newNotes = data.admin_notes !== undefined ? data.admin_notes : existing.admin_notes;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE enquiries 
        SET status = ?, quoted_amount = ?, admin_notes = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, newQuoted, newNotes, now, bookingId);

      const updated = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(bookingId);
      return sendJson(res, 200, { success: true, booking: updated });
    } catch (err) {
      console.error('Error updating booking:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to update booking' });
    }
  }

  // 13. PUT /api/admin/vehicles/:id
  if (method === 'PUT' && pathname.startsWith('/api/admin/vehicles/')) {
    if (!isAuthorizedAdmin(req)) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

    const vehicleId = parseInt(pathname.split('/api/admin/vehicles/')[1], 10);
    try {
      const data = await parseJsonBody(req);
      db.prepare(`
        UPDATE vehicles
        SET price_per_km = ?, min_km_per_day = ?, driver_bata = ?, night_halt = ?, is_available = ?
        WHERE id = ?
      `).run(
        parseFloat(data.price_per_km),
        parseFloat(data.min_km_per_day),
        parseFloat(data.driver_bata),
        parseFloat(data.night_halt || 350),
        data.is_available ? 1 : 0,
        vehicleId
      );

      return sendJson(res, 200, { success: true, message: 'Vehicle pricing updated successfully' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: 'Failed to update vehicle' });
    }
  }

  // 14. PUT /api/admin/settings
  if (method === 'PUT' && pathname === '/api/admin/settings') {
    if (!isAuthorizedAdmin(req)) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

    try {
      const data = await parseJsonBody(req);
      const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) {
          updateSetting.run(k, String(v));
        }
      }

      return sendJson(res, 200, { success: true, message: 'Settings updated successfully' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: 'Failed to update settings' });
    }
  }

  // --- STATIC FILES & PAGE ROUTING ---
  if (pathname.startsWith('/routes/')) {
    return serveStatic(req, res, path.join(PUBLIC_DIR, 'route.html'));
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    return serveStatic(req, res, path.join(PUBLIC_DIR, 'admin.html'));
  }

  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const targetFile = path.join(PUBLIC_DIR, safePath);
  serveStatic(req, res, targetFile);
});

// Start listening if not running inside Vercel serverless wrapper
if (!isVercel) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Tamil Nadu Van Travels Server is Live!`);
    console.log(`  Access Website:    http://localhost:${PORT}`);
    console.log(`  Admin Dashboard:   http://localhost:${PORT}/admin`);
    console.log(`  Default Admin PIN: admin123`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
