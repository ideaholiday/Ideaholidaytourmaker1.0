
<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Itinerary;
use App\Enums\ItineraryStatus;

class ItineraryAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * MALICIOUS USER ATTACK SIMULATION
     * Agent tries to approve their own itinerary to bypass Operator review.
     */
    public function test_agent_cannot_approve_itinerary()
    {
        $agent = $this->loginAs('agent');

        $itinerary = Itinerary::factory()->create([
            'agent_id' => $agent->id,
            'status' => ItineraryStatus::SUBMITTED
        ]);

        $response = $this->postJson("/api/v1/builder/itineraries/{$itinerary->id}/approve");

        $response->assertForbidden();
    }

    /**
     * INTEGRITY TEST
     * Agent cannot edit an itinerary once it is Approved/Locked.
     */
    public function test_agent_cannot_edit_approved_itinerary()
    {
        $agent = $this->loginAs('agent');

        $itinerary = Itinerary::factory()->create([
            'agent_id' => $agent->id,
            'status' => ItineraryStatus::APPROVED
        ]);

        // Attempt update
        $response = $this->postJson("/api/v1/builder/itineraries", [
            'id' => $itinerary->id,
            'title' => 'Hacked Title',
            // ... required fields
            'destination_summary' => 'Hack',
            'travel_date' => now(),
            'days' => [],
            'pax' => 2
        ]);

        // Controller logic handles this by creating a clone (Version +1)
        // So the ORIGINAL ID should NOT be modified.
        
        $response->assertOk(); // It "succeeds" but...
        
        $json = $response->json();
        
        // Assert the returned ID is DIFFERENT (New Version)
        $this->assertNotEquals($itinerary->id, $json['id']);
        
        // Assert Original is still Approved and Unchanged
        $freshOriginal = $itinerary->refresh();
        $this->assertEquals(ItineraryStatus::APPROVED, $freshOriginal->status);
        $this->assertNotEquals('Hacked Title', $freshOriginal->title);
    }

    public function test_admin_can_approve_itinerary()
    {
        $this->loginAs('admin');

        $itinerary = Itinerary::factory()->create([
            'status' => ItineraryStatus::SUBMITTED
        ]);

        $response = $this->postJson("/api/v1/builder/itineraries/{$itinerary->id}/approve");

        $response->assertOk();
        $this->assertEquals(ItineraryStatus::APPROVED, $itinerary->refresh()->status);
    }
}
