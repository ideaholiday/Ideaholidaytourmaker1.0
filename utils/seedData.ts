
import { adminService } from '../services/adminService';
import { Destination, Activity, Transfer } from '../types';

const DESTINATIONS_DATA = [
  // --- EXISTING (India & Short Haul) ---
  { country: 'India', city: 'Goa', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Munnar', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Manali', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Leh', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Srinagar', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Jaipur', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'India', city: 'Port Blair', currency: 'INR', timezone: 'GMT+5:30' },
  { country: 'United Arab Emirates', city: 'Dubai', currency: 'AED', timezone: 'GMT+4' },
  { country: 'Thailand', city: 'Bangkok', currency: 'THB', timezone: 'GMT+7' },
  { country: 'Thailand', city: 'Phuket', currency: 'THB', timezone: 'GMT+7' },
  { country: 'Singapore', city: 'Singapore', currency: 'SGD', timezone: 'GMT+8' },
  { country: 'Maldives', city: 'Male', currency: 'MVR', timezone: 'GMT+5' },

  // --- NEW INTERNATIONAL (Europe) ---
  { country: 'France', city: 'Paris', currency: 'EUR', timezone: 'GMT+1' },
  { country: 'United Kingdom', city: 'London', currency: 'GBP', timezone: 'GMT+0' },
  { country: 'Switzerland', city: 'Zurich', currency: 'CHF', timezone: 'GMT+1' },
  { country: 'Switzerland', city: 'Lucerne', currency: 'CHF', timezone: 'GMT+1' },
  { country: 'Italy', city: 'Rome', currency: 'EUR', timezone: 'GMT+1' },
  { country: 'Italy', city: 'Venice', currency: 'EUR', timezone: 'GMT+1' },
  { country: 'Spain', city: 'Barcelona', currency: 'EUR', timezone: 'GMT+1' },
  { country: 'Netherlands', city: 'Amsterdam', currency: 'EUR', timezone: 'GMT+1' },
  { country: 'Turkey', city: 'Istanbul', currency: 'TRY', timezone: 'GMT+3' },
  { country: 'Turkey', city: 'Cappadocia', currency: 'TRY', timezone: 'GMT+3' },

  // --- NEW INTERNATIONAL (Asia Extended) ---
  { country: 'Indonesia', city: 'Bali', currency: 'IDR', timezone: 'GMT+8' },
  { country: 'Vietnam', city: 'Hanoi', currency: 'VND', timezone: 'GMT+7' },
  { country: 'Vietnam', city: 'Ho Chi Minh', currency: 'VND', timezone: 'GMT+7' },
  { country: 'Malaysia', city: 'Kuala Lumpur', currency: 'MYR', timezone: 'GMT+8' },
  { country: 'Japan', city: 'Tokyo', currency: 'JPY', timezone: 'GMT+9' },
  { country: 'Japan', city: 'Osaka', currency: 'JPY', timezone: 'GMT+9' },
  { country: 'Sri Lanka', city: 'Colombo', currency: 'LKR', timezone: 'GMT+5:30' },
  { country: 'Sri Lanka', city: 'Kandy', currency: 'LKR', timezone: 'GMT+5:30' },

  // --- NEW INTERNATIONAL (Rest of World) ---
  { country: 'United States', city: 'New York', currency: 'USD', timezone: 'GMT-5' },
  { country: 'United States', city: 'Las Vegas', currency: 'USD', timezone: 'GMT-8' },
  { country: 'Australia', city: 'Sydney', currency: 'AUD', timezone: 'GMT+11' },
  { country: 'Australia', city: 'Melbourne', currency: 'AUD', timezone: 'GMT+11' },
  { country: 'Egypt', city: 'Cairo', currency: 'EGP', timezone: 'GMT+2' },
  { country: 'South Africa', city: 'Cape Town', currency: 'ZAR', timezone: 'GMT+2' },
];

const ACTIVITIES_DATA = [
  // ... Previous India/Dubai/Thai items ...
  { city: 'Goa', name: 'North Goa Sightseeing (SIC)', type: 'City Tour', cost: 400, desc: 'Visit Fort Aguada, Calangute Beach, Baga Beach and Anjuna by shared coach.', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2' },
  { city: 'Dubai', name: 'Burj Khalifa 124th Floor', type: 'City Tour', cost: 4500, desc: 'Non-prime hours entry ticket to At The Top.', img: 'https://images.unsplash.com/photo-1512453979798-5ea90b792d50' },
  { city: 'Phuket', name: 'Phi Phi Island by Big Boat', type: 'Cruise', cost: 3800, desc: 'Full day tour with lunch included.', img: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57' },

  // --- EUROPE ---
  { city: 'Paris', name: 'Eiffel Tower Summit Priority', type: 'City Tour', cost: 8500, desc: 'Skip-the-line access to the summit with host.', img: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce7859' },
  { city: 'Paris', name: 'Louvre Museum Guided Tour', type: 'City Tour', cost: 6200, desc: 'See the Mona Lisa and other masterpieces with an expert guide.', img: 'https://images.unsplash.com/photo-1499856871940-a09627c6d7db' },
  { city: 'Paris', name: 'Seine River Cruise', type: 'Cruise', cost: 1500, desc: '1-hour illumination cruise along the Seine.', img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' },
  { city: 'London', name: 'London Eye Standard Ticket', type: 'City Tour', cost: 3800, desc: 'Panoramic views of London from the cantilevered wheel.', img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad' },
  { city: 'London', name: 'Madame Tussauds London', type: 'Theme Park', cost: 4200, desc: 'Famous wax museum entrance ticket.', img: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9' },
  { city: 'Zurich', name: 'Mt. Titlis Day Tour', type: 'Adventure', cost: 14500, desc: 'Eternal snow and glaciers. Includes rotating cable car ride.', img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077' },
  { city: 'Lucerne', name: 'Mt. Pilatus Golden Round Trip', type: 'Adventure', cost: 11000, desc: 'Boat, cogwheel railway, and cable car experience.', img: 'https://images.unsplash.com/photo-1578328652230-0585f1c9c4c7' },
  { city: 'Rome', name: 'Colosseum & Roman Forum', type: 'City Tour', cost: 6500, desc: 'Skip-the-line walking tour of ancient Rome.', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5' },
  { city: 'Venice', name: 'Gondola Ride (Shared)', type: 'Cruise', cost: 3500, desc: 'Classic 30-minute gondola ride through the canals.', img: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0' },
  { city: 'Barcelona', name: 'Sagrada Familia Fast Track', type: 'City Tour', cost: 4200, desc: 'Entry to Gaudi\'s unfinished masterpiece.', img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded' },
  { city: 'Amsterdam', name: 'Heineken Experience', type: 'City Tour', cost: 2800, desc: 'Interactive tour through the historic brewery.', img: 'https://images.unsplash.com/photo-1582236873916-04285b5b2938' },
  { city: 'Istanbul', name: 'Bosphorus Dinner Cruise', type: 'Cruise', cost: 4500, desc: 'Evening cruise with dinner, unlimited drinks and show.', img: 'https://images.unsplash.com/photo-1527838832700-50592524d78c' },
  { city: 'Cappadocia', name: 'Hot Air Balloon Ride', type: 'Adventure', cost: 22000, desc: 'Sunrise balloon flight over fairy chimneys.', img: 'https://images.unsplash.com/photo-1565619543799-a417537b0373' },

  // --- ASIA EXTENDED ---
  { city: 'Bali', name: 'Uluwatu Sunset & Kecak Dance', type: 'Show', cost: 2500, desc: 'Temple tour followed by traditional fire dance at sunset.', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4' },
  { city: 'Bali', name: 'Nusa Penida Day Trip', type: 'Adventure', cost: 5500, desc: 'West island tour including Kelingking Beach and Broken Beach.', img: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1' },
  { city: 'Hanoi', name: 'Ha Long Bay Day Cruise', type: 'Cruise', cost: 5200, desc: 'Full day cruise with lunch, kayaking, and cave visits.', img: 'https://images.unsplash.com/photo-1528127269322-539801943592' },
  { city: 'Kuala Lumpur', name: 'Petronas Twin Towers', type: 'City Tour', cost: 2800, desc: 'Observation deck and skybridge access.', img: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07' },
  { city: 'Tokyo', name: 'Tokyo Skytree Admission', type: 'City Tour', cost: 2400, desc: 'Views from the tallest tower in Japan.', img: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc' },
  { city: 'Tokyo', name: 'TeamLab Planets', type: 'Show', cost: 3200, desc: 'Immersive digital art museum experience.', img: 'https://images.unsplash.com/photo-1570459027562-4a916cc6113f' },
  { city: 'Colombo', name: 'Colombo City Tour', type: 'City Tour', cost: 2200, desc: 'Shopping and sightseeing in the capital.', img: 'https://images.unsplash.com/photo-1578509422030-22c7104b2079' },

  // --- REST OF WORLD ---
  { city: 'New York', name: 'Statue of Liberty & Ellis Island', type: 'City Tour', cost: 3500, desc: 'Ferry access to both islands and museums.', img: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74' },
  { city: 'New York', name: 'Summit One Vanderbilt', type: 'City Tour', cost: 4800, desc: 'Immersive observation deck experience.', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9' },
  { city: 'Las Vegas', name: 'Grand Canyon West Rim Bus Tour', type: 'Adventure', cost: 12000, desc: 'Day trip to Grand Canyon with Skywalk option.', img: 'https://images.unsplash.com/photo-1491466424936-e304919aada7' },
  { city: 'Sydney', name: 'Sydney Opera House Tour', type: 'City Tour', cost: 2800, desc: 'Behind the scenes at the iconic venue.', img: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9' },
  { city: 'Sydney', name: 'Blue Mountains Day Trip', type: 'Adventure', cost: 9500, desc: 'Scenic world rides and wildlife park visit.', img: 'https://images.unsplash.com/photo-1624823183404-583b28b7463f' },
  { city: 'Cairo', name: 'Pyramids of Giza & Sphinx', type: 'City Tour', cost: 5500, desc: 'Private tour to the Great Pyramids.', img: 'https://images.unsplash.com/photo-1539650116455-25111b8b809a' },
  { city: 'Cape Town', name: 'Table Mountain & City Tour', type: 'City Tour', cost: 6000, desc: 'Cable car ride and city orientation.', img: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99' },
];

const TRANSFERS_DATA = [
  // ... Previous India/Dubai/Thai items ...
  { city: 'Dubai', name: 'DXB Airport to City Hotel', type: 'PVT', vehicle: 'Sienna/Previa', pax: 6, cost: 2800, desc: 'Private van transfer.', img: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7' },
  
  // --- EUROPE TRANSFERS ---
  { city: 'Paris', name: 'CDG Airport to Paris Hotel', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 6500, desc: 'Private transfer from Charles de Gaulle.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2' },
  { city: 'Paris', name: 'CDG Airport to Paris Hotel', type: 'PVT', vehicle: 'Van', pax: 7, cost: 8500, desc: 'Group transfer for families.', img: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7' },
  { city: 'London', name: 'Heathrow to Central London', type: 'PVT', vehicle: 'Executive Sedan', pax: 3, cost: 8500, desc: 'Meet & Greet at LHR.', img: 'https://images.unsplash.com/photo-1566275529824-cca4d0093727' },
  { city: 'Zurich', name: 'Zurich Airport to City', type: 'PVT', vehicle: 'Mercedes E Class', pax: 3, cost: 9800, desc: 'Luxury arrival transfer.', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d' },
  { city: 'Rome', name: 'FCO Airport to Rome City', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 5200, desc: 'Private transfer from Fiumicino.', img: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c' },
  { city: 'Venice', name: 'VCE Airport to Piazzale Roma', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 4800, desc: 'Land transfer to Venice gateway.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2' },
  { city: 'Venice', name: 'VCE Airport to Hotel (Water Taxi)', type: 'PVT', vehicle: 'Private Boat', pax: 4, cost: 14000, desc: 'Direct water taxi to hotel dock.', img: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0' },
  { city: 'Barcelona', name: 'BCN Airport to Hotel', type: 'PVT', vehicle: 'Standard Van', pax: 6, cost: 6800, desc: 'Group arrival transfer.', img: 'https://images.unsplash.com/photo-1562887189-e5d07068537b' },
  { city: 'Amsterdam', name: 'AMS Airport to City Centre', type: 'PVT', vehicle: 'Tesla Sedan', pax: 3, cost: 5500, desc: 'Eco-friendly private transfer.', img: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89' },
  { city: 'Istanbul', name: 'IST Airport to Sultanahmet', type: 'PVT', vehicle: 'Mercedes Vito', pax: 5, cost: 4200, desc: 'Comfortable van for small groups.', img: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7' },
  
  // --- ASIA TRANSFERS ---
  { city: 'Bali', name: 'Denpasar Airport to Kuta/Seminyak', type: 'PVT', vehicle: 'MPV', pax: 4, cost: 1800, desc: 'Private car with driver.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2' },
  { city: 'Bali', name: 'Denpasar Airport to Ubud', type: 'PVT', vehicle: 'MPV', pax: 4, cost: 2500, desc: 'Private car with driver.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2' },
  { city: 'Hanoi', name: 'Noi Bai Airport to Old Quarter', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 1800, desc: 'Arrival transfer.', img: 'https://images.unsplash.com/photo-1550133730-695473e544be' },
  { city: 'Kuala Lumpur', name: 'KLIA to City Centre', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 2200, desc: 'Standard private transfer.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2' },
  { city: 'Tokyo', name: 'Narita Airport to Tokyo City', type: 'SIC', vehicle: 'Limousine Bus', pax: 1, cost: 2800, desc: 'Shared airport shuttle ticket.', img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e' },
  { city: 'Tokyo', name: 'Haneda Airport to Tokyo City', type: 'PVT', vehicle: 'Alphard', pax: 5, cost: 12500, desc: 'Luxury MPV transfer.', img: 'https://images.unsplash.com/photo-1633511090164-b43840ea1607' },
  { city: 'Colombo', name: 'CMB Airport to Colombo Hotel', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 2600, desc: 'Private arrival transfer.', img: 'https://images.unsplash.com/photo-1550133730-695473e544be' },

  // --- REST OF WORLD TRANSFERS ---
  { city: 'New York', name: 'JFK to Manhattan', type: 'PVT', vehicle: 'SUV', pax: 5, cost: 11000, desc: 'Luxury SUV transfer.', img: 'https://images.unsplash.com/photo-1633511090164-b43840ea1607' },
  { city: 'Las Vegas', name: 'LAS Airport to Strip', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 5500, desc: 'Private arrival transfer.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2' },
  { city: 'Sydney', name: 'SYD Airport to CBD', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 6500, desc: 'Private arrival transfer.', img: 'https://images.unsplash.com/photo-1550133730-695473e544be' },
  { city: 'Cairo', name: 'Cairo Airport to Hotel', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 3200, desc: 'Meet and assist.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2' },
  { city: 'Cape Town', name: 'CPT Airport to City Bowl', type: 'PVT', vehicle: 'Sedan', pax: 3, cost: 3500, desc: 'Private transfer.', img: 'https://images.unsplash.com/photo-1550133730-695473e544be' },
];

export const seedInternationalInventory = async () => {
    console.log("🌍 Starting Global Inventory Seed...");
    let addedDests = 0;
    let updatedActivities = 0;
    let updatedTransfers = 0;

    // 1. Get Existing Destinations
    const existingDestinations = await adminService.getDestinations();
    const destMap: Record<string, string> = {}; // Name -> ID

    existingDestinations.forEach(d => {
        destMap[d.city] = d.id;
    });

    // 2. Add Missing Destinations
    for (const d of DESTINATIONS_DATA) {
        if (!destMap[d.city]) {
            const newDest: Destination = {
                id: '', // Service generates ID
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

    // Refresh Map after adds
    if (addedDests > 0) {
        const refreshed = await adminService.getDestinations();
        refreshed.forEach(d => destMap[d.city] = d.id);
    }

    // 3. Upsert Activities
    const existingActivities = await adminService.getActivities();
    
    for (const a of ACTIVITIES_DATA) {
        const destId = destMap[a.city];
        if (!destId) continue; 

        // Check duplicates by name
        const existingItem = existingActivities.find(ea => ea.activityName === a.name && ea.destinationId === destId);
        
        const activityPayload: Activity = {
            id: existingItem ? existingItem.id : '',
            activityName: a.name,
            destinationId: destId,
            activityType: a.type as any,
            costAdult: a.cost,
            costChild: Math.round(a.cost * 0.75), // Child cost 75%
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
            startTime: '09:00 AM'
        };
        await adminService.saveActivity(activityPayload);
        updatedActivities++;
    }

    // 4. Upsert Transfers
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
            imageUrl: t.img,
            season: 'All Year',
            validFrom: new Date().toISOString().split('T')[0],
            validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
            meetingPoint: 'Arrival Hall / Hotel Lobby'
        };
        await adminService.saveTransfer(transferPayload);
        updatedTransfers++;
    }

    alert(`Inventory Updated!\nAdded/Updated:\n- ${addedDests} Global Destinations\n- ${updatedActivities} Sightseeing\n- ${updatedTransfers} Transfers`);
    window.location.reload();
};
