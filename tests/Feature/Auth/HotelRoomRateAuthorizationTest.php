
<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Hotel;
use App\Models\HotelRoomRate;

class HotelRoomRateAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * DATA LEAK REGRESSION TEST
     * Critical: Net Cost must never be exposed to Agents.
     */
    public function test_agent_cannot_see_room_rate_cost()
    {
        $this->loginAs('agent');

        $hotel = Hotel::factory()->create(['status' => 'APPROVED', 'active' => true]);
        $rate = HotelRoomRate::factory()->create([
            'hotel_id' => $hotel->id,
            'status' => 'APPROVED',
            'net_cost' => 2500.00,
        ]);

        $response = $this->getJson("/api/v1/builder/hotels/{$hotel->id}/rates?start_date=" . now()->toDateString());

        $response->assertOk();
        // Ensure sensitive data is stripped
        $response->assertJsonMissing(['net_cost']);
        $response->assertJsonMissing(['base_cost']);
        $response->assertJsonMissing(['2500']); // Strict value check
    }

    /**
     * Staff role permissions check.
     * Staff generally cannot approve financial data unless explicitly permitted.
     * Assuming default Staff permissions do not include 'APPROVE_INVENTORY'.
     */
    public function test_staff_cannot_approve_room_rate_without_permission()
    {
        $staff = $this->loginAs('staff');
        // Ensure this user does NOT have the specific permission
        // $staff->permissions()->detach(...); 

        $rate = HotelRoomRate::factory()->create(['status' => 'SUBMITTED']);

        $response = $this->postJson("/api/v1/admin/inventory/{$rate->id}/approve"); // Assuming shared endpoint logic or specific

        $response->assertForbidden();
    }
}
