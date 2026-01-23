<?php

namespace App\Services\Pricing;

use App\Models\PricingAuditLog;
use App\Models\User;

class PricingAuditLogger
{
    public function log(
        string $itineraryId,
        ?User $user,
        string $action,
        array $data
    ): void {
        PricingAuditLog::create([
            'itinerary_id' => $itineraryId,
            'user_id' => $user?->id,
            'role' => $user?->role ?? 'system',
            'action' => $action,

            'supplier_currency' => $data['supplier_currency'],
            'display_currency' => $data['display_currency'],
            'base_currency' => config('pricing.base_currency', 'USD'),

            'supplier_net' => $data['supplier_net'],
            'base_net' => $data['base_net'],

            'system_margin_percent' => $data['system_margin_percent'],
            'agent_markup_percent' => $data['agent_markup_percent'],
            'operator_override_percent' => $data['operator_override_percent'],
            'tax_percent' => $data['tax_percent'],

            'system_margin_amount' => $data['system_margin_amount'],
            'agent_markup_amount' => $data['agent_markup_amount'],
            'operator_adjustment_amount' => $data['operator_adjustment_amount'],
            'tax_amount' => $data['tax_amount'],

            'final_price' => $data['final_price'],
            'rate_timestamp' => $data['rate_timestamp'],
        ]);
    }
}
