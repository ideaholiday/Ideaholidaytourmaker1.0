
<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Enums\InventoryStatus;

class InventoryController extends Controller
{
    public function search(Request $request)
    {
        $request->validate([
            'type' => 'required|in:HOTEL,ACTIVITY,TRANSFER',
            'city_id' => 'sometimes|string'
        ]);

        // STRICT RULE: Only Approved and Active inventory
        // Eager load currentVersion to get the actual data (name, desc, etc.)
        $query = Product::query()
            ->approved()
            ->where('type', $request->type)
            ->with(['currentVersion', 'supplier:id,name,company_name']); // Load minimal supplier info if needed

        // ROLE-BASED VISIBILITY FILTER
        if ($request->type === 'HOTEL') {
            // Hotels: Allow Admin, Staff, and Hotel Partners (Suppliers)
            $query->whereHas('supplier', function($q) {
                $q->whereIn('role', ['ADMIN', 'STAFF', 'SUPPLIER']);
            });
        } else {
            // Activities & Transfers: Include Operators (DMCs) who supply ground services
            $query->whereHas('supplier', function($q) {
                $q->whereIn('role', ['ADMIN', 'STAFF', 'OPERATOR']);
            });
        }

        // Filter by City (Location)
        // We assume the frontend sends the UUID of the location/city
        if ($request->filled('city_id')) {
            $query->whereHas('currentVersion', function ($q) use ($request) {
                $q->where('location_id', $request->city_id);
            });
        }

        $products = $query->orderBy('created_at', 'desc')->paginate(50);

        // Transformation: Only expose what the builder needs. HIDE COSTS.
        $mapped = $products->getCollection()->map(function ($product) {
            $version = $product->currentVersion;
            
            return [
                'id' => $product->id, // The ID used to add to itinerary
                'type' => $product->type,
                'name' => $version->name,
                'description' => $version->description,
                'location_id' => $version->location_id,
                'meta' => [
                    'inclusions' => $version->inclusions,
                    'exclusions' => $version->exclusions,
                    'notes' => $version->important_notes,
                    'meta_data' => $version->meta_data,
                ],
                // NO NET COST HERE
                // NO CURRENCY HERE (unless display currency logic is added later)
            ];
        });

        return response()->json([
            'data' => $mapped,
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'total' => $products->total(),
            ]
        ]);
    }
}
