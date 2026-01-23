<?php

return [

    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        // --- ROLE ISOLATED GUARDS ---
        'admin' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
        'staff' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
        'agent' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
        'operator' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
        'supplier' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,

];
