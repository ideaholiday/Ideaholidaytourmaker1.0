
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\OperatorInventoryItem;
use App\Models\OperatorInventoryVersion;
use App\Enums\OperatorInventoryStatus;
use Illuminate\Support\Facades\DB;

class MigrateOperatorInventory extends Command
{
    protected $signature = 'migrate:operator-inventory';
    protected $description = 'Migrate operator inventory to versioned model';

    public function handle()
    {
        $this->info('Starting Operator Inventory Migration...');

        DB::transaction(function () {
            OperatorInventoryItem::chunk(100, function ($items) {
                foreach ($items as $item) {
                    // Skip if already migrated
                    if ($item->current_version_id) {
                        continue;
                    }

                    $version = OperatorInventoryVersion::create([
                        'inventory_id' => $item->id,
                        'version' => 1,
                        'type' => $item->type,
                        'name' => $item->name,
                        'description' => $item->description,
                        'inclusions' => $item->inclusions,
                        'exclusions' => $item->exclusions,
                        'notes' => $item->notes,
                        'base_cost' => $item->base_cost,
                        'currency' => $item->currency,
                        'status' => OperatorInventoryStatus::APPROVED, // Assume legacy active items are approved
                        'is_current' => true,
                        'approved_at' => now(),
                        'created_by' => $item->created_by,
                        'created_at' => $item->created_at,
                    ]);

                    // Quietly update the parent to link to current version without triggering observers
                    $item->updateQuietly([
                        'current_version_id' => $version->id,
                    ]);
                }
            });
        });

        $this->info('Operator inventory migration completed successfully.');
    }
}
