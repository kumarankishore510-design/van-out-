/**
 * Complete Tamil Nadu Geographic & Distance Data
 * Covers all 38 Districts, key towns, temples, and hill stations.
 */

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
  "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram",
  "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
  "Nagapattinam", "Namakkal", "Nilgiris (Ooty)", "Perambalur", "Pudukkottai",
  "Ramanathapuram (Rameswaram)", "Ranipet", "Salem", "Sivaganga (Karaikudi)",
  "Tenkasi (Courtallam)", "Thanjavur", "Theni", "Thoothukudi (Tuticorin)",
  "Tiruchirappalli (Trichy)", "Tirunelveli", "Tirupathur", "Tiruppur",
  "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
];

const POPULAR_TAMIL_NADU_LOCATIONS = [
  // Major Cities & Hubs
  { name: "Chennai (Central / Airport / CMBT)", district: "Chennai", type: "City & Hub", distFromChennai: 0 },
  { name: "Coimbatore (Gandhipuram / Airport)", district: "Coimbatore", type: "City & Hub", distFromChennai: 505 },
  { name: "Madurai (Meenakshi Temple / Mattuthavani)", district: "Madurai", type: "Heritage City", distFromChennai: 462 },
  { name: "Tiruchirappalli (Trichy Central / Srirangam)", district: "Tiruchirappalli", type: "Delta Hub", distFromChennai: 330 },
  { name: "Salem (New Bus Stand / Junction)", district: "Salem", type: "West Hub", distFromChennai: 345 },
  { name: "Tirunelveli (Junction / Palayamkottai)", district: "Tirunelveli", type: "South Hub", distFromChennai: 625 },
  { name: "Tiruppur (Avinashi / New Bus Stand)", district: "Tiruppur", type: "Textile City", distFromChennai: 465 },
  { name: "Erode (Central Bus Stand)", district: "Erode", type: "West Hub", distFromChennai: 400 },
  { name: "Vellore (Katpadi / Golden Temple)", district: "Vellore", type: "Historic City", distFromChennai: 140 },
  { name: "Kanchipuram (Temple Town)", district: "Kanchipuram", type: "Pilgrim & Silk", distFromChennai: 75 },

  // Hill Stations
  { name: "Ooty (Udhagamandalam)", district: "Nilgiris (Ooty)", type: "Hill Station", distFromChennai: 540 },
  { name: "Coonoor (Sim's Park)", district: "Nilgiris (Ooty)", type: "Hill Station", distFromChennai: 520 },
  { name: "Kotagiri", district: "Nilgiris (Ooty)", type: "Hill Station", distFromChennai: 510 },
  { name: "Kodaikanal (Lake & Coaker's Walk)", district: "Dindigul", type: "Hill Station", distFromChennai: 525 },
  { name: "Yercaud (Shevaroy Hills)", district: "Salem", type: "Hill Station", distFromChennai: 375 },
  { name: "Valparai (Tea Gardens & Ghats)", district: "Coimbatore", type: "Hill Station", distFromChennai: 590 },
  { name: "Yelagiri Hills", district: "Tirupathur", type: "Hill Station", distFromChennai: 230 },
  { name: "Kolli Hills (70 Hairpin Bends)", district: "Namakkal", type: "Hill Station", distFromChennai: 385 },
  { name: "Meghamalai (Highwavys)", district: "Theni", type: "Hill Station", distFromChennai: 540 },

  // Coastal & Heritage
  { name: "Mahabalipuram (Mamallapuram)", district: "Chengalpattu", type: "UNESCO Heritage", distFromChennai: 55 },
  { name: "Kanyakumari (Triveni Sangam)", district: "Kanyakumari", type: "Coastal & Pilgrim", distFromChennai: 705 },
  { name: "Rameswaram (Temple & Dhanushkodi)", district: "Ramanathapuram", type: "Sacred Island", distFromChennai: 560 },
  { name: "Thanjavur (Brihadisvara Big Temple)", district: "Thanjavur", type: "UNESCO Heritage", distFromChennai: 345 },
  { name: "Kumbakonam (Navagraha Gateway)", district: "Thanjavur", type: "Temple City", distFromChennai: 295 },
  { name: "Chidambaram (Nataraja Temple)", district: "Cuddalore", type: "Pilgrim", distFromChennai: 235 },
  { name: "Velankanni (Basilica of Our Lady of Good Health)", district: "Nagapattinam", type: "Pilgrim & Coast", distFromChennai: 310 },
  { name: "Nagore Dargah", district: "Nagapattinam", type: "Pilgrim", distFromChennai: 305 },
  { name: "Tiruvannamalai (Arunachaleswarar)", district: "Tiruvannamalai", type: "Spiritual Center", distFromChennai: 195 },
  { name: "Palani (Murugan Temple)", district: "Dindigul", type: "Sacred Pilgrim", distFromChennai: 470 },
  { name: "Tiruchendur (Sea Shore Murugan Temple)", district: "Thoothukudi", type: "Coastal Pilgrim", distFromChennai: 645 },
  { name: "Courtallam (Waterfalls & Spa)", district: "Tenkasi", type: "Nature & Waterfalls", distFromChennai: 635 },
  { name: "Hogenakkal Falls", district: "Dharmapuri", type: "Waterfalls & River", distFromChennai: 340 },
  { name: "Pichavaram Mangrove Forest", district: "Cuddalore", type: "Nature & Boating", distFromChennai: 230 },
  { name: "Chettinad (Karaikudi Palaces)", district: "Sivaganga", type: "Heritage & Cuisine", distFromChennai: 410 },
  { name: "Dindigul (Rock Fort & Biryani City)", district: "Dindigul", type: "Historic Hub", distFromChennai: 425 },
  { name: "Theni (Suruli Falls & Cardamom)", district: "Theni", type: "Nature & Gateway", distFromChennai: 495 },
  { name: "Pudukkottai (Chithannavasal)", district: "Pudukkottai", type: "Heritage", distFromChennai: 385 },
  { name: "Nagercoil", district: "Kanyakumari", type: "South Hub", distFromChennai: 685 },
  { name: "Hosur", district: "Krishnagiri", type: "Border City", distFromChennai: 310 }
];

