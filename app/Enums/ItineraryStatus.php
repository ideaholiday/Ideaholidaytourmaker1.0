<?php

namespace App\Enums;

enum ItineraryStatus: string
{
    case DRAFT = 'draft';
    case SUBMITTED = 'submitted';
    case OPERATOR_REVIEW = 'operator_review';
    case PRICING_ADJUSTED = 'pricing_adjusted';
    case APPROVED = 'approved';
    case SENT_TO_AGENT = 'sent_to_agent';
    case BOOKED = 'booked';
    case CANCELLED = 'cancelled';
    case EXPIRED = 'expired';

    /**
     * Allowed next states from current state.
     */
    public function canTransitionTo(): array
    {
        return match ($this) {
            self::DRAFT => [
                self::SUBMITTED,
                self::CANCELLED,
            ],

            self::SUBMITTED => [
                self::OPERATOR_REVIEW,
                self::CANCELLED,
            ],

            self::OPERATOR_REVIEW => [
                self::PRICING_ADJUSTED,
                self::APPROVED,
                self::CANCELLED,
            ],

            self::PRICING_ADJUSTED => [
                self::OPERATOR_REVIEW,
                self::APPROVED,
            ],

            self::APPROVED => [
                self::SENT_TO_AGENT,
                self::BOOKED,
                self::EXPIRED,
            ],

            self::SENT_TO_AGENT => [
                self::BOOKED,
                self::EXPIRED,
            ],

            self::BOOKED => [
                self::CANCELLED, // Requires penalty calculation logic usually
            ],

            self::CANCELLED, self::EXPIRED => [],
        };
    }
}
