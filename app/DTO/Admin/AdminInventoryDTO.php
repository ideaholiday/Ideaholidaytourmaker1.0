
<?php

namespace App\DTO\Admin;

use App\Models\OperatorInventoryVersion;

class AdminInventoryDTO
{
    public static function from(OperatorInventoryVersion $v): array
    {
        return [
            'id' => $v->id,
            'logical_id' => $v->inventory_id,
            'version' => $v->version,
            'type' => $v->type,
            'name' => $v->name,
            'description' => $v->description,
            'inclusions' => $v->inclusions,
            'exclusions' => $v->exclusions,
            'notes' => $v->notes,
            'base_cost' => $v->base_cost,
            'currency' => $v->currency,
            'status' => $v->status->value,
            'is_current' => $v->is_current,
            'approved_at' => $v->approved_at,
            'created_by' => $v->created_by,
            'operator_name' => $v->inventory->operator->name ?? 'Unknown',
        ];
    }
}
