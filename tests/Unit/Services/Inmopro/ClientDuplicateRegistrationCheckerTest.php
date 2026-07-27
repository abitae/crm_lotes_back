<?php

namespace Tests\Unit\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class ClientDuplicateRegistrationCheckerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_add_validation_errors_includes_phone_and_duplicate_registration(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $type = ClientType::query()->firstOrFail();
        $city = City::query()->firstOrFail();

        Client::create([
            'name' => 'Existente',
            'dni' => '12345678',
            'phone' => '999888777',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $validator = Validator::make([
            'name' => 'Nuevo',
            'dni' => '87654321',
            'phone' => '999888777',
        ], [
            'name' => ['required'],
            'dni' => ['nullable'],
            'phone' => ['required'],
        ]);

        $checker = app(ClientDuplicateRegistrationChecker::class);
        $checker->addValidationErrors($validator, '87654321', '999888777', null);

        $expected = 'Cliente ya registrado por '.$advisor->name;

        $this->assertTrue($validator->errors()->has('duplicate_registration'));
        $this->assertTrue($validator->errors()->has('phone'));
        $this->assertFalse($validator->errors()->has('dni'));
        $this->assertSame($expected, $validator->errors()->first('phone'));
        $this->assertSame($expected, $validator->errors()->first('duplicate_registration'));
    }

    public function test_find_conflict_matches_phone_with_different_formatting(): void
    {
        $advisor = Advisor::query()->firstOrFail();
        $type = ClientType::query()->firstOrFail();
        $city = City::query()->firstOrFail();

        Client::create([
            'name' => 'Con espacios',
            'dni' => '22334455',
            'phone' => '911 222 333',
            'client_type_id' => $type->id,
            'advisor_id' => $advisor->id,
            'city_id' => $city->id,
        ]);

        $conflict = app(ClientDuplicateRegistrationChecker::class)
            ->findConflict('99887766', '911222333', null);

        $this->assertNotNull($conflict);
        $this->assertSame('Con espacios', $conflict->name);
    }
}
