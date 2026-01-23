<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Send a PDF Document via WhatsApp.
     *
     * @param string $phone Recipient phone number (E.164 format preferred)
     * @param string $pdfPath Relative path in storage (e.g., itineraries/123.pdf)
     * @param string $message Caption text
     * @return string|null Provider Message ID
     * @throws \Exception
     */
    public function sendPdf(string $phone, string $pdfPath, string $message): ?string
    {
        $endpoint = config('whatsapp.endpoint');
        $token = config('whatsapp.token');
        
        if (!$endpoint || !$token) {
            // Log warning if not configured (Dev mode)
            Log::warning("WhatsApp API not configured. Message to {$phone} skipped.");
            return null;
        }

        // Generate a temporary public URL or pre-signed URL for the PDF
        // WhatsApp API requires a publicly accessible link to download the media
        $documentUrl = $this->generatePublicUrl($pdfPath);

        $response = Http::withToken($token)
            ->post($endpoint, [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'document',
                'document' => [
                    'link' => $documentUrl,
                    'filename' => basename($pdfPath),
                    'caption' => $message
                ]
            ]);

        if ($response->failed()) {
            throw new \Exception("WhatsApp API Error: " . $response->body());
        }

        $data = $response->json();
        return $data['messages'][0]['id'] ?? null;
    }

    protected function generatePublicUrl(string $path): string
    {
        // Logic to get public URL. 
        // If using S3: Storage::disk('s3')->url($path);
        // If local: Ensure symbolic link exists or use a route that streams file.
        $disk = config('whatsapp.storage_disk', 'public');
        return Storage::disk($disk)->url($path);
    }
}
