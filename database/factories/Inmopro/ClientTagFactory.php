<?php

namespace Database\Factories\Inmopro;

use App\Models\Inmopro\ClientTag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Inmopro\ClientTag>
 */
class ClientTagFactory extends Factory
{
    protected $model = ClientTag::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->word(),
            'code' => strtoupper($this->faker->unique()->lexify('TAG_????')),
            'description' => $this->faker->sentence(),
            'color' => $this->faker->hexColor(),
            'sort_order' => $this->faker->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
