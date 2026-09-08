<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        $cities = [
            ['name' => 'Lima', 'code' => 'LIM', 'department' => 'Lima', 'sort_order' => 1],
            ['name' => 'Arequipa', 'code' => 'AQP', 'department' => 'Arequipa', 'sort_order' => 2],
            ['name' => 'Cusco', 'code' => 'CUS', 'department' => 'Cusco', 'sort_order' => 3],
            ['name' => 'Trujillo', 'code' => 'TRU', 'department' => 'La Libertad', 'sort_order' => 4],
            ['name' => 'Chiclayo', 'code' => 'CHI', 'department' => 'Lambayeque', 'sort_order' => 5],
            ['name' => 'Piura', 'code' => 'PIU', 'department' => 'Piura', 'sort_order' => 6],
        ];

        foreach ($cities as $city) {
            City::updateOrCreate(
                ['code' => $city['code']],
                $city + ['is_active' => true],
            );
        }

        $this->ensureFallbackCity();
    }

    private function ensureFallbackCity(): void
    {
        $existing = City::query()
            ->whereRaw('UPPER(name) = ?', ['SIN CIUDAD'])
            ->first();

        if ($existing !== null) {
            return;
        }

        $code = 'SINCID';
        $suffix = 1;
        while (City::query()->where('code', $code)->exists()) {
            $code = 'SINCID'.$suffix;
            $suffix++;
        }

        City::query()->create([
            'name' => 'SIN CIUDAD',
            'code' => $code,
            'department' => null,
            'sort_order' => 99,
            'is_active' => true,
        ]);
    }
}
