<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Documents Table (Tracks generated PDFs)
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            
            $table->string('type'); // quote | voucher | invoice
            $table->string('path'); // Storage path
            $table->string('filename');
            $table->string('mime_type')->default('application/pdf');
            $table->integer('size_bytes')->nullable();
            
            $table->timestamps();
        });

        // 2. WhatsApp Logs Table (Audit Trail)
        Schema::create('whatsapp_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            
            $table->string('recipient_role'); // agent | supplier | customer
            $table->string('phone');
            $table->string('template_name')->nullable();
            
            $table->string('status'); // queued | sent | failed | delivered
            $table->text('error')->nullable(); // API error response if failed
            
            $table->string('message_id')->nullable(); // Provider ID
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('whatsapp_logs');
        Schema::dropIfExists('documents');
    }
};
