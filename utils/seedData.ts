
import { adminService } from '../services/adminService';
import { quickQuoteTemplateService } from '../services/quickQuoteTemplateService';
import { Destination, Activity, Transfer, Visa, FixedPackage, ItineraryTemplate, QuickQuoteTemplate } from '../types';

const DESTINATIONS_DATA = [
  // --- INDIA DOMESTIC ---
  { country: 'India', city: 'Goa', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Munnar', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Manali', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Leh', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Srinagar', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Jaipur', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Port Blair', currency: 'INR', timezone: 'GMT+5:30' },
  
  // --- VIETNAM ---
  { country: 'Vietnam', city: 'Hanoi', currency: 'VND', timezone: 'GMT+7' },
  { country: 'Vietnam', city: 'Ha Long Bay', currency: 'VND', timezone: 'GMT+7' },
  { country: 'Vietnam', city: 'Phu Quoc', currency: 'VND', timezone: 'GMT+7' },
  { country: 'Vietnam', city: 'Ho Chi Minh', currency: 'VND', timezone: 'GMT+7' },

  // --- THAILAND ---
  { country: 'Thailand', city: 'Bangkok', currency: 'THB', timezone: 'GMT+7' },
  { country: 'Thailand', city: 'Pattaya', currency: 'THB', timezone: 'GMT+7' },
  { country: 'Thailand', city: 'Phuket', currency: 'THB', timezone: 'GMT+7' },
  { country: 'Thailand', city: 'Krabi', currency: 'THB', timezone: 'GMT+7' },

  // --- INDONESIA ---
  { country: 'Indonesia', city: 'Bali', currency: 'IDR', timezone: 'GMT+8' },
  { country: 'Indonesia', city: 'Jakarta', currency: 'IDR', timezone: 'GMT+7' },

  // --- MALAYSIA ---
  { country: 'Malaysia', city: 'Kuala Lumpur', currency: 'MYR', timezone: 'GMT+8' },
  { country: 'Malaysia', city: 'Langkawi', currency: 'MYR', timezone: 'GMT+8' },

  // --- SINGAPORE ---
  { country: 'Singapore', city: 'Singapore', currency: 'SGD', timezone: 'GMT+8' },

  // --- UAE ---
  { country: 'United Arab Emirates', city: 'Dubai', currency: 'AED', timezone: 'GMT+4' },
  { country: 'United Arab Emirates', city: 'Abu Dhabi', currency: 'AED', timezone: 'GMT+4' },

  // --- JAPAN ---
  { country: 'Japan', city: 'Tokyo', currency: 'JPY', timezone: 'GMT+9' },
  { country: 'Japan', city: 'Osaka', currency: 'JPY', timezone: 'GMT+9' },

  // --- HONG KONG ---
  { country: 'Hong Kong', city: 'Hong Kong', currency: 'HKD', timezone: 'GMT+8' },

  // --- SRI LANKA ---
  { country: 'Sri Lanka', city: 'Colombo', currency: 'LKR', timezone: 'GMT+5:30' },
  { country: 'Sri Lanka', city: 'Kandy', currency: 'LKR', timezone: 'GMT+5:30' },
  { country: 'Sri Lanka', city: 'Bentota', currency: 'LKR', timezone: 'GMT+5:30' },

  // --- BHUTAN ---
  { country: 'Bhutan', city: 'Thimphu', currency: 'BTN', timezone: 'GMT+6' },
  { country: 'Bhutan', city: 'Paro', currency: 'BTN', timezone: 'GMT+6' },

  // --- AUSTRALIA ---
  { country: 'Australia', city: 'Sydney', currency: 'AUD', timezone: 'GMT+11' },
  { country: 'Australia', city: 'Melbourne', currency: 'AUD', timezone: 'GMT+11' },
  { country: 'Australia', city: 'Gold Coast', currency: 'AUD', timezone: 'GMT+11' },
  
  // --- MALDIVES ---
  { country: 'Maldives', city: 'Male', currency: 'MVR', timezone: 'GMT+5' },
];

