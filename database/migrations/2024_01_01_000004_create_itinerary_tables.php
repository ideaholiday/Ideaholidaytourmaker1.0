
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Root Itinerary Table
        Schema::create('itineraries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Stakeholders (Linked to Users table from migration 001)
            $table->foreignUlid('agent_id')->constrained('users');
            $table->foreignUlid('operator_id')->nullable()->constrained('users');

            $table->string('reference_code')->unique(); // e.g. IH-2405-001
            $table->string('title');

            // Currencies
            $table->string('base_currency', 3)->default('USD'); // System Base
            $table->string('display_currency', 3)->default('INR'); // Agent/Client View

            // Workflow State
            $table->string('status')->default('draft'); 
            // draft | submitted | operator_review | approved | booked | cancelled

            $table->integer('version')->default(1);

            // Pricing Snapshot (Immutable JSON for this version)
            // Contains: base_total, display_total, system_margin, agent_markup, tax, rates
            $table->json('pricing_snapshot')->nullable();

            // Timestamps for SLA tracking
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Travellers (Normalized)
        Schema::create('itinerary_travellers', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            $table->string('type'); // adult, child, infant
            $table->integer('count');
            $table->timestamps();
        });

        // 3. Day Structure
        Schema::create('itinerary_days', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            
            $table->integer('day_number');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('city')->nullable();
            
            $table->timestamps();
        });

        // 4. Services (The Line Items - Replaces JSON Array)
        Schema::create('itinerary_services', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            $table->foreignId('day_id')->nullable()->constrained('itinerary_days')->cascadeOnDelete();

            $table->string('service_type'); // hotel | sightseeing | transfer | meal
            $table->string('name');
            $table->string('city')->nullable();

            // Supplier Binding
            $table->foreignUlid('supplier_id')->nullable()->constrained('users');

            // PRICING TRUTH (Locked here, never overwritten by frontend)
            $table->decimal('supplier_net', 12, 4);
            $table->string('supplier_currency', 3);

            // Display Meta (Room type, Pickup time, etc.)
            $table->json('meta')->nullable();

            $table->timestamps();
        });

        // 5. Approval State Machine
        Schema::create('itinerary_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();

            $table->string('from_status');
            $table->string('to_status');

            $table->foreignUlid('user_id')->constrained('users'); // Who changed it?
            $table->string('role'); // What was their role?

            $table->timestamp('created_at');
        });

        // 6. Supplier Vouchers (Downstream Artifacts)
        Schema::create('supplier_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            $table->foreignUlid('supplier_id')->constrained('users');

            $table->string('voucher_number')->unique();
            $table->string('status')->default('issued'); // issued | confirmed | cancelled

            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('supplier_vouchers');
        Schema::dropIfExists('itinerary_status_logs');
        Schema::dropIfExists('itinerary_services');
        Schema::dropIfExists('itinerary_days');
        Schema::dropIfExists('itinerary_travellers');
        Schema::dropIfExists('itineraries');
    }
};
    