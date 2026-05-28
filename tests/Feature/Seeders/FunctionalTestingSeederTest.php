<?php

namespace Tests\Feature\Seeders;

use App\Models\Inmopro\Datero;
use App\Models\Inmopro\Lot;
use App\Models\User;
use Database\Seeders\AuthorizationSeeder;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\FunctionalTestingSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FunctionalTestingSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_functional_testing_seeder_is_idempotent_and_creates_expected_records(): void
    {
        $this->seed(TeamSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
        $this->seed(AuthorizationSeeder::class);

        $this->seed(FunctionalTestingSeeder::class);
        $this->seed(FunctionalTestingSeeder::class);

        $this->assertDatabaseHas('users', ['email' => 'qa.funcional@crm-lotes.test']);
        $this->assertDatabaseHas('dateros', ['username' => 'datero_funcional', 'dni' => '45987654']);
        $this->assertDatabaseHas('clients', ['dni' => '40001111', 'name' => 'Cliente QA Cazador']);
        $this->assertTrue(Lot::query()->where('number', '900')->whereHas('status', fn ($q) => $q->where('code', 'LIBRE'))->exists());

        $user = User::query()->where('email', 'qa.funcional@crm-lotes.test')->firstOrFail();
        $this->assertTrue($user->hasRole('super-admin'));

        $datero = Datero::query()->where('username', 'datero_funcional')->firstOrFail();
        $this->assertNotSame('654321', $datero->getRawOriginal('pin'));
    }

    public function test_functional_testing_seeder_fails_without_advisors(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('no hay asesores');

        $this->seed(FunctionalTestingSeeder::class);
    }
}
