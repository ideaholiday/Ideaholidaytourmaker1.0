
<?php

namespace App\Services\Itinerary;

use App\Models\User;
use App\Models\Product;
use App\Services\Currency\CurrencyConverter;
use Illuminate\Support\Facades\DB;

class BuilderPricingService
{
    protected $converter;

    public function __construct(CurrencyConverter $converter)
    {
        $this->converter = $converter;
    }

    /**
     * Calculates price by strictly looking up Inventory IDs.
     * Respects requested currency or defaults to INR.
     */
    public function calculate(User $agent, array $daysPayload, int $paxCount, ?string $requestedCurrency = null, ?float $markupPercent = null)
    {
        $baseCurrency = config('pricing.base_currency', 'USD');
        
        // Prioritize requested currency, then agent config, then system default (INR for this tenant)
        $displayCurrency = $requestedCurrency 
            ?? $agent->branding_config['currency'] 
            ?? 'INR';
        
        $totalSupplierNetBase = 0;
        $lineItems = [];

        foreach ($daysPayload as $day) {
            if (empty($day['services'])) continue;

            foreach ($day['services'] as $svc) {
                // 1. RESOLVE INVENTORY COST
                $costData = $this->resolveServiceCost($svc);
                
                $unitCost = $costData['cost'];
                $supplierCurrency = $costData['currency'];
                
                $qty = (float)($svc['quantity'] ?? 1); 
                $duration = (float)($svc['nights'] ?? 1); // For Hotels

                // Calculate Total for Line Item
                $lineTotalSupplier = $unitCost * $qty * $duration;

                // 2. NORMALIZE TO BASE CURRENCY
                $lineTotalBase = $this->converter->convert(
                    $lineTotalSupplier,
                    $supplierCurrency,
                    $baseCurrency
                );

                $totalSupplierNetBase += $lineTotalBase;

                // Calculate Line Item Selling Price (for display estimation only)
                // Default estimation used for UI line items
                $lineItemSellingBase = $lineTotalBase * 1.15; 
                $lineItemSellingDisplay = $this->converter->convert($lineItemSellingBase, $baseCurrency, $displayCurrency);

                $lineItems[] = [
                    'temp_id' => $svc['id'] ?? null,
                    'name' => $costData['name'],
                    'selling_price' => round($lineItemSellingDisplay, 2),
                    'currency' => $displayCurrency
                ];
            }
        }

        // 3. APPLY MARGINS (Backend Rules)
        $systemMarginPercent = config('pricing.system_margin', 0.10) * 100; // 10%
        $systemMargin = $totalSupplierNetBase * ($systemMarginPercent / 100);
        
        // B2B Cost (Agent's Buying Price)
        $agentNetBase = $totalSupplierNetBase + $systemMargin;

        // Dynamic Agent Markup
        // Use passed override or default from profile
        $finalMarkupPercent = $markupPercent ?? ($agent->branding_config['default_markup'] ?? 10);
        $agentMarkup = $agentNetBase * ($finalMarkupPercent / 100);

        // Subtotal before Tax
        $subtotalBase = $agentNetBase + $agentMarkup;

        // GST/Tax
        $taxPercent = config('pricing.tax_percent', 0.05) * 100; // 5%
        $taxAmount = $subtotalBase * ($taxPercent / 100);

        $finalSellingPriceBase = $subtotalBase + $taxAmount;

        // 4. CONVERT TO DISPLAY CURRENCY
        $finalPrice = $this->converter->convert($finalSellingPriceBase, $baseCurrency, $displayCurrency);
        $agentNetDisplay = $this->converter->convert($agentNetBase, $baseCurrency, $displayCurrency);

        return [
            'currency' => $displayCurrency,
            'net_cost' => round($agentNetDisplay, 2), // B2B Price (Agent Buy)
            'selling_price' => round($finalPrice, 2), // Client Price (Agent Sell)
            'line_items' => $lineItems,
            'breakdown' => [
                'supplier_base' => $totalSupplierNetBase,
                'margin_base' => $systemMargin,
                'markup_base' => $agentMarkup,
                'tax_base' => $taxAmount
            ]
        ];
    }

    private function resolveServiceCost(array $serviceData): array
    {
        // 1. Custom Service (Frontend sends 'type': 'CUSTOM')
        if (($serviceData['type'] ?? '') === 'CUSTOM') {
            return [
                'cost' => $serviceData['cost'] ?? 0, 
                'currency' => $serviceData['currency'] ?? 'INR',
                'name' => $serviceData['name'] ?? 'Custom Service'
            ];
        }

        // 2. Database Lookup using Inventory ID
        if (!empty($serviceData['inventory_id'])) {
            $product = Product::with('currentVersion')->find($serviceData['inventory_id']);
            if ($product && $product->currentVersion) {
                return [
                    'cost' => $product->currentVersion->net_cost,
                    'currency' => $product->currentVersion->currency,
                    'name' => $product->currentVersion->name
                ];
            }
        }

        // 3. Fallback for Manual Items pretending to be System items (legacy)
        if (isset($serviceData['cost'])) {
            return [
                'cost' => $serviceData['cost'],
                'currency' => $serviceData['currency'] ?? 'INR',
                'name' => $serviceData['name'] ?? 'Service'
            ];
        }

        return ['cost' => 0, 'currency' => 'INR', 'name' => 'Unknown Service'];
    }
}
