<?php

namespace Tests\Feature\Itinerary;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductVersion;
use App\Enums\InventoryStatus;

class CreateItineraryTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_thailand_exploration_itinerary_with_pricing()
    {
        $agent = $this->loginAs('AGENT');
        $operator = User::factory()->create(['role' => 'OPERATOR']);

        // 1. Setup Inventory (Hotel)
        $product = Product::create([
            'supplier_id' => $operator->id,
            'type' => 'HOTEL',
            'status' => InventoryStatus::APPROVED->value
        ]);
        
        $version = ProductVersion::create([
            'product_id' => $product->id,
            'version_number' => 1,
            'name' => 'Phuket Resort',
            'net_cost' => 5000.00, // 5000 INR
            'currency' => 'INR',
            'created_by_id' => $operator->id,
            'created_at' => now(),
        ]);
        $product->update(['current_version_id' => $version->id]);

        $payload = [
            'title' => 'Thailand Exploration',
            'destination' => 'Phuket, Thailand',
            'travel_date' => '2024-12-15',
            'pax' => 2,
            'currency' => 'INR',
            'days' => [
                [
                    'day_number' => 1,
                    'title' => 'Arrival',
                    'services' => [
                        [
                            'type' => 'HOTEL',
                            'name' => 'Phuket Resort',
                            'inventory_id' => $product->id,
                            'quantity' => 1, // 1 Room
                            'nights' => 3,
                        ]
                    ]
                ]
            ]
        ];

        $response = $this->postJson('/api/v1/builder/itineraries', $payload);

        $response->assertCreated();
        $response->assertJsonPath('title', 'Thailand Exploration');
        $response->assertJsonPath('display_currency', 'INR');
        
        // Assert Database Itinerary
        $this->assertDatabaseHas('itineraries', [
            'agent_id' => $agent->id,
            'title' => 'Thailand Exploration',
            'destination_summary' => 'Phuket, Thailand',
            'display_currency' => 'INR',
        ]);

        // Assert Services Created
        $this->assertDatabaseHas('itinerary_services', [
            'service_name' => 'Phuket Resort',
            'supplier_net' => 5000.00, // Should store the source cost
            'duration_nights' => 3
        ]);

        // Assert Pricing Calculated
        // 5000 * 3 nights = 15000 INR Base
        // System Margin (10%) = 1500
        // Agent Markup (10%) = 1650
        // Total ~= 18150 + Tax
        
        $itinerary = \App\Models\Itinerary::latest()->first();
        $snapshot = $itinerary->pricing_snapshot;
        
        $this->assertNotNull($snapshot);
        $this->assertGreaterThan(15000, $snapshot['display_total']);
        $this->assertEquals('INR', $itinerary->display_currency);
    }
}
