<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Services\Inventory\InventoryStateMachine;
use App\Enums\InventoryStatus;
use Illuminate\Support\Facades\Auth;

class InventoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:admin'); 
    }

    /**
     * List items pending approval.
     */
    public function pending()
    {
        $this->authorizeRole(['SUPER_ADMIN', 'INVENTORY_ADMIN']);
        
        $products = Product::pendingApproval()
            ->with(['currentVersion', 'supplier'])
            ->paginate(20);

        return response()->json($products);
    }

    /**
     * Approve an item.
     */
    public function approve($id)
    {
        $this->authorizeRole(['SUPER_ADMIN', 'INVENTORY_ADMIN']);
        
        $product = Product::findOrFail($id);
        
        try {
            app(InventoryStateMachine::class)->transition(
                $product,
                InventoryStatus::APPROVED,
                Auth::user(),
                'Approved by Admin'
            );
            return response()->json(['message' => 'Inventory approved and live.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Reject an item.
     */
    public function reject(Request $request, $id)
    {
        $this->authorizeRole(['SUPER_ADMIN', 'INVENTORY_ADMIN']);
        
        $request->validate(['reason' => 'required|string']);
        $product = Product::findOrFail($id);

        try {
            app(InventoryStateMachine::class)->transition(
                $product,
                InventoryStatus::REJECTED,
                Auth::user(),
                $request->reason
            );
            return response()->json(['message' => 'Inventory rejected.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    private function authorizeRole(array $allowedRoles)
    {
        $userRole = Auth::user()->role;
        if (!in_array($userRole, $allowedRoles)) {
            abort(403, 'Unauthorized: Insufficient Admin Privileges');
        }
    }
}
