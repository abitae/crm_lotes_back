<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\AttentionTicketType;
use Illuminate\Database\Seeder;

class AttentionTicketTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        AttentionTicketType::query()->updateOrCreate(
            ['code' => AttentionTicketType::CODE_GENERAL],
            [
                'name' => 'General',
                'description' => 'Tipo general para tickets de atención.',
                'color' => '#64748b',
                'allows_overlap' => true,
                'is_active' => true,
                'sort_order' => 0,
            ],
        );
    }
}
