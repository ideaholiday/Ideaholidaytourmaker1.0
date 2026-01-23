<?php

return [
    'base_currency' => 'INR',

    // Default System Margins (used if not overridden by dynamic rules)
    'system_margin' => 0.10, // 10% Platform Fee on Supplier Net
    
    // Default Tax Rate (GST)
    'tax_percent' => 0.05,   // 5% GST

    'rounding' => [
        'mode' => PHP_ROUND_HALF_UP,
        'precision' => 2,
    ],

    'tax' => [
        'default_percent' => 5, 
    ],
];
