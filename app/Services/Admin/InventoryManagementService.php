<?php

namespace App\Services\Admin;

use App\Models\Product;
use App\Models\ProductVersion;
use App\Models\Admin;
use App\Models\User;
use App\Models\AdminAuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Enums\InventoryStatus;

class InventoryManagementService
{
    // ... createProduct remains same ...

    public function createProduct(array $data, User $operator)
    {
        return DB::transaction(function () use ($data, $operator) {
            $product = Product::create([
                'supplier_id' => $operator->id,
                'type' => $data['type'],
                'status' => InventoryStatus::DRAFT->value,
            ]);

            $version = $this->createVersion($product, $data, 1, $operator->id);
            $product->update(['current_version_id' => $version->id]);

            $this->logAudit($operator->id, 'Product', $product->id, 'CREATE_DRAFT', [], $data);

            return $product;
        });
    }

    public function updateProduct(Product $product, array $data, User $operator)
    {
        if ($product->supplier_id !== $operator->id) {
            throw new \Exception('Unauthorized: You can only edit your own inventory.');
        }

        return DB::transaction(function () use ($product, $data, $operator) {
            
            $product = Product::lockForUpdate()->find($product->id);
            $currentVersion = $product->currentVersion;
            
            $changes = $this->diff($currentVersion->toArray(), $data);
            if (empty($changes)) return $product;

            // Create Version N+1
            $newVersionNum = $currentVersion->version_number + 1;
            $version = $this->createVersion($product, $data, $newVersionNum, $operator->id);

            // Update Shell: Point to new version, reset to DRAFT
            // ENABLE FLAG TO BYPASS MODEL PROTECTION for this draft reset
            $product->allowStatusUpdate = true;
            
            $product->update([
                'current_version_id' => $version->id,
                'status' => InventoryStatus::DRAFT->value // Reset approval on edit
            ]);

            $this->logAudit($operator->id, 'Product', $product->id, 'UPDATE_VERSION', $currentVersion->toArray(), $data);

            return $product;
        });
    }

    // ... helper methods remain same ...
    private function createVersion(Product $product, array $data, int $versionNum, string $creatorId)
    {
        return ProductVersion::create([
            'id' => Str::uuid(),
            'product_id' => $product->id,
            'version_number' => $versionNum,
            'name' => $data['name'],
            'location_id' => $data['location_id'] ?? null,
            'description' => $data['description'] ?? null,
            'inclusions' => $data['inclusions'] ?? [],
            'exclusions' => $data['exclusions'] ?? [],
            'important_notes' => $data['important_notes'] ?? null,
            'net_cost' => $data['net_cost'],
            'currency' => $data['currency'],
            'meta_data' => $data['meta_data'] ?? [],
            'created_by_id' => $creatorId,
            'created_at' => now(),
        ]);
    }

    private function logAudit($userId, $type, $id, $action, $old, $new)
    {
        AdminAuditLog::create([
            'admin_id' => $userId,
            'entity_type' => $type,
            'entity_id' => $id,
            'action' => $action,
            'changes' => json_encode(['old' => $old, 'new' => $new]),
            'ip_address' => request()->ip(),
            'created_at' => now()
        ]);
    }

    private function diff($old, $new)
    {
        return array_diff_assoc($new, $old);
    }
}
