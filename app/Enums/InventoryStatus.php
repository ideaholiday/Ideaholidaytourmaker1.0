<?php

namespace App\Enums;

enum InventoryStatus: string
{
    case DRAFT = 'DRAFT';
    case SUBMITTED = 'SUBMITTED';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case INACTIVE = 'INACTIVE';

    /**
     * Define allowed next states from current state.
     */
    public function canTransitionTo(): array
    {
        return match ($this) {
            self::DRAFT => [self::SUBMITTED],
            self::SUBMITTED => [self::APPROVED, self::REJECTED],
            self::APPROVED => [self::INACTIVE, self::DRAFT], // Draft allowed if edited
            self::REJECTED => [self::DRAFT],
            self::INACTIVE => [self::DRAFT], // Must go back to draft to reactivate via approval
        };
    }
    
    public function label(): string
    {
        return match($this) {
            self::DRAFT => 'Draft',
            self::SUBMITTED => 'Pending Approval',
            self::APPROVED => 'Live',
            self::REJECTED => 'Rejected',
            self::INACTIVE => 'Inactive',
        };
    }
}
