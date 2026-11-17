<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->sentence(),
            'created_by' => User::factory(),
            'assigned_to' => User::factory(),
            'completed_at' => null,
            'completed_by' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(function (array $attributes): array {
            $completedBy = $attributes['assigned_to'] instanceof User
                ? $attributes['assigned_to']->id
                : $attributes['assigned_to'];

            return [
                'completed_at' => now(),
                'completed_by' => $completedBy,
            ];
        });
    }
}
