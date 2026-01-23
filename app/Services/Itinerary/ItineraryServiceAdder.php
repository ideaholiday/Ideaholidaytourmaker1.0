<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Models\ItineraryService;
use App\Models\Product;
use App\Enums\InventoryStatus;

class ItineraryServiceAdder
{
    /**
     * Add an approved inventory item to an itinerary day.
     * This creates a SNAPSHOT of the current version's data.
     * Future changes to the inventory will NOT affect this itinerary service.
     */
    public function addFromInventory(
        Itinerary $itinerary,
        int $dayId,
        string $inventoryId
    ): void {
        if (!$itinerary->isEditable()) {
            throw new \Exception('Itinerary is locked or not editable.');
        }

        // 1. Fetch Inventory (MUST BE APPROVED)
        $product = Product::approved()
            ->with('currentVersion')
            ->where('id', $inventoryId)
            ->firstOrFail();

        $version = $product->currentVersion;
        if (!$version) {
            throw new \Exception('Inventory data integrity error: No active version found.');
        }

        // 2. Create Snapshot in ItineraryService
        // We copy cost, name, and description here.
        ItineraryService::create([
            'itinerary_id' => $itinerary->id,
            'day_id' => $dayId,

            // Source Link (For reference only)
            'inventory_id' => $product->id,
            'inventory_type' => $product->type,
            'supplier_id' => $product->supplier_id,

            // SNAPSHOT DATA (Immutable)
            'service_name' => $version->name,
            'description_snapshot' => $version->description,
            // We can also snapshot inclusions/exclusions into meta if needed
            'meta_data' => [
                'inclusions' => $version->inclusions,
                'exclusions' => $version->exclusions,
                'notes' => $version->important_notes,
                'source_version' => $version->version_number, // Audit trail
                'original_meta' => $version->meta_data
            ],

            // PRICING TRUTH (Hidden from Agent UI usually, but stored for calculation)
            'supplier_net' => $version->net_cost,
            'supplier_currency' => $version->currency,
            
            // Defaults
            'quantity' => 1,
            'duration_nights' => 1,
        ]);
    }
}
