
<?php

namespace App\DTO\Agent;

use App\Models\OperatorInventoryVersion;

class AgentInventoryDTO
{
    public static function from(OperatorInventoryVersion $v): array
    {
        return [
            'id' => $v->id,
            'type' => $v->type,
            'name' => $v->name,
            'description' => $v->description,
            'inclusions' => $v->inclusions,
            'exclusions' => $v->exclusions,
            'notes' => $v->notes,
            // Assuming relationship exists
            'city' => $v->city ? $v->city->name : null, 
        ];
    }
}
