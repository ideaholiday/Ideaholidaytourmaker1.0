
<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Hotel;
use App\Enums\HotelStatus;

class HotelAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * DATA LEAK REGRESSION TEST
     * Agents should not see the internal partner linkage ID.
     */
    public function test_agent_cannot_see_hotel_partner_id()
    {
        $this->loginAs('agent');

        $hotel = Hotel::factory()->create([
            'status' => 'APPROVED',
            'active' => true
        ]);

        // Search Hotels
        $response = $this->getJson("/api/v1/builder/hotels/search?city_id={$hotel->city_id}");

        $response->assertOk();
        $response->assertJsonMissing(['supplier_id']);
        $response->assertJsonMissing(['hotel_partner_id']);
    }

    /**
     * MALICIOUS USER ATTACK SIMULATION
     * Hotel Partner tries to force approve a hotel without Admin review.
     */
    public function test_hotel_partner_cannot_approve_hotel()
    {
        $partner = $this->loginAs('hotel_partner');

        $hotel = Hotel::factory()->create([
            'supplier_id' => $partner->id,
            'status' => 'SUBMITTED',
        ]);

        // Attempt to hit approval endpoint
        $response = $this->postJson("/api/v1/admin/hotels/{$hotel->id}/approve");

        $response->assertForbidden();
    }
}
