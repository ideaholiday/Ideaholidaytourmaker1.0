
import { GuideBookEntry, UserRole } from '../types';

const GUIDES: GuideBookEntry[] = [
    // --- OPERATOR GUIDES ---
    {
        id: 'g-op-1',
        title: 'Managing Your Inventory & Rates',
        category: 'Inventory Management',
        lastUpdated: '2024-01-20',
        targetRoles: [UserRole.OPERATOR, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Overview
As a Ground Operator, you can manage the inventory (Hotels, Activities, Transfers) for your assigned destinations. These rates are used by the system to calculate quotes.

#### 1. Accessing Inventory
Navigate to your Dashboard sidebar. You will see sections for:
*   **Destinations:** View/Add cities you operate in.
*   **Hotels:** Manage contract rates for hotels.
*   **Sightseeing:** Add tours, tickets, and excursions.
*   **Transfers:** Configure vehicle fleets and transfer costs.

#### 2. Adding a Hotel Rate
1.  Go to **Hotels** > **Add Rate**.
2.  Select the **Destination** and **Hotel Name**.
3.  Enter the **Cost Price** (Net Rate payable to you).
    *   *Note:* Ensure you specify if the rate is per **Room** or per **Person**.
4.  Set the **Seasonality** (Peak/Off-Peak) and Validity dates.

#### 3. Managing Transfers
*   Define transfers as **Private (PVT)** or **Shared (SIC)**.
*   **Cost Basis:** 
    *   *Per Vehicle:* Fixed price for the car (e.g. Sedan = $30).
    *   *Per Person:* Price per seat (e.g. Bus = $10/pax).
*   **Night Surcharge:** Add any extra fees for late-night pickups (e.g. 10 PM - 6 AM).

#### 4. Import/Export
*   Use the **Export CSV** button to download your current inventory.
*   Use **Import CSV** to bulk upload multiple rates at once.
        `
    },
    {
        id: 'g-op-2',
        title: 'Service Execution Standards',
        category: 'Policy',
        lastUpdated: '2024-01-15',
        targetRoles: [UserRole.OPERATOR],
        content: `
### Quality Assurance Protocols

To maintain the "Idea Holiday" standard, please adhere to the following during service execution.

#### 1. Airport Pickups (Meet & Greet)
*   **Placard:** Always use a clean, printed placard with the **Guest Name**. Do NOT use handwritten paper.
*   **Timing:** Driver must be at the arrival hall 15 minutes before flight landing.
*   **Waiting:** Standard waiting time is 60 minutes after landing. Contact the Admin Dispatch team immediately if guest is delayed.

#### 2. Vehicle Standards
*   **Cleanliness:** Vehicles must be washed daily and interiors vacuumed.
*   **Amenities:** Provide 1 Water Bottle (500ml) per guest upon arrival.
*   **AC:** Air conditioning must be switched on 5 minutes before guest boarding.

#### 3. Driver Etiquette
*   **Attire:** Formal or Smart Casual. No slippers/shorts.
*   **Behavior:** Open doors for guests. Assist with luggage. No smoking in the vehicle.
*   **Privacy:** Do not discuss pricing or agent details with the guest.

> **Violation Policy:** Verified complaints regarding hygiene or rudeness may result in a penalty or suspension of assignments.
        `
    },
    // --- AGENT GUIDES ---
    {
        id: 'g1',
        title: 'Getting Started with Itinerary Builder',
        category: 'Platform Guide',
        lastUpdated: '2024-02-15',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### The Smart Builder Workflow

Create complex multi-city itineraries in minutes using our intelligent builder tools.

#### Step 1: Define Route & Basics
1.  Navigate to **Itinerary Builder** from your dashboard.
2.  Enter **Guest Details** (Lead Name, Travel Date, Adult/Child count).
3.  **Build Route:** Use the City Selector to add destinations (e.g., "Dubai" + "Abu Dhabi").
4.  Adjust **Nights** for each city using the +/- buttons.
5.  Click **Generate Itinerary** to create the day-wise skeleton.

#### Step 2: The Builder Interface
Once generated, you will see three main areas:
*   **Left Sidebar:** Drag & Drop days to reorder the sequence.
*   **Main Editor:** The detailed day-by-day plan where you add services.
*   **Top Header:** Real-time pricing (Net Cost vs Client Price) and Save controls.

#### Step 3: Adding Services
To build the quote, add services to specific days:
1.  Locate the Day card (e.g., "Day 1: Arrival").
2.  Click the small buttons: **+ Hotel**, **+ Activity**, or **+ Transfer**.
3.  A modal will open showing **Live Inventory** filtered for that city.
4.  **Select & Configure:**
    *   *Hotels:* Choose Room Type and Meal Plan.
    *   *Activities:* Choose between Ticket Only, Shared Transfer (SIC), or Private Transfer (PVT).
    *   *Transfers:* Select Vehicle Type and Capacity.
5.  Click **Add** to insert it into the day.
    *   *Note:* You can also use the **"Custom"** tab in the modal to add non-inventory items manually.

#### Step 4: Pricing & Markup
*   **Net Cost:** This is displayed in the top header (Visible ONLY to you). It is the sum of B2B rates.
*   **Markup Control:** Use the toggle in the header to enable/disable markup. Enter your desired percentage (Default is 10%).
*   **Client Price:** This updates automatically as you add services or change markup. This is the final price shown on the PDF.

#### Step 5: Finalize
1.  Review the itinerary flow.
2.  Click **Save Quote** in the top right.
3.  You will be redirected to the **Quote Detail** page where you can:
    *   Download PDF (Client Version).
    *   Share via WhatsApp.
    *   Copy a Public Link.
        `
    },
    {
        id: 'g5',
        title: 'Mastering the Smart Itinerary Builder',
        category: 'Platform Guide',
        lastUpdated: '2023-12-15',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Advanced Builder Features

#### 1. AI Route Optimization
When building your route in Step 1, the system analyzes connectivity. If a better route order exists (e.g., minimizing travel time), a **"Smart Route Available"** banner will appear. Click "Apply" to auto-sort your cities.

#### 2. Drag & Drop Reordering
Changed your mind about the flow? In the Builder view, simply **drag a Day** from the left sidebar and drop it into a new position. The day numbers will auto-update.

#### 3. Custom Items
Can't find a specific tour in our inventory?
1. Click **+ Activity**.
2. Select the **Custom** tab (Pen icon).
3. Enter the Name, Net Cost, and Description manually.
4. This allows you to add unique experiences while keeping the quote in one system.

#### 4. Cloning Days
If you have a leisure day that repeats (e.g., 3 days of beach relaxation):
1. Hover over the Day in the sidebar.
2. Click the **Duplicate (Copy)** icon.
3. A standardized copy of that day will be added to the end of the itinerary.
        `
    },
    {
        id: 'g11',
        title: 'Troubleshooting: Price Not Calculated',
        category: 'Platform Guide',
        lastUpdated: '2024-02-01',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Why is my Quote showing 0 Price?

If you see the **"Price not calculated"** warning banner on your Quote Detail page, it means the system cannot generate a valid selling price. This is usually due to one of the following reasons:

#### 1. Empty Itinerary
You may have created a quote shell but haven't added any services yet.
*   **Fix:** Click **Edit Itinerary** and add at least one Hotel, Transfer, or Activity.

#### 2. Missing Costs in Custom Items
If you added "Custom" services manually, you might have left the cost field as 0.
*   **Fix:** Open the builder, find the custom service, and ensure a valid **Net Cost** is entered.

#### 3. Unsaved Changes
You might have made changes in the builder but closed the window without clicking "Save".
*   **Fix:** Re-open the builder, verify your items, and click the **Save** button at the top right to trigger a price recalculation.

#### 4. Inventory Issues
Rarely, a linked system inventory item might have been deactivated by the admin.
*   **Fix:** Remove the item with the missing price and re-add it from the active list.
        `
    },
    {
        id: 'g6',
        title: 'Payments, Receipts & Credit Limits',
        category: 'Platform Guide',
        lastUpdated: '2023-12-10',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Managing Financials

#### Payment Workflow
1.  **Advance Payment:** A minimum booking deposit (usually 30%) is required to change a Quote status to **CONFIRMED**.
2.  **Balance Payment:** Must be cleared before travel dates to release vouchers.

#### Recording Payments
*   Go to **Booking Detail** -> **Payment Panel**.
*   Click **Record Manual Payment**.
*   Enter Amount and Mode (Bank Transfer / Cash / UPI).
*   Enter the Transaction Reference ID.

#### Credit Limit (Wallet)
*   Agents with approved credit limits can book instantly using the **"Credit Limit"** payment mode.
*   This deducts from your available balance. You must settle invoices monthly to restore your limit.

#### Downloads
*   **Receipts:** Generated instantly for every recorded payment.
*   **Tax Invoices:** Generated upon booking confirmation.
*   **Ledgers:** Request a full ledger statement from the "P&L Report" section.
        `
    },
    {
        id: 'g7',
        title: 'Sharing Quotes & Closing Deals',
        category: 'Sales Tips',
        lastUpdated: '2023-11-20',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Close Deals Faster with these Tools

#### 1. WhatsApp Summary
*   Use the **Share WhatsApp** button on any quote.
*   It generates a perfectly formatted text message with:
    *   Destination & Dates
    *   Hotel Summary
    *   Total Cost per person
    *   Booking Reference

#### 2. White-Label Client Link
*   Click **"Client Link"** to get a public URL.
*   **Privacy:** This link hides all "Idea Holiday" branding and shows **YOUR Agency Name, Logo, and Contact Info** (configure in Branding settings).
*   **Live Updates:** If you edit the quote, the client sees the changes instantly on the same link.

#### 3. PDF Proposals
*   Download clean, professional PDFs.
*   Includes detailed day-wise itinerary and inclusion lists.
*   Net costs are **never** shown on PDFs generated from the Agent panel.
        `
    },
    {
        id: 'g9',
        title: 'Common Mistakes & Troubleshooting',
        category: 'Platform Guide',
        lastUpdated: '2024-01-05',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN],
        content: `
### Avoid These Common Errors

#### 1. Night Mismatch
*   **Issue:** The number of nights in the "Trip Basics" does not match the hotel nights selected.
*   **Fix:** Ensure your hotel check-in/out dates cover the entire duration. The system will warn you if there is a gap.

#### 2. Pax Count in Transfers
*   **Issue:** Selecting a "Sedan (3 Pax)" for a group of 4.
*   **Fix:** The system calculates cost based on capacity. If you have 4 pax, you need 2 Sedans or 1 Van. Ensure you select the correct vehicle type in the Builder.

#### 3. Missing Flight Details
*   **Issue:** Booking confirmed but airport transfer missed because flight time wasn't provided.
*   **Fix:** Use the "Chat" feature in the Booking Detail page to send flight tickets to the Ops team immediately after confirmation.

#### 4. Payment Delays
*   **Issue:** Vouchers not released.
*   **Fix:** Vouchers are system-locked until 100% payment is received. Use the "Credit Limit" payment mode if you need instant voucher release and settle the invoice later.
        `
    },
    {
        id: 'g10',
        title: 'Support & Escalation Matrix',
        category: 'Policy',
        lastUpdated: '2024-01-01',
        targetRoles: [UserRole.AGENT, UserRole.OPERATOR],
        content: `
### We are here to help

**Working Hours:** Mon - Sat, 10:00 AM - 7:00 PM (IST)

#### Level 1: General Queries & Quotes
*   **Chat:** Use the in-app chat on any Quote/Booking page.
*   **Email:** info@ideaholiday.com
*   **Phone:** +91 9696 777 391

#### Level 2: Urgent Operational Issues (On-Trip)
*   **Emergency Line:** +91 9696 777 391 (24/7 for active travelers)
*   **WhatsApp:** Use the "Group Chat" link provided in the Booking Voucher.

#### Level 3: Accounts & Billing
*   **Email:** accounts@ideaholiday.com
*   **TAT:** 24-48 Working Hours for ledger reconciliation.
        `
    },
    {
        id: 'g2',
        title: 'How to Customize Your Branding',
        category: 'Platform Guide',
        lastUpdated: '2023-10-15',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Make the Platform Yours

You can white-label all client-facing documents (PDFs, Shared Links) with your own agency identity.

**Configuration:**
1. Go to **Dashboard** > **Branding**.
2. Upload your **Agency Logo** (PNG/JPG).
3. Set your **Primary Brand Color**.
4. Update your **Contact Information** and **Website**.

Once saved, all subsequent PDFs and the Client Portal will display your logo and colors instead of Idea Holiday's.
        `
    },
    {
        id: 'g4',
        title: 'Destination Guide: Dubai (UAE)',
        category: 'Destination Info',
        lastUpdated: '2023-12-01',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Selling Dubai Effectively

Dubai is a year-round destination, but knowing the nuances helps close deals.

**Key Selling Points:**
*   **Family Friendly:** Theme parks (Parks & Resorts), Waterparks (Atlantis, Wild Wadi).
*   **Shopping:** Dubai Mall, Mall of the Emirates.
*   **Adventure:** Desert Safari is a must-include.

**Visa Requirements:**
*   Standard tourist visa is 30 days.
*   Processing time: 2-3 working days.
*   Documents: Passport front/back + Photo.

**Best Time to Visit:**
*   **Peak:** November to March (Pleasant weather).
*   **Off-Peak:** June to August (Hot, but great hotel deals).
        `
    },
    {
        id: 'g8',
        title: 'Destination Guide: Thailand',
        category: 'Destination Info',
        lastUpdated: '2023-11-05',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### The Land of Smiles

**Popular Routes:**
1.  **Bangkok + Pattaya (5N):** Classic budget combo. City life + Nightlife/Beaches.
2.  **Phuket + Krabi (6N):** Best for couples/honeymooners. Island hopping, scenic bays.
3.  **Samui + Phangan:** Premium island experience.

**Visa Info:**
*   **Visa on Arrival:** Available for many nationalities (Subject to queue).
*   **E-Visa / Sticker:** Recommended to avoid airport hassle. Processing 4-5 days.

**Tips:**
*   Always include **Coral Island** with speedboat for Pattaya trips.
*   **Phi Phi Island** tour requires National Park fees (often payable in cash on spot, check inclusions).
        `
    }
];

class GuideBookService {
    
    getGuides(role?: UserRole): GuideBookEntry[] {
        if (!role) return GUIDES;
        return GUIDES.filter(g => !g.targetRoles || g.targetRoles.includes(role));
    }
    
    getGuide(id: string): GuideBookEntry | undefined {
        return GUIDES.find(g => g.id === id);
    }

    searchGuides(query: string, role?: UserRole): GuideBookEntry[] {
        const lower = query.toLowerCase();
        let list = GUIDES;
        
        if (role) {
            list = list.filter(g => !g.targetRoles || g.targetRoles.includes(role));
        }

        return list.filter(g => 
            g.title.toLowerCase().includes(lower) || 
            g.content.toLowerCase().includes(lower) ||
            g.category.toLowerCase().includes(lower)
        );
    }
}

export const guideBookService = new GuideBookService();
