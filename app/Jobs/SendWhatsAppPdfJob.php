
<?php

namespace App\Jobs;

use App\Models\Itinerary;
use App\Models\WhatsAppLog;
use App\Services\WhatsApp\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWhatsAppPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $itineraryId,
        public string $recipientRole // 'agent' | 'supplier'
    ) {}

    /**
     * Execute the job.
     */
    public function handle(WhatsAppService $whatsapp)
    {
        $itinerary = Itinerary::with([
            'agent',
            'documents' => fn ($q) => $q->where('type', 'quote')->orderByDesc('created_at')
        ])->findOrFail($this->itineraryId);

        // 1. Resolve PDF
        $pdf = $itinerary->documents->first();

        if (!$pdf) {
            Log::error("WhatsApp Job Failed: No PDF document found for Itinerary {$this->itineraryId}");
            $this->logFailure($this->itineraryId, 'PDF not found');
            return;
        }

        // 2. Resolve Recipient
        try {
            $recipient = $this->resolveRecipient($itinerary);
        } catch (\Exception $e) {
            Log::error("WhatsApp Job Failed: " . $e->getMessage());
            $this->logFailure($this->itineraryId, $e->getMessage());
            return;
        }

        // 3. Build Message
        $message = $this->buildMessage($itinerary);

        // 4. Send
        try {
            $messageId = $whatsapp->sendPdf(
                phone: $recipient->phone,
                pdfPath: $pdf->path,
                message: $message
            );

            // 5. Log Success
            WhatsAppLog::create([
                'itinerary_id' => $itinerary->id,
                'recipient_role' => $this->recipientRole,
                'phone' => $recipient->phone,
                'status' => 'sent',
                'message_id' => $messageId
            ]);

        } catch (\Exception $e) {
            // 5. Log Failure
            Log::error("WhatsApp Job API Error: " . $e->getMessage());
            WhatsAppLog::create([
                'itinerary_id' => $itinerary->id,
                'recipient_role' => $this->recipientRole,
                'phone' => $recipient->phone,
                'status' => 'failed',
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    protected function resolveRecipient(Itinerary $itinerary)
    {
        return match ($this->recipientRole) {
            'agent' => $itinerary->agent,
            default => throw new \Exception("Invalid recipient role: {$this->recipientRole}"),
        };
    }

    protected function buildMessage(Itinerary $itinerary): string
    {
        $currency = $itinerary->display_currency;
        // Use pricing snapshot for accuracy
        $snapshot = $itinerary->pricing_snapshot;
        $total = $snapshot ? ($snapshot['display_total'] ?? 'N/A') : 'N/A';

        return <<<MSG
🌍 *Your Travel Quote is Ready!*

📄 Reference: {$itinerary->reference_code}
💰 Total: {$total} {$currency}

Please find your detailed itinerary attached.

– Idea Holiday Pvt Ltd
MSG;
    }

    protected function logFailure(string $itineraryId, string $error)
    {
        WhatsAppLog::create([
            'itinerary_id' => $itineraryId,
            'recipient_role' => $this->recipientRole,
            'phone' => 'N/A',
            'status' => 'failed',
            'error' => $error
        ]);
    }
}
    