
<?php

namespace App\Enums;

enum HotelStatus: string
{
    case DRAFT = 'DRAFT';
    case SUBMITTED = 'SUBMITTED';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case INACTIVE = 'INACTIVE';
}
