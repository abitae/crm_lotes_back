<?php

namespace Database\Factories\Inmopro;

use App\Models\Inmopro\Investor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Investor>
 */
class InvestorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'person_type' => Investor::PERSON_NATURAL,
            'name' => $this->faker->name(),
            'document_type' => 'DNI',
            'document_number' => $this->faker->unique()->numerify('########'),
            'phone' => $this->faker->numerify('9########'),
            'email' => $this->faker->unique()->safeEmail(),
            'bank_name' => 'BCP',
            'bank_account' => $this->faker->numerify('###-########-#-##'),
            'is_active' => true,
        ];
    }
}
