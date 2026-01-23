
<?php

namespace App\Enums;

enum HotelRoomRateStatus: string
{
    case DRAFT = 'DRAFT';
    case SUBMITTED = 'SUBMITTED';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case INACTIVE = 'INACTIVE';
}
