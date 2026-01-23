
<?php

namespace App\Services\Pricing;

use App\Models\Itinerary;
use App\Services\Currency\CurrencyConverter;
use Carbon\Carbon;

class PricingEngine
{
    public function __construct(
        protected CurrencyConverter $converter
    ) {}

    /**
     * Calculate price for an itinerary (NO SAVE)
     */
    public function calculateForItinerary(Itinerary $itinerary): object
    {
        $rateTimestamp = Carbon::now();
        $baseTotal = 0;
        $baseCurrency = config('pricing.base_currency', 'USD');

        // 1. Sum Supplier Net Costs
        foreach ($itinerary->services as $service) {
            // Logic: Cost = Unit Cost * Quantity
            // Note: For Hotels, supplier_net in ItineraryService is already (Rate * Nights). Quantity is Rooms.
            // For others, supplier_net is Unit Cost. Quantity is count.
            
            $lineTotalSupplier = $service->supplier_net * $service->quantity;

            $baseTotal += $this->converter->convert(
                $lineTotalSupplier,
                $service->supplier_currency,
                $baseCurrency,
                $rateTimestamp
            );
        }

        // 2. Apply Margins & Tax
        $systemMarginPercent = config('pricing.system_margin', 0.10); // 10%
        $taxPercent = config('pricing.tax_percent', 0.05); // 5%

        $systemMarginAmount = $baseTotal * $systemMarginPercent;
        
        // Base Cost for Agent (B2B Price)
        $agentNetBase = $baseTotal + $systemMarginAmount;

        // Agent Markup (Dynamic)
        $agentMarkupPercent = $this->getAgentMarkupPercent($itinerary);
        $agentMarkupAmount = $agentNetBase * $agentMarkupPercent;

        // Subtotal
        $subtotal = $agentNetBase + $agentMarkupAmount;

        // Tax
        $taxAmount = $subtotal * $taxPercent;

        // Final Selling Price in Base Currency
        $finalBase = $subtotal + $taxAmount;

        // 3. Convert to Display Currency
        $displayCurrency = $itinerary->display_currency ?? 'USD';
        
        $displayTotal = $this->converter->convert(
            $finalBase,
            $baseCurrency,
            $displayCurrency,
            $rateTimestamp
        );

        return (object) [
            'base_total'    => round($baseTotal, 2),
            'display_total' => round($displayTotal, 2),
            'currency'      => $displayCurrency,
            'rate_timestamp'=> $rateTimestamp,
            'breakdown'     => [
                'supplier_base' => $baseTotal,
                'system_margin' => $systemMarginAmount,
                'agent_markup'  => $agentMarkupAmount,
                'tax'           => $taxAmount
            ]
        ];
    }

    protected function getAgentMarkupPercent(Itinerary $itinerary): float
    {
        // Future: Fetch from Agent Profile settings
        return 0.10; // Default 10%
    }
}