/**
 * Intelligent Distance Estimator for Tamil Nadu
 * Returns realistic road distance between two locations.
 */
function estimateTamilNaduDistanceKm(pickupText, dropText) {
  if (!pickupText || !dropText) return 150;
  
  const cleanPick = pickupText.toLowerCase();
  const cleanDrop = dropText.toLowerCase();
  
  if (cleanPick === cleanDrop) return 25; // Local sightseeing minimum

  const findNode = (text) => {
    return POPULAR_TAMIL_NADU_LOCATIONS.find(loc => 
      text.includes(loc.name.toLowerCase().split(" ")[0]) ||
      text.includes(loc.district.toLowerCase().split(" ")[0])
    );
  };

  const pNode = findNode(cleanPick);
  const dNode = findNode(cleanDrop);

  if (pNode && dNode) {
    if (pNode.name === dNode.name) return 30;
    
    // Exact route matrix for common popular tourist routes
    const routeKey = `${pNode.district.toLowerCase()}_to_${dNode.district.toLowerCase()}`;
    const reverseKey = `${dNode.district.toLowerCase()}_to_${pNode.district.toLowerCase()}`;
    
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

    if (DIRECT_ROUTES[routeKey]) return DIRECT_ROUTES[routeKey];
    if (DIRECT_ROUTES[reverseKey]) return DIRECT_ROUTES[reverseKey];

    // Hub distance delta calculation
    const delta = Math.abs(pNode.distFromChennai - dNode.distFromChennai);
    if (delta > 0) {
      // Add typical highway junction curvature (15%)
      return Math.round(Math.max(45, delta * 1.12));
    }
  }

  // Fallback realistic inter-district average
  return 220;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TAMIL_NADU_DISTRICTS,
    POPULAR_TAMIL_NADU_LOCATIONS,
    estimateTamilNaduDistanceKm
  };
}
