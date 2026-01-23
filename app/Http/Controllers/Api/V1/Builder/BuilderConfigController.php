<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
// use App\Models\Country; // Assuming models exist or mocked

class BuilderConfigController extends Controller
{
    public function index()
    {
        // Mock data for architecture demonstration
        // In production, these would be fetched from DB/Cache
        return response()->json([
            'countries' => [
                ['id' => 'c1', 'name' => 'Thailand', 'cities' => [['id' => 'd2', 'name' => 'Phuket'], ['id' => 'd3', 'name' => 'Bangkok']]],
                ['id' => 'c2', 'name' => 'UAE', 'cities' => [['id' => 'd1', 'name' => 'Dubai']]],
            ],
            'inventory_types' => ['hotel', 'sightseeing', 'transfer'],
            'allowed_currencies' => ['INR', 'USD', 'AED'],
            'ui_rules' => [
                'manual_hotel_requires_operator' => true,
                'min_pax_count' => 1,
            ],
            // NOTE: Rates and Margins are NOT sent to frontend
        ]);
    }
}
