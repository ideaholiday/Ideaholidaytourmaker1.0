<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuoteResource extends JsonResource
{
    public function toArray(Request $request)
    {
        $user = $request->user();
        $isAgent = $user->role === 'AGENT';
        $isOperator = $user->role === 'OPERATOR';
        $isAdmin = in_array($user->role, ['ADMIN', 'STAFF']);

        return [
            'id' => $this->id,
            'ref_no' => $this->unique_ref_no,
            'status' => $this->status,
            
            // 1. Travel Details (Safe for everyone)
            'destination' => $this->destination,
            'travel_date' => $this->travel_date->format('Y-m-d'),
            'pax_count' => $this->pax_count,
            'service_details' => $this->service_details,
            
            // 2. Guest Info
            // Operators see Lead Name for placard/service, but maybe not full contact info
            'lead_guest' => $this->lead_guest_name, 

            // 3. Agent Info (THE WALL: Hide Agent real identity from Operator)
            'agent' => $this->when(!$isOperator, function() {
                return [
                    'id' => $this->agent->id,
                    'name' => $this->agent->name,
                    'company' => $this->agent->company_name,
                ];
            }),

            // 4. Financials (THE WALL: Complex logic)
            'currency' => $this->currency,
            
            // Net Cost: Visible to Admin, and Operator (ONLY if allowed)
            'net_cost' => $this->when(
                $isAdmin || ($isOperator && $this->is_net_cost_visible_to_operator), 
                $this->net_cost
            ),

            // Selling Price: Visible to Admin and Agent. NEVER Operator.
            'selling_price' => $this->when(
                $isAdmin || $isAgent,
                $this->selling_price
            ),

            // Operator Payable: The specific amount the operator gets (Fixed or Net)
            'operator_payable' => $this->when(
                $isOperator || $isAdmin,
                $this->operator_payable_amount
            ),

            // 5. Itinerary
            'itinerary' => $this->itinerary_snapshot, // Assuming normalized in real DB, simplified here
            
            'created_at' => $this->created_at,
        ];
    }
}
