
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Enums\ItineraryStatus;
use Illuminate\Support\Str;

class Itinerary extends Model
{
    use HasUuids;

    public bool $allowStatusUpdate = false;

    protected $fillable = [
        'agent_id',
        'operator_id',
        'reference_code',
        'title',
        'destination_summary', 
        'travel_date',         
        'pax_count',          
        'base_currency',
        'display_currency',
        'status',
        'version',
        'is_locked',
        'submitted_at',
        'approved_at',
        'legacy',
        'pricing_snapshot'
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'travel_date' => 'date',
        'status' => ItineraryStatus::class,
        'legacy' => 'boolean',
        'is_locked' => 'boolean',
        'version' => 'integer',
        'pricing_snapshot' => 'array',
    ];

    protected $appends = [
        'selling_price', 
        'net_cost', 
        'per_person_price',
        'currency'
    ];

    protected static function booted()
    {
        static::updating(function ($itinerary) {
            if ($itinerary->legacy) {
                throw new \Exception('Legacy data is read-only. Cannot modify pre-migration itineraries.');
            }
        });
    }

    public function createNextVersion(User $agent): self
    {
        if (!$this->is_locked) {
            throw new \Exception("Cannot version an unlocked itinerary. Edit the current version directly.");
        }

        $newVersion = $this->replicate([
            'id', 
            'created_at', 
            'updated_at', 
            'submitted_at', 
            'approved_at',
            'operator_id', 
            'legacy',
            'pricing_snapshot'
        ]);

        $newVersion->id = Str::uuid();
        $newVersion->agent_id = $agent->id;
        $newVersion->version = $this->version + 1;
        $newVersion->status = ItineraryStatus::APPROVED;
        $newVersion->approved_at = now();
        $newVersion->is_locked = false;
        $newVersion->reference_code = $this->reference_code;

        $newVersion->save();

        return $newVersion;
    }

    // --- ACCESSORS ---

    public function getSellingPriceAttribute()
    {
        return $this->pricing_snapshot['display_total'] ?? 0;
    }

    public function getNetCostAttribute()
    {
        // Agent's B2B Price = Supplier Base + System Margin
        $base = $this->pricing_snapshot['base_total'] ?? 0;
        $margin = $this->pricing_snapshot['system_margin'] ?? 0;
        return $base + $margin;
    }

    public function getPerPersonPriceAttribute()
    {
        $total = $this->getSellingPriceAttribute();
        return $this->pax_count > 0 ? round($total / $this->pax_count, 2) : 0;
    }

    public function getCurrencyAttribute()
    {
        return $this->display_currency ?? 'INR';
    }

    // --- RELATIONS ---

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function operator()
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function travellers()
    {
        return $this->hasMany(ItineraryTraveller::class);
    }

    public function days()
    {
        return $this->hasMany(ItineraryDay::class)->orderBy('day_number');
    }

    public function services()
    {
        return $this->hasMany(ItineraryService::class);
    }

    public function statusLogs()
    {
        return $this->hasMany(ItineraryStatusLog::class);
    }

    public function vouchers()
    {
        return $this->hasMany(SupplierVoucher::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function whatsAppLogs()
    {
        return $this->hasMany(WhatsAppLog::class);
    }

    public function isEditable(): bool
    {
        if ($this->legacy) return false;
        if ($this->is_locked) return false;
        if ($this->status === ItineraryStatus::BOOKED) return false;
        if ($this->status === ItineraryStatus::CANCELLED) return false;
        return true;
    }

    public function isApproved(): bool
    {
        return $this->status === ItineraryStatus::APPROVED;
    }
}
