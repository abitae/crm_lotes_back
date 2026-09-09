<?php

namespace Database\Factories\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\ClientTag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClientTag>
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
            'advisor_id' => Advisor::query()->value('id') ?? 1,
            'name' => $this->faker->unique()->word(),
            'code' => strtoupper($this->faker->unique()->lexify('TAG_????')),
            'description' => $this->faker->sentence(),
            'color' => $this->faker->hexColor(),
            'sort_order' => $this->faker->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
