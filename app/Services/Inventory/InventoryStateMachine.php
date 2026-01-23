<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\InventoryApprovalLog;
use App\Enums\InventoryStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryStateMachine
{
    /**
     * Transition a product to a new status.
     * 
     * @param Product $product
     * @param InventoryStatus $to
     * @param mixed $actor User model (Admin or Operator)
     * @param string|null $remarks
     * @return Product
     * @throws ValidationException
     */
    public function transition(
        Product $product,
        InventoryStatus $to,
        $actor,
        string $remarks = null
    ): Product {

        $from = InventoryStatus::from($product->status);

        // 1. Validate Transition
        if (!in_array($to, $from->canTransitionTo(), true)) {
            throw ValidationException::withMessages([
                'status' => "Invalid inventory transition: {$from->value} -> {$to->value}",
            ]);
        }

        // 2. Execute Transaction
        DB::transaction(function () use ($product, $from, $to, $actor, $remarks) {

            // Allow status update temporarily
            $product->allowStatusUpdate = true;

            // Prepare Update Data
            $updateData = ['status' => $to->value];

            // Handle Approval Metadata
            if ($to === InventoryStatus::APPROVED) {
                $updateData['approved_by'] = $actor->id;
                $updateData['approved_at'] = now();
                $updateData['rejection_reason'] = null;
            } elseif ($to === InventoryStatus::REJECTED) {
                $updateData['rejection_reason'] = $remarks;
            } elseif ($to === InventoryStatus::DRAFT) {
                // Reset approval info if going back to draft
                $updateData['approved_by'] = null;
                $updateData['approved_at'] = null;
            }

            $product->update($updateData);

            // Create Audit Log
            InventoryApprovalLog::create([
                'product_id' => $product->id,
                'from_status' => $from->value,
                'to_status' => $to->value,
                'actor_id' => $actor->id,
                'actor_role' => $actor->role->value ?? 'SYSTEM',
                'remarks' => $remarks,
                'created_at' => now(),
            ]);
        });

        return $product->refresh();
    }
}
