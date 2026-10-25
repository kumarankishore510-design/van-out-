/**
 * Interactive Fare Estimator & Distance Matrix Controller
 */

class FareCalculator {
  constructor() {
    this.vehicles = [];
    this.currentEstimate = null;
    this.init();
  }

  async init() {
    this.cacheDom();
    this.bindEvents();
    await this.loadVehicles();
    this.calculate();
  }

  cacheDom() {
    this.calcPickup = document.getElementById('calc-pickup');
    this.calcDrop = document.getElementById('calc-drop');
    this.calcTripType = document.getElementById('calc-trip-type');
    this.calcDays = document.getElementById('calc-days');
    this.calcVehicle = document.getElementById('calc-vehicle');
    
    // Output fields
    this.resDist = document.getElementById('calc-res-dist');
    this.resBillableKm = document.getElementById('calc-res-billable-km');
    this.resKmRate = document.getElementById('calc-res-km-rate');
    this.resBaseFare = document.getElementById('calc-res-base-fare');
    this.resDriverBata = document.getElementById('calc-res-driver-bata');
    this.resTotal = document.getElementById('calc-res-total');
    this.btnWhatsAppQuote = document.getElementById('calc-btn-whatsapp');
  }

  bindEvents() {
    if (!this.calcPickup) return;

    const recalculate = () => this.calculate();

    this.calcPickup.addEventListener('input', recalculate);
    this.calcDrop.addEventListener('input', recalculate);
    this.calcTripType.addEventListener('change', () => {
      // If local sightseeing, hide or adjust days
      if (this.calcTripType.value === 'Local Sightseeing') {
        this.calcDays.value = 1;
      }
      recalculate();
    });
    this.calcDays.addEventListener('input', recalculate);
    this.calcVehicle.addEventListener('change', recalculate);

    if (this.btnWhatsAppQuote) {
      this.btnWhatsAppQuote.addEventListener('click', () => this.sendToWhatsApp());
    }
  }

  async loadVehicles() {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (data.success && data.vehicles) {
        this.vehicles = data.vehicles;
        if (this.calcVehicle) {
          this.calcVehicle.innerHTML = this.vehicles.map(v => 
            `<option value="${v.slug}" data-price="${v.price_per_km}" data-bata="${v.driver_bata}" data-min="${v.min_km_per_day}">
              ${v.name} (₹${v.price_per_km}/km)
            </option>`
          ).join('');
        }
      }
    } catch (e) {
      console.warn('Fallback to standard fleet rates:', e);
    }
  }

  calculate() {
    if (!this.calcPickup || !this.calcDrop || !this.calcVehicle) return;

    const pickup = (this.calcPickup.value || 'Chennai').trim();
    const drop = (this.calcDrop.value || 'Ooty').trim();
    const tripType = this.calcTripType.value || 'Round-Trip';
    const days = Math.max(1, parseInt(this.calcDays.value, 10) || 1);
    
    // Selected vehicle attributes
    const selectedOpt = this.calcVehicle.options[this.calcVehicle.selectedIndex];
    const pricePerKm = selectedOpt ? parseFloat(selectedOpt.getAttribute('data-price')) || 22 : 22;
    const driverBata = selectedOpt ? parseFloat(selectedOpt.getAttribute('data-bata')) || 600 : 600;
    const minKmPerDay = selectedOpt ? parseFloat(selectedOpt.getAttribute('data-min')) || 250 : 250;
    const vehicleName = selectedOpt ? selectedOpt.textContent.split('(')[0].trim() : '18-Seater Tourist Van';

    // Calculate distance using helper function
    let oneWayKm = 150;
    if (typeof estimateTamilNaduDistanceKm === 'function') {
      oneWayKm = estimateTamilNaduDistanceKm(pickup, drop);
    }

    let billableKm = 0;
    let actualRunKm = 0;
    const minGuaranteedKm = minKmPerDay * days;

    if (tripType === 'Local Sightseeing') {
      actualRunKm = 80;
      billableKm = 80; // Standard local 8hr / 80km package basis
    } else if (tripType === 'Round-Trip' || tripType === 'Multi-Day Outstation') {
      actualRunKm = oneWayKm * 2;
      billableKm = Math.max(actualRunKm, minGuaranteedKm);
    } else {
      // One-way outstation: van must return to base (charged at 1.5x or min km)
      actualRunKm = oneWayKm;
      billableKm = Math.max(Math.round(oneWayKm * 1.5), minGuaranteedKm);
    }

    const kmFare = Math.round(billableKm * pricePerKm);
    const totalDriverBata = Math.round(driverBata * days);
    const nightHalt = days > 1 ? Math.round((days - 1) * 300) : 0;
    const totalEstimate = kmFare + totalDriverBata + nightHalt;

    this.currentEstimate = {
      pickup,
      drop,
      tripType,
      days,
      vehicleName,
      pricePerKm,
      driverBata: totalDriverBata,
      oneWayKm,
      billableKm,
      totalEstimate
    };

    // Update DOM
    if (this.resDist) this.resDist.textContent = `${oneWayKm} km`;
    if (this.resBillableKm) this.resBillableKm.textContent = `${billableKm} km (min ${minKmPerDay} km/day)`;
    if (this.resKmRate) this.resKmRate.textContent = `₹${pricePerKm}/km`;
    if (this.resBaseFare) this.resBaseFare.textContent = `₹${kmFare.toLocaleString('en-IN')}`;
    if (this.resDriverBata) this.resDriverBata.textContent = `₹${totalDriverBata.toLocaleString('en-IN')} (${days} days)`;
    if (this.resTotal) this.resTotal.textContent = `₹${totalEstimate.toLocaleString('en-IN')}*`;
  }

  sendToWhatsApp() {
    if (!this.currentEstimate) return;
    const e = this.currentEstimate;
    
    const waNumber = window.TN_COMPANY_SETTINGS?.whatsapp_number || '919444012345';
    const text = 
`🚐 *INSTANT FARE ESTIMATE ENQUIRY*
━━━━━━━━━━━━━━━━━━━━━━
*Route:* ${e.pickup} ➔ ${e.drop}
*Trip Type:* ${e.tripType} (${e.days} Days)
*Vehicle:* ${e.vehicleName}
*Est. One-Way Dist:* ~${e.oneWayKm} km
*Billable Km:* ${e.billableKm} km
*Estimated Fare:* ₹${e.totalEstimate.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━
Please confirm availability and share final quotation.`;

    const cleanPhone = waNumber.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.fareCalculator = new FareCalculator();
});
