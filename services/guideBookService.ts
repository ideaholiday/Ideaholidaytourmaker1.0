
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
        title: 'Getting Started with Quick Quotes',
        category: 'Platform Guide',
        lastUpdated: '2023-11-01',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Creating Estimates in Seconds

The **Quick Quote** module allows you to generate professional estimates without selecting specific hotels or building a day-wise itinerary immediately.

**Steps:**
1. Navigate to **New Quote** > **Quick Quote**.
2. Select your destination and travel dates.
3. Choose a **Hotel Category** (e.g., 4 Star) and **Meal Plan**.
4. The system will automatically calculate an estimated price based on average rates for that season.

> **Tip:** Use "Quick Quote Templates" to load pre-configured packages for popular destinations like Dubai or Thailand instantly.
        `
    },
    {
        id: 'g5',
        title: 'Mastering the Smart Itinerary Builder',
        category: 'Platform Guide',
        lastUpdated: '2023-12-15',
        targetRoles: [UserRole.AGENT, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Build Complex Trips Like a Pro

The **Smart Builder** is our most powerful tool for creating detailed, day-by-day itineraries. It connects directly to live inventory for Hotels, Activities, and Transfers.

#### 1. Trip Basics & Route
*   **Single City:** Select a destination like "Dubai".
*   **Multi-City:** Select a country (e.g., "Thailand") and build a route (e.g., Phuket -> Krabi -> Bangkok).
*   **AI Optimization:** The system analyzes your route and suggests the most logical sequence to save travel time.

#### 2. Hotel Selection
*   **Partner Inventory:** Browse live rates from our contracted hotels. Filter by Star Rating or Meal Plan.
*   **Reference Mode:** If you have your own hotel arrangement, switch to "Reference Mode" to enter a manual cost that is excluded from our net calculation but included in the final quote.

#### 3. Day-by-Day Planning
*   **Auto-Suggestions:** The builder automatically inserts Airport Transfers on arrival/departure days.
*   **Adding Services:** Click **"Add Sightseeing"** or **"Add Transfer"** on any day.
*   **Custom Services:** Can't find an activity? Use the "Custom" tab to add unique experiences manually.

#### 4. Templates
*   **Save as Favorite:** Built a perfect honeymoon package? Save it as a template to reuse later with one click.
*   **System Templates:** Load pre-built "Best Sellers" to save time.
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
        id: 'g3',
        title: 'Privacy Wall & Operator Interactions',
        category: 'Policy',
        lastUpdated: '2023-09-20',
        targetRoles: [UserRole.AGENT, UserRole.OPERATOR, UserRole.ADMIN, UserRole.STAFF],
        content: `
### Protecting Your Business

Idea Holiday Tour Maker enforces a strict **Privacy Wall** to protect your business relationships.

**How it works:**
*   **Ground Operators** never see your Client's name or the Selling Price. They only see the operational itinerary and net cost (if you choose to reveal it).
*   **Clients** never see the Ground Operator or Idea Holiday branding. They only see your agency details.
*   **Chat System** automatically masks identities. Agents appear as "Platform" to Operators, and Operators appear as "Ground Team" to Agents.

This ensures your clients remain yours, and your suppliers remain strictly back-end partners.
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
