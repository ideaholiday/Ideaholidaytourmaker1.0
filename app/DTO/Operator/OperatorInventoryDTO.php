
<?php

namespace App\DTO\Operator;

use App\Models\OperatorInventoryVersion;

class OperatorInventoryDTO
{
    public static function from(OperatorInventoryVersion $v): array
    {
        return [
            'id' => $v->id,
            'type' => $v->type,
            'name' => $v->name,
            'description' => $v->description,
            'base_cost' => $v->base_cost,
            'currency' => $v->currency,
            'status' => $v->status->value,
            'version' => $v->version,
            'rejection_reason' => $v->status === 'REJECTED' ? $v->inventory->rejection_reason : null,
        ];
    }
}
