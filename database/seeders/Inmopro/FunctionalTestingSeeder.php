<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Datero;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;
use Spatie\Permission\Models\Role;

/**
 * Datos fijos para pruebas manuales y E2E (Inmopro + Cazador).
 *
 * Credenciales (solo entornos de prueba):
 * - Panel web: qa.funcional@crm-lotes.test / Password123!
 * - Cazador (vendedor existente): asesor1 / 123456 (del AdvisorSeeder)
 * - Datero: datero_funcional / 654321
 *
 * Requiere haber ejecutado antes los seeders base (p. ej. DatabaseSeeder sin este paso,
 * o al menos niveles, equipos, ciudades, tipos de cliente, estados de lote, proyectos y asesores).
 */
class FunctionalTestingSeeder extends Seeder
{
    public function run(): void
    {
        if (! Advisor::query()->exists()) {
            throw new RuntimeException('FunctionalTestingSeeder: no hay asesores. Ejecute antes AdvisorSeeder o el DatabaseSeeder base.');
        }

        if (! City::query()->where('is_active', true)->exists()) {
            throw new RuntimeException('FunctionalTestingSeeder: no hay ciudades activas. Ejecute antes CitySeeder.');
        }

        if (! ClientType::query()->where('code', 'PROPIO')->exists()) {
            throw new RuntimeException('FunctionalTestingSeeder: falta tipo de cliente PROPIO. Ejecute antes ClientTypeSeeder.');
        }

        $this->seedQaWebUser();
        $this->seedFunctionalDatero();
        $this->seedCazadorClient();
        $this->seedStableFreeLot();
    }

    private function seedQaWebUser(): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => 'qa.funcional@crm-lotes.test'],
            [
                'name' => 'Usuario QA Funcional',
                'password' => 'Password123!',
                'email_verified_at' => now(),
            ],
        );

        $superAdmin = Role::findOrCreate('super-admin', 'web');
        $user->assignRole($superAdmin);
    }

    private function seedFunctionalDatero(): void
    {
        $advisor = Advisor::query()->where('username', 'asesor1')->first()
            ?? Advisor::query()->orderBy('id')->firstOrFail();

        $city = City::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->firstOrFail();

        Datero::query()->updateOrCreate(
            ['username' => 'datero_funcional'],
            [
                'advisor_id' => $advisor->id,
                'name' => 'Datero QA Funcional',
                'phone' => '987000999',
                'email' => 'datero.qa@crm-lotes.test',
                'city_id' => $city->id,
                'dni' => '45987654',
                'pin' => '654321',
                'is_active' => true,
            ],
        );
    }

    private function seedCazadorClient(): void
    {
        $advisor = Advisor::query()->where('username', 'asesor1')->first()
            ?? Advisor::query()->orderBy('id')->firstOrFail();

        $city = City::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->firstOrFail();
        $ownType = ClientType::query()->where('code', 'PROPIO')->firstOrFail();

        Client::query()->updateOrCreate(
            ['dni' => '40001111'],
            [
                'name' => 'Cliente QA Cazador',
                'phone' => '987111222',
                'email' => 'cliente.qa.cazador@crm-lotes.test',
                'client_type_id' => $ownType->id,
                'city_id' => $city->id,
                'advisor_id' => $advisor->id,
            ],
        );
    }

    private function seedStableFreeLot(): void
    {
        $project = Project::query()->orderBy('id')->firstOrFail();
        $statusLibre = LotStatus::query()->where('code', 'LIBRE')->firstOrFail();

        $blocks = $project->blocks;
        $block = is_array($blocks) && $blocks !== [] ? $blocks[0] : 'A';

        Lot::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'block' => $block,
                'number' => '900',
            ],
            [
                'area' => 120,
                'price' => 35000,
                'lot_status_id' => $statusLibre->id,
                'client_id' => null,
                'advisor_id' => null,
                'client_name' => null,
                'client_dni' => null,
                'advance' => null,
                'remaining_balance' => null,
                'payment_limit_date' => null,
                'operation_number' => null,
                'contract_date' => null,
                'contract_number' => null,
                'notarial_transfer_date' => null,
                'observations' => 'Lote fijo para pruebas de pre-reserva / catálogo (FunctionalTestingSeeder).',
            ],
        );
    }
}
