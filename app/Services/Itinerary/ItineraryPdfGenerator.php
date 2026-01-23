
<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\View;

class ItineraryPdfGenerator
{
    /**
     * Generate and download the Itinerary PDF with Agent Branding.
     */
    public function download(Itinerary $itinerary)
    {
        // 1. Eager Load Data
        $itinerary->load(['days.services', 'agent', 'travellers']);
        
        // 2. Resolve Branding (Agent overrides Platform)
        $agent = $itinerary->agent;
        $branding = $this->resolveBranding($agent);
        
        // 3. Prepare View Data
        $data = [
            'itinerary' => $itinerary,
            'days' => $itinerary->days,
            'branding' => $branding,
            'pricing' => $itinerary->pricing_snapshot ?? [],
            'total' => $itinerary->pricing_snapshot['display_total'] ?? 0,
            'currency' => $itinerary->display_currency,
        ];

        // 4. Generate PDF
        // Assuming a standard Blade view exists at 'pdfs.itinerary'
        // In a real implementation, we would create this view file.
        $pdf = Pdf::loadView('pdfs.itinerary', $data);
        
        // Optional: Set Paper Size
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("Itinerary-{$itinerary->reference_code}.pdf");
    }

    /**
     * Extract branding configuration from Agent Profile.
     * Falls back to Agent's basic info if config is missing.
     */
    protected function resolveBranding(User $agent): array
    {
        $config = $agent->branding_config ?? [];

        return [
            'company_name' => $config['agencyName'] ?? $agent->company_name ?? $agent->name,
            'logo_url' => $config['logoUrl'] ?? null,
            'primary_color' => $config['primaryColor'] ?? '#0ea5e9', // Default Brand Blue
            'secondary_color' => $config['secondaryColor'] ?? '#0f172a',
            'phone' => $config['contactPhone'] ?? $agent->phone,
            'email' => $config['email'] ?? $agent->email,
            'website' => $config['website'] ?? null,
            'address' => $config['officeAddress'] ?? null,
        ];
    }
}