const ACTIVITIES_DATA = [
  // Vietnam
  { city: 'Hanoi', name: 'Hanoi City Tour', type: 'City Tour', cost: 2500, desc: 'Visit Ho Chi Minh Mausoleum and Old Quarter.', img: 'https://images.unsplash.com/photo-1528127269322-539801943592' },
  { city: 'Ha Long Bay', name: 'Full Day Cruise', type: 'Cruise', cost: 4500, desc: 'Cruise through limestone karsts with lunch.', img: 'https://images.unsplash.com/photo-1506530663162-818f9df8811d' },
  { city: 'Phu Quoc', name: '4 Islands Speedboat Tour', type: 'Adventure', cost: 3500, desc: 'Snorkeling and island hopping.', img: 'https://images.unsplash.com/photo-1540202404-a2f29016b523' },
  
  // Thailand
  { city: 'Pattaya', name: 'Coral Island Tour with Lunch', type: 'Adventure', cost: 1200, desc: 'Speedboat to Koh Larn with Indian lunch.', img: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b' },
  { city: 'Pattaya', name: 'Alcazar Cabaret Show', type: 'Show', cost: 1800, desc: 'Famous ladyboy cabaret show.', img: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed' },
  { city: 'Krabi', name: '4 Island Tour by Longtail Boat', type: 'Adventure', cost: 2000, desc: 'Visit Chicken Island, Poda Island, Tup Island.', img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a' },
  { city: 'Bangkok', name: 'Safari World & Marine Park', type: 'Theme Park', cost: 2900, desc: 'Full day pass with buffet lunch.', img: 'https://images.unsplash.com/photo-1534125861183-7c39050d24cb' },
  
  // Indonesia
  { city: 'Bali', name: 'Uluwatu Temple & Kecak Dance', type: 'Show', cost: 2500, desc: 'Sunset temple tour with traditional dance.', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4' },
  { city: 'Bali', name: 'Nusa Penida West Tour', type: 'Adventure', cost: 5500, desc: 'Kelingking Beach, Broken Beach, Angel Billabong.', img: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1' },
  
  // Malaysia
  { city: 'Kuala Lumpur', name: 'Petronas Twin Towers', type: 'City Tour', cost: 2800, desc: 'Observation deck ticket.', img: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07' },
  { city: 'Kuala Lumpur', name: 'Batu Caves & Genting Highlands', type: 'City Tour', cost: 3500, desc: 'Day trip to caves and casino resort.', img: 'https://images.unsplash.com/photo-1584346133934-a3afd2a5d996' },
  
  // Singapore
  { city: 'Singapore', name: 'Universal Studios Singapore', type: 'Theme Park', cost: 6500, desc: 'One day pass to USS.', img: 'https://images.unsplash.com/photo-1537240939023-5e6022ce8779' },
  { city: 'Singapore', name: 'Gardens by the Bay', type: 'City Tour', cost: 2200, desc: 'Cloud Forest and Flower Dome.', img: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd' },
  
  // UAE
  { city: 'Dubai', name: 'Desert Safari with BBQ', type: 'Adventure', cost: 3200, desc: 'Dune bashing, camel ride, dinner.', img: 'https://images.unsplash.com/photo-1451337516015-6b6fcd1c9125' },
  { city: 'Abu Dhabi', name: 'Ferrari World', type: 'Theme Park', cost: 6800, desc: 'Standard entry ticket.', img: 'https://images.unsplash.com/photo-1569421060938-1647ba780287' },
  { city: 'Abu Dhabi', name: 'Sheikh Zayed Mosque', type: 'City Tour', cost: 0, desc: 'Grand Mosque visit (Free entry, transfer cost applies).', img: 'https://images.unsplash.com/photo-1549144511-30852b392a99' },

  // Japan
  { city: 'Tokyo', name: 'Tokyo Disneyland', type: 'Theme Park', cost: 7500, desc: '1 Day Passport.', img: 'https://images.unsplash.com/photo-1535496465427-4632057d0793' },
  { city: 'Osaka', name: 'Universal Studios Japan', type: 'Theme Park', cost: 8000, desc: 'Entry ticket.', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },

  // Hong Kong
  { city: 'Hong Kong', name: 'Disney Land Hong Kong', type: 'Theme Park', cost: 7000, desc: 'Entry pass.', img: 'https://images.unsplash.com/photo-1588782012019-354366eb7d55' },
  { city: 'Hong Kong', name: 'Victoria Peak Tram', type: 'City Tour', cost: 1500, desc: 'Return tram with Sky Terrace.', img: 'https://images.unsplash.com/photo-1536764506864-4e4b77d612ce' },

  // Sri Lanka
  { city: 'Kandy', name: 'Temple of the Tooth Relic', type: 'City Tour', cost: 1200, desc: 'Sacred Buddhist temple visit.', img: 'https://images.unsplash.com/photo-1588258524675-c61d5f3089d3' },
  { city: 'Bentota', name: 'Madu River Boat Safari', type: 'Adventure', cost: 1000, desc: 'River safari through mangroves.', img: 'https://images.unsplash.com/photo-1548325983-7f9a21b34360' },

  // Australia
  { city: 'Sydney', name: 'Sydney Opera House Tour', type: 'City Tour', cost: 2800, desc: 'Guided tour.', img: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9' },
  { city: 'Gold Coast', name: 'Movie World', type: 'Theme Park', cost: 6500, desc: 'Warner Bros Movie World ticket.', img: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809' },
];

const TRANSFERS_DATA = [
  { city: 'Hanoi', name: 'Noi Bai Airport to Hotel', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 1800, desc: 'Private arrival transfer.' },
  { city: 'Phu Quoc', name: 'PQC Airport to Hotel', type: 'PVT', vehicle: 'Van', pax: 6, cost: 2200, desc: 'Group arrival transfer.' },
  { city: 'Pattaya', name: 'BKK Airport to Pattaya Hotel', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 2800, desc: 'Intercity airport transfer.' },
  { city: 'Krabi', name: 'KBV Airport to Ao Nang', type: 'PVT', vehicle: 'Van', pax: 8, cost: 2000, desc: 'Minivan transfer.' },
  { city: 'Bali', name: 'DPS Airport to Kuta', type: 'PVT', vehicle: 'MPV', pax: 4, cost: 1500, desc: 'Standard MPV.' },
  { city: 'Kuala Lumpur', name: 'KLIA to City Centre', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 2200, desc: 'Airport transfer.' },
  { city: 'Singapore', name: 'Changi Airport to Hotel', type: 'PVT', vehicle: 'Combi', pax: 6, cost: 3500, desc: 'Family transfer.' },
  { city: 'Dubai', name: 'DXB Airport to Hotel', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 2400, desc: 'Standard arrival.' },
  { city: 'Abu Dhabi', name: 'AUH Airport to Hotel', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 3000, desc: 'Arrival transfer.' },
  { city: 'Tokyo', name: 'Narita to Tokyo City', type: 'SIC', vehicle: 'Limousine Bus', pax: 1, cost: 2500, desc: 'Shared bus ticket.' },
  { city: 'Hong Kong', name: 'HKG Airport to Hotel', type: 'PVT', vehicle: 'MPV', pax: 5, cost: 5500, desc: 'Private MPV.' },
  { city: 'Colombo', name: 'CMB Airport to Colombo', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 2600, desc: 'Private car.' },
  { city: 'Paro', name: 'Paro Airport to Thimphu', type: 'PVT', vehicle: 'SUV', pax: 4, cost: 3500, desc: 'Scenic drive.' },
  { city: 'Sydney', name: 'SYD Airport to CBD', type: 'PVT', vehicle: 'Shuttle', pax: 1, cost: 1800, desc: 'Shared shuttle.' },
];

const VISAS_DATA: Visa[] = [
  { id: '', country: 'Vietnam', visaType: 'E-Visa', processingTime: '3-4 Days', cost: 2500, validity: '30 Days', entryType: 'Single', documentsRequired: ['Passport Scan', 'Photo'], isActive: true },
  { id: '', country: 'Thailand', visaType: 'Visa on Arrival', processingTime: 'Instant', cost: 0, validity: '15 Days', entryType: 'Single', documentsRequired: ['Passport', 'Return Ticket', 'Hotel Voucher'], isActive: true },
  { id: '', country: 'Indonesia', visaType: 'Visa on Arrival', processingTime: 'Instant', cost: 2800, validity: '30 Days', entryType: 'Single', documentsRequired: ['Passport'], isActive: true },
  { id: '', country: 'Malaysia', visaType: 'E-Visa (Tourist)', processingTime: '2-3 Days', cost: 3200, validity: '30 Days', entryType: 'Single', documentsRequired: ['Passport', 'Photo', 'Ticket'], isActive: true },
  { id: '', country: 'Singapore', visaType: 'Tourist Visa', processingTime: '4-5 Days', cost: 2800, validity: '30 Days', entryType: 'Multiple', documentsRequired: ['Form 14A', 'Passport', 'Photo', 'Cover Letter'], isActive: true },
  { id: '', country: 'United Arab Emirates', visaType: 'Tourist Visa', processingTime: '2-3 Days', cost: 6500, validity: '30 Days', entryType: 'Single', documentsRequired: ['Passport', 'Photo'], isActive: true },
  { id: '', country: 'Japan', visaType: 'Tourist Visa', processingTime: '5-7 Days', cost: 1500, validity: '15 Days', entryType: 'Single', documentsRequired: ['Passport', 'Photo', 'Bank Statement', 'Itinerary'], isActive: true },
  { id: '', country: 'Hong Kong', visaType: 'Pre-Arrival Reg.', processingTime: 'Instant', cost: 500, validity: '14 Days', entryType: 'Single', documentsRequired: ['Passport'], isActive: true },
  { id: '', country: 'Sri Lanka', visaType: 'ETA', processingTime: '24 Hours', cost: 1800, validity: '30 Days', entryType: 'Double', documentsRequired: ['Passport'], isActive: true },
  { id: '', country: 'Australia', visaType: 'Visitor Visa (600)', processingTime: '15-20 Days', cost: 12000, validity: '3 Months', entryType: 'Multiple', documentsRequired: ['Passport', 'Bank Statement', 'Employment Proof', 'Itinerary'], isActive: true },
];

const PACKAGES_DATA: FixedPackage[] = [
  { id: '', packageName: 'Vietnam Essentials', destinationId: '', category: 'Budget', nights: 5, fixedPrice: 25000, inclusions: ['3 Star Hotel', 'Halong Cruise', 'Breakfast'], exclusions: ['Flights', 'Visa'], validDates: ['2024-10-01', '2024-11-01'], isActive: true, imageUrl: '', createdBy: 'admin' },
  { id: '', packageName: 'Best of Bali', destinationId: '', category: 'Honeymoon', nights: 6, fixedPrice: 35000, inclusions: ['4 Star Hotel', 'Private Pool Villa (2N)', 'Sunset Dinner'], exclusions: ['Flights', 'Lunch'], validDates: ['2024-09-15', '2024-10-15'], isActive: true, imageUrl: '', createdBy: 'admin' },
  { id: '', packageName: 'Dubai & Abu Dhabi', destinationId: '', category: 'Family', nights: 5, fixedPrice: 42000, inclusions: ['4 Star Hotel', 'Desert Safari', 'Burj Khalifa', 'Ferrari World'], exclusions: ['Tourism Dirham'], validDates: ['2024-11-10', '2024-12-05'], isActive: true, imageUrl: '', createdBy: 'admin' },
  { id: '', packageName: 'Singapore & Malaysia', destinationId: '', category: 'Best Seller', nights: 6, fixedPrice: 55000, inclusions: ['3 Star Hotel', 'Universal Studios', 'Genting Highlands', 'Transfers'], exclusions: ['Flights', 'Visa'], validDates: ['2024-10-20'], isActive: true, imageUrl: '', createdBy: 'admin' },
  { id: '', packageName: 'Phuket & Krabi', destinationId: '', category: 'Beach', nights: 5, fixedPrice: 28000, inclusions: ['4 Star Hotel', 'Phi Phi Tour', '4 Island Tour'], exclusions: ['National Park Fees'], validDates: ['2024-11-01'], isActive: true, imageUrl: '', createdBy: 'admin' },
];

const SYSTEM_TEMPLATES_DATA = [
  { name: 'Vietnam 6N (Hanoi + Halong + Saigon)', dest: 'Vietnam', nights: 6, tags: ['Culture', 'History'] },
  { name: 'Bali 5N (Kuta + Ubud)', dest: 'Indonesia', nights: 5, tags: ['Leisure', 'Nature'] },
  { name: 'Dubai 4N Family Saver', dest: 'Dubai', nights: 4, tags: ['Family', 'Shopping'] },
  { name: 'Thailand 5N (BKK + PTY)', dest: 'Thailand', nights: 5, tags: ['Budget', 'Nightlife'] },
];

const QUICK_QUOTES_DATA = [
    { name: 'Vietnam Standard', dest: 'Vietnam', nights: 5, price: 35000 },
    { name: 'Dubai Budget', dest: 'Dubai', nights: 4, price: 28000 },
    { name: 'Bali Honeymoon', dest: 'Bali', nights: 6, price: 45000 },
    { name: 'Thailand Group', dest: 'Thailand', nights: 5, price: 22000 },
];

export const seedInternationalInventory = async () => {
    console.log("🌍 Starting Global Inventory Seed...");
    let addedDests = 0;
    let updatedActivities = 0;
    let updatedTransfers = 0;
    let addedVisas = 0;
    let addedPackages = 0;
    let addedTemplates = 0;

    // 1. Destinations
    const existingDestinations = await adminService.getDestinations();
    const destMap: Record<string, string> = {}; 

    existingDestinations.forEach(d => { destMap[d.city] = d.id; });

    for (const d of DESTINATIONS_DATA) {
        if (!destMap[d.city]) {
            const newDest: Destination = {
                id: '',
                city: d.city,
                country: d.country,
                currency: d.currency,
                timezone: d.timezone,
                isActive: true
            };
            await adminService.saveDestination(newDest);
            addedDests++;
        }
    }

    // Refresh Map
    if (addedDests > 0) {
        const refreshed = await adminService.getDestinations();
        refreshed.forEach(d => destMap[d.city] = d.id);
    }

    // 2. Activities
    const existingActivities = await adminService.getActivities();
    for (const a of ACTIVITIES_DATA) {
        const destId = destMap[a.city];
        if (!destId) continue; 
        const existingItem = existingActivities.find(ea => ea.activityName === a.name && ea.destinationId === destId);
        
        // Define default transfer options for seeded data
        const transferOptions = {
            sic: { enabled: false, costPerPerson: 0 },
            pvt: { enabled: false, costPerVehicle: 0, vehicleCapacity: 4 }
        };

        const activityPayload: Activity = {
            id: existingItem ? existingItem.id : '',
            activityName: a.name,
            destinationId: destId,
            activityType: a.type as any,
            costAdult: a.cost,
            costChild: Math.round(a.cost * 0.75),
            currency: 'INR',
            ticketIncluded: true,
            transferIncluded: false,
            isActive: true,
            description: a.desc,
            imageUrl: a.img,
            season: 'All Year',
            validFrom: new Date().toISOString().split('T')[0],
            validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
            duration: '4 Hours',
            startTime: '09:00 AM',
            transferOptions: transferOptions
        };
        await adminService.saveActivity(activityPayload);
        updatedActivities++;
    }

    // 3. Transfers
    const existingTransfers = await adminService.getTransfers();
    for (const t of TRANSFERS_DATA) {
        const destId = destMap[t.city];
        if (!destId) continue;
        const existingItem = existingTransfers.find(et => et.transferName === t.name && et.destinationId === destId);
        const transferPayload: Transfer = {
            id: existingItem ? existingItem.id : '',
            transferName: t.name,
            destinationId: destId,
            transferType: t.type as any,
            vehicleType: t.vehicle,
            maxPassengers: t.pax,
            luggageCapacity: t.pax > 4 ? 4 : 2,
            cost: t.cost,
            currency: 'INR',
            costBasis: 'Per Vehicle',
            nightSurcharge: 0,
            isActive: true,
            description: t.desc,
            season: 'All Year',
            validFrom: new Date().toISOString().split('T')[0],
            validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
            meetingPoint: 'Arrival Hall / Hotel Lobby',
            imageUrl: ''
        };
        await adminService.saveTransfer(transferPayload);
        updatedTransfers++;
    }

    // 4. Visas
    const existingVisas = await adminService.getVisas();
    for (const v of VISAS_DATA) {
        if (!existingVisas.find(ev => ev.country === v.country && ev.visaType === v.visaType)) {
            await adminService.saveVisa({ ...v, id: '' });
            addedVisas++;
        }
    }

    // 5. Fixed Packages
    const existingPackages = await adminService.getFixedPackages();
    for (const p of PACKAGES_DATA) {
        let destId = '';
        if (p.packageName.includes('Vietnam')) destId = destMap['Hanoi'];
        else if (p.packageName.includes('Bali')) destId = destMap['Bali'];
        else if (p.packageName.includes('Dubai')) destId = destMap['Dubai'];
        else if (p.packageName.includes('Singapore')) destId = destMap['Singapore'];
        else if (p.packageName.includes('Phuket')) destId = destMap['Phuket'];

        if (destId && !existingPackages.find(ep => ep.packageName === p.packageName)) {
            await adminService.saveFixedPackage({ ...p, destinationId: destId, id: '' });
            addedPackages++;
        }
    }

    // 6. System Templates
    const existingTemplates = await adminService.getSystemTemplates();
    for (const t of SYSTEM_TEMPLATES_DATA) {
        if (!existingTemplates.find(et => et.name === t.name)) {
             const tpl: ItineraryTemplate = {
                 id: '',
                 name: t.name,
                 destinationKeyword: t.dest,
                 nights: t.nights,
                 tags: t.tags,
                 days: Array.from({length: t.nights + 1}, (_, i) => ({
                     day: i+1,
                     title: i===0 ? 'Arrival' : (i === t.nights ? 'Departure' : 'Sightseeing'),
                     description: 'Day at leisure or tour.',
                     slots: []
                 }))
             };
             await adminService.saveSystemTemplate(tpl);
             addedTemplates++;
        }
    }

    // 7. Quick Quote Templates
    const existingQuick = await quickQuoteTemplateService.getSystemTemplates();
    for (const q of QUICK_QUOTES_DATA) {
        if (!existingQuick.find(eq => eq.name === q.name)) {
            const qq: QuickQuoteTemplate = {
                id: '',
                name: q.name,
                description: `Quick Quote template for ${q.dest} - ${q.nights} Nights`,
                destination: q.dest,
                nights: q.nights,
                defaultPax: { adults: 2, children: 0 },
                inputs: { hotelCategory: '4 Star', mealPlan: 'BB', transfersIncluded: true, sightseeingIntensity: 'Standard', rooms: 1 },
                tags: ['System', 'Best Seller'],
                isSystem: true,
                createdBy: 'admin',
                createdAt: new Date().toISOString(),
                basePriceEstimate: q.price
            };
            await quickQuoteTemplateService.saveTemplate(qq);
            addedTemplates++;
        }
    }

    alert(`Global Inventory Updated!\n
    - ${addedDests} Destinations
    - ${updatedActivities} Sightseeing
    - ${updatedTransfers} Transfers
    - ${addedVisas} Visas
    - ${addedPackages} Packages
    - ${addedTemplates} Templates
    `);
    window.location.reload();
};
