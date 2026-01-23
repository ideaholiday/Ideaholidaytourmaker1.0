<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('pricing_audit_logs', function (Blueprint $table) {
            $table->id();

            // Linkage
            $table->uuid('itinerary_id')->index();
            $table->uuid('user_id')->nullable()->index(); // Who triggered this calc?

            // Context
            $table->string('role'); // admin | operator | staff | system
            $table->string('action'); // calculated | operator_override | approved | recalculated

            // Currencies used at time of calc
            $table->string('supplier_currency', 3);
            $table->string('display_currency', 3);
            $table->string('base_currency', 3);

            // Base Values
            $table->decimal('supplier_net', 12, 4); // Original Input
            $table->decimal('base_net', 12, 4);     // Normalized to Base

            // Rules Snapshot (Percentages)
            $table->decimal('system_margin_percent', 5, 2);
            $table->decimal('agent_markup_percent', 5, 2);
            $table->decimal('operator_override_percent', 5, 2);
            $table->decimal('tax_percent', 5, 2);

            // Calculated Values (Absolute)
            $table->decimal('system_margin_amount', 12, 4);
            $table->decimal('agent_markup_amount', 12, 4);
            $table->decimal('operator_adjustment_amount', 12, 4);
            $table->decimal('tax_amount', 12, 4);

            // Final Result
            $table->decimal('final_price', 12, 4);

            // Time Anchors
            $table->timestamp('rate_timestamp'); // When were currency rates fetched?
            $table->timestamps(); // Created At = When was this price calculated?
        });
    }

    public function down()
    {
        Schema::dropIfExists('pricing_audit_logs');
    }
};
