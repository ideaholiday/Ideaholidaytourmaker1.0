<?php

namespace App\Services\Currency;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class CurrencyConverter
{
    /**
     * Converts an amount from one currency to another using exchange rates.
     */
    public function convert(float $amount, string $from, string $to, Carbon $timestamp = null): float
    {
        if ($from === $to) {
            return $amount;
        }

        $rates = $this->getRates();

        // Ensure rates exist
        if (!isset($rates[$from]) || !isset($rates[$to])) {
            throw new \Exception("Exchange rate not found for {$from} or {$to}");
        }

        // Logic: Convert FROM -> Base (USD) -> TO
        // Rate is 1 USD = X Currency
        // 100 EUR (Rate 0.92) -> USD = 100 / 0.92 = 108.69 USD
        // 108.69 USD -> INR (Rate 83.5) = 108.69 * 83.5 = 9075 INR

        $amountInBase = $amount / $rates[$from];
        $amountInTarget = $amountInBase * $rates[$to];

        return $amountInTarget;
    }

    /**
     * Fetches rates. In production, this would query a DB table or Redis cache.
     */
    protected function getRates(): array
    {
        return Cache::remember('exchange_rates', 3600, function () {
            // Mock Rates (Base: USD)
            return [
                'USD' => 1.0,
                'EUR' => 0.92,
                'GBP' => 0.79,
                'INR' => 83.50,
                'AED' => 3.67,
                'THB' => 36.50,
                'SGD' => 1.35,
            ];
        });
    }
}
