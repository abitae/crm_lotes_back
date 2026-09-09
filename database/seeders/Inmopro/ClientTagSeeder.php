<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Services\Crm\AdvisorCrmCatalogService;
use Illuminate\Database\Seeder;

class ClientTagSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $catalog = app(AdvisorCrmCatalogService::class);

        Advisor::query()->each(function (Advisor $advisor) use ($catalog): void {
            $catalog->ensureDefaults($advisor);
        });
    }
}
