<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('inventory_approval_logs', function (Blueprint $table) {
            $table->id();
            
            $table->uuid('product_id')->index(); // Links to products table
            
            $table->string('from_status');
            $table->string('to_status');
            
            $table->string('actor_id'); // Admin or Operator ID
            $table->string('actor_role'); // Role snapshot
            
            $table->text('remarks')->nullable();
            
            $table->timestamp('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('inventory_approval_logs');
    }
};
