<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'ADMIN';
    case STAFF = 'STAFF';
    case AGENT = 'AGENT';
    case OPERATOR = 'OPERATOR';
    case SUPPLIER = 'SUPPLIER';

    public function label(): string
    {
        return match($this) {
            self::ADMIN => 'Administrator',
            self::STAFF => 'Internal Staff',
            self::AGENT => 'Travel Agent',
            self::OPERATOR => 'Ground Operator (DMC)',
            self::SUPPLIER => 'Inventory Supplier',
        };
    }
}
