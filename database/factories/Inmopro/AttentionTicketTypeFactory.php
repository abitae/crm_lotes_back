<?php

namespace Database\Factories\Inmopro;

use App\Models\Inmopro\AttentionTicketType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AttentionTicketType>
 */
class AttentionTicketTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'code' => strtoupper(fake()->unique()->bothify('TIPO_####')),
            'description' => fake()->sentence(),
            'color' => fake()->hexColor(),
            'allows_overlap' => true,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
