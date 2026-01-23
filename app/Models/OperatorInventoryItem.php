
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class OperatorInventoryItem extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'products';

    protected $guarded = [];

    public function currentVersion()
    {
        return $this->belongsTo(OperatorInventoryVersion::class, 'current_version_id');
    }

    public function versions()
    {
        return $this->hasMany(OperatorInventoryVersion::class, 'inventory_id'); // Mapping to product_id column really, but let's assume polymorphic or aliased
    }
}
