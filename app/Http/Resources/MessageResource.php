<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request)
    {
        $viewerRole = $request->user()->role;
        
        return [
            'id' => $this->id,
            'content' => $this->content,
            'timestamp' => $this->created_at,
            'is_system' => false,
            
            // Identity Masking Logic
            'sender_name' => $this->resolveDisplayName($viewerRole),
            'sender_role' => $this->resolveDisplayRole($viewerRole),
            'is_me' => $this->sender_id === $request->user()->id,
        ];
    }

    private function resolveDisplayName($viewerRole)
    {
        // If message is anonymous or strictly masked roles interacting
        if ($this->is_anonymous) return 'System User';

        // Operator viewing Agent message -> "Agent Reply"
        if ($viewerRole === 'OPERATOR' && $this->sender_role_snapshot === 'AGENT') {
            return 'Agent Reply';
        }

        // Agent viewing Operator message -> "Ground Team"
        if ($viewerRole === 'AGENT' && $this->sender_role_snapshot === 'OPERATOR') {
            return 'Ground Team';
        }

        // Default: Show Name
        return $this->sender->name;
    }

    private function resolveDisplayRole($viewerRole)
    {
        // Staff/Admin see real roles
        if (in_array($viewerRole, ['ADMIN', 'STAFF'])) {
            return $this->sender_role_snapshot;
        }
        
        // Mask specific roles if needed, otherwise return snapshot
        return $this->sender_role_snapshot;
    }
}
