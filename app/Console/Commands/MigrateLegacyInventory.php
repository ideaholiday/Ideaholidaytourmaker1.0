<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\Admin\InventoryManagementService;
use App\Models\Admin;
use Illuminate\Support\Facades\DB;

class MigrateLegacyInventory extends Command
{
    protected $signature = 'migration:inventory {source_db}';
    protected $description = 'Import legacy inventory into new versioned structure';

    public function handle(InventoryManagementService $service)
    {
        $sourceDb = $this->argument('source_db');
        $this->info("Starting Migration from {$sourceDb}...");

        $systemAdmin = Admin::firstOrCreate(
            ['email' => 'system@migration.internal'],
            ['name' => 'System Migration', 'password' => bcrypt(str_random(16)), 'role' => 'SUPER_ADMIN']
        );

        // 1. Fetch Legacy Data (Mock Query)
        // $legacyItems = DB::connection($sourceDb)->table('old_hotels')->get();
        
        // Mocking for architecture demo
        $legacyItems = [
            ['id' => 101, 'name' => 'Legacy Hotel A', 'cost' => 100, 'currency' => 'USD', 'city' => 'Dubai']
        ];

        $bar = $this->output->createProgressBar(count($legacyItems));

        foreach ($legacyItems as $item) {
            try {
                // Adapt Legacy Structure to New Structure
                $payload = [
                    'supplier_id' => $this->resolveSupplier($item['id']), // Helper to map supplier
                    'type' => 'HOTEL',
                    'name' => $item['name'],
                    'net_cost' => $item['cost'],
                    'currency' => $item['currency'],
                    'description' => "Migrated from Legacy System ID: {$item['id']}",
                    'meta_data' => ['legacy_id' => $item['id']]
                ];

                // Use Service to ensure Version 1 is created correctly
                $service->createProduct($payload, $systemAdmin);
                
                // Mark Shell as Legacy
                // Product::latest()->first()->update(['is_legacy' => true]);

            } catch (\Exception $e) {
                $this->error("Failed to migrate Item {$item['id']}: " . $e->getMessage());
            }
            $bar->advance();
        }

        $bar->finish();
        $this->info("\nMigration Complete.");
    }

    private function resolveSupplier($legacyId)
    {
        // Logic to find or create supplier user based on legacy data
        return \App\Models\User::where('role', 'SUPPLIER')->first()->id; 
    }
}
