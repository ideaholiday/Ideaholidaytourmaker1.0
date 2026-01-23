
<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use App\Services\Itinerary\ItineraryPdfGenerator;

class ItineraryPdfController extends Controller
{
    public function download(Itinerary $itinerary)
    {
        // Policy Check (Optional but recommended)
        // $this->authorize('view', $itinerary);

        // Delegate to Generator Service
        return app(ItineraryPdfGenerator::class)->download($itinerary);
    }
}
