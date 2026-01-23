<?php

return [
    'endpoint' => env('WHATSAPP_API_ENDPOINT', 'https://graph.facebook.com/v17.0/YOUR_PHONE_ID/messages'),
    'token' => env('WHATSAPP_API_TOKEN'),
    'sender' => env('WHATSAPP_SENDER_PHONE'), // The business phone number
    
    'templates' => [
        'quote_ready' => 'travel_quote_ready_v1',
        'booking_confirmed' => 'booking_confirmed_v1',
    ],
    
    'storage_disk' => env('WHATSAPP_STORAGE_DISK', 'public'), // Disk where PDFs are stored
];
