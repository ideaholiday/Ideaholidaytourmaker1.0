<?php

namespace App\Enums;

enum PermissionKey: string
{
    // Itinerary Operations
    case ITINERARY_CREATE = 'itinerary.create';
    case ITINERARY_EDIT = 'itinerary.edit';
    case ITINERARY_APPROVE = 'itinerary.approve'; // For Operators/Staff

    // Financials
    case PRICE_VIEW_NET = 'price.view_net';
    case PRICE_OVERRIDE = 'price.override';

    // Bookings
    case BOOKING_CREATE = 'booking.create';
    case BOOKING_CANCEL = 'booking.cancel';

    // Inventory
    case INVENTORY_MANAGE = 'inventory.manage';

    // Administration
    case USER_MANAGE = 'user.manage';
}
