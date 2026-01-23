
<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\OperatorInventoryItem;
use App\Models\OperatorInventoryVersion;
use App\Models\User;
use App\Enums\OperatorInventoryStatus;

class OperatorInventoryAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * DATA LEAK REGRESSION TEST
     * Ensure Agents never receive the 'base_cost' field in API responses.
     */
    public function test_agent_cannot_see_inventory_cost()
    {
        $this->loginAs('agent');

        // Create approved inventory
        $inventory = OperatorInventoryItem::factory()->create([
            'status' => OperatorInventoryStatus::APPROVED
        ]);
        
        OperatorInventoryVersion::factory()->create([
            'inventory_id' => $inventory->id,
            'is_current' => true,
            'status' => OperatorInventoryStatus::APPROVED,
            'base_cost' => 1000.00, // Sensitive Data
            'currency' => 'USD'
        ]);

        // Access search endpoint
        $response = $this->getJson('/api/v1/builder/inventory/search?type=' . $inventory->type);

        $response->assertOk();
        
        // Assert structure exists but sensitive key is missing
        $response->assertJsonStructure(['data' => [['id', 'name']]]);
        $response->assertJsonMissing(['base_cost']);
        $response->assertJsonMissing(['net_cost']);
        $response->assertJsonMissing(['1000.00']);
    }

    /**
     * MALICIOUS USER ATTACK SIMULATION
     * Operator attempts to approve their own inventory.
     */
    public function test_operator_cannot_approve_inventory()
    {
        $operator = $this->loginAs('operator');

        $item = OperatorInventoryItem::factory()->create([
            'supplier_id' => $operator->id,
            'status' => OperatorInventoryStatus::SUBMITTED
        ]);

        // Attempt approval via Admin endpoint
        $response = $this->postJson("/api/v1/admin/inventory/{$item->id}/approve");

        $response->assertForbidden(); // Should be 403
    }

    public function test_admin_can_approve_inventory()
    {
        $this->loginAs('admin');

        $item = OperatorInventoryItem::factory()->create([
            'status' => OperatorInventoryStatus::SUBMITTED
        ]);

        $response = $this->postJson("/api/v1/admin/inventory/{$item->id}/approve");

        $response->assertOk();
        $this->assertEquals(OperatorInventoryStatus::APPROVED->value, $item->refresh()->status);
    }
}
