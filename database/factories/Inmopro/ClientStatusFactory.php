<?php

namespace Database\Factories\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\ClientStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClientStatus>
 */
class ClientStatusFactory extends Factory
{
    protected $model = ClientStatus::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'advisor_id' => Advisor::query()->value('id') ?? 1,
            'name' => $this->faker->unique()->words(2, true),
            'code' => strtoupper($this->faker->unique()->lexify('STATUS_????')),
            'description' => $this->faker->sentence(),
            'color' => $this->faker->hexColor(),
            'sort_order' => $this->faker->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
