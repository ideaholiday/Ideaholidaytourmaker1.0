<?php

namespace App\ValueObjects;

class PricingBreakdown
{
    public function __construct(
        public float $supplierNet,
        public float $systemMargin,
        public float $agentMarkup,
        public float $operatorAdjustment,
        public float $tax,
        public float $finalPrice
    ) {}
}
