<?php

namespace App\Observers;

use App\Models\Inmopro\Advisor;
use App\Services\Crm\AdvisorCrmCatalogService;

class AdvisorObserver
{
    public function created(Advisor $advisor): void
    {
        app(AdvisorCrmCatalogService::class)->ensureDefaults($advisor);
    }
}
