
<?php

namespace App\DTO\Staff;

use App\DTO\Agent\AgentInventoryDTO;

class StaffInventoryDTO extends AgentInventoryDTO
{
    // Inherits Agent view. Staff shouldn't see sensitive supplier margins 
    // unless explicitly authorized via a different flow.
}
