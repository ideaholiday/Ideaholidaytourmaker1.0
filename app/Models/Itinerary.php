
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Enums\ItineraryStatus;
use Illuminate\Support\Str;

class Itinerary extends Model
{
    use HasUuids;

    /**
     * Transient flag to allow status updates from the StateMachine service.
     * This is not persisted to the database.
     */
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
        'pricing_snapshot' // Stored as JSON
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

    /**
     * Boot model to enforce business rules.
     */
    protected static function booted()
    {
        static::updating(function ($itinerary) {
            
            // 1. Legacy Freeze
            if ($itinerary->legacy) {
                throw new \Exception('Legacy data is read-only. Cannot modify pre-migration itineraries.');
            }

            // 2. Status Protection
            if ($itinerary->isDirty('status') && !$itinerary->allowStatusUpdate) {
                throw new \Exception('Direct status update forbidden. Use ItineraryStateMachine service.');
            }
        });
    }

    /**
     * Create a new version of this itinerary.
     * Replicates the shell.
     */
    public function createNextVersion(User $agent): self
    {
        if (!$this->is_locked) {
            throw new \Exception("Cannot version an unlocked itinerary. Edit the draft directly.");
        }

        $newVersion = $this->replicate([
            'id', 
            'created_at', 
            'updated_at', 
            'submitted_at', 
            'approved_at',
            'operator_id', 
            'legacy',
            'pricing_snapshot' // Pricing resets on new draft until saved
        ]);

        $newVersion->id = Str::uuid();
        $newVersion->agent_id = $agent->id;
        $newVersion->version = $this->version + 1;
        $newVersion->status = ItineraryStatus::DRAFT;
        $newVersion->is_locked = false;
        
        $newVersion->reference_code = $this->reference_code;

        $newVersion->save();

        return $newVersion;
    }

    /* =========================
     | RELATIONS
     ========================= */

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

    /* =========================
     | DOMAIN RULES
     ========================= */

    public function isEditable(): bool
    {
        if ($this->legacy) return false;
        if ($this->is_locked) return false;

        return in_array($this->status, [
            ItineraryStatus::DRAFT, 
            ItineraryStatus::SUBMITTED, 
            ItineraryStatus::OPERATOR_REVIEW
        ]);
    }

    public function isApproved(): bool
    {
        return $this->status === ItineraryStatus::APPROVED;
    }
}
    