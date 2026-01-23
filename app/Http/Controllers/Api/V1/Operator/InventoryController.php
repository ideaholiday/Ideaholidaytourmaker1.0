<?php

namespace App\Http\Controllers\Api\V1\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Services\Admin\InventoryManagementService;
use App\Services\Inventory\InventoryStateMachine;
use App\Enums\InventoryStatus;
use Illuminate\Support\Facades\Auth;

class InventoryController extends Controller
{
    protected $service;

    public function __construct(InventoryManagementService $service)
    {
        $this->service = $service;
    }

    /**
     * List my inventory (All statuses)
     */
    public function index(Request $request)
    {
        $products = Product::forOperator($request->user()->id)
            ->with('currentVersion')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($products);
    }

    /**
     * Create Draft Inventory
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:HOTEL,ACTIVITY,TRANSFER',
            'name' => 'required|string',
            'net_cost' => 'required|numeric|min:0',
            'currency' => 'required|string|size:3',
            'location_id' => 'nullable|exists:locations,id',
            'description' => 'nullable|string',
            // ... other fields
        ]);

        // Created as DRAFT by default via service
        $product = $this->service->createProduct($validated, Auth::user());

        return response()->json([
            'message' => 'Inventory draft created.',
            'product' => $product->load('currentVersion')
        ], 201);
    }

    /**
     * Update Inventory (Resets to Draft)
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        if ($product->supplier_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->all(); 
        
        // Service handles creating new version and resetting status to DRAFT internally
        // Note: The service needs to set allowStatusUpdate=true internally when resetting to DRAFT.
        // We assume InventoryManagementService uses the StateMachine or handles the flag correctly.
        $updated = $this->service->updateProduct($product, $validated, Auth::user());

        return response()->json([
            'message' => 'Inventory updated. Status reset to Draft.',
            'product' => $updated->load('currentVersion')
        ]);
    }

    /**
     * Submit for Approval via State Machine
     */
    public function submit($id)
    {
        $product = Product::findOrFail($id);
        
        if ($product->supplier_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        try {
            app(InventoryStateMachine::class)->transition(
                $product,
                InventoryStatus::SUBMITTED,
                Auth::user()
            );
            return response()->json(['message' => 'Inventory submitted for approval.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
