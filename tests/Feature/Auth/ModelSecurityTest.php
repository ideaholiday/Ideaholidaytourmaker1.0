
<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\OperatorInventoryItem;
use App\Models\Itinerary;
use App\Enums\InventoryStatus;
use App\Enums\ItineraryStatus;

class ModelSecurityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * DIRECT ATTACK SIMULATION
     * Developer or Attacker tries to change status via `update()` bypassing the State Machine.
     */
    public function test_direct_inventory_status_update_is_blocked()
    {
        $item = OperatorInventoryItem::factory()->create([
            'status' => InventoryStatus::DRAFT->value
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Direct status update forbidden');

        // Direct update attempt
        $item->status = InventoryStatus::APPROVED->value;
        $item->save();
    }

    public function test_direct_itinerary_status_update_is_blocked()
    {
        $itinerary = Itinerary::factory()->create([
            'status' => ItineraryStatus::DRAFT
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Direct status update forbidden');

        // Direct update attempt
        $itinerary->status = ItineraryStatus::APPROVED;
        $itinerary->save();
    }
}
