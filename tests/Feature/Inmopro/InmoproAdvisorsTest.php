<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\AdvisorMaterialItem;
use App\Models\Inmopro\AdvisorMaterialType;
use App\Models\Inmopro\AdvisorProfile;
use App\Models\Inmopro\AdvisorProfileDocument;
use App\Models\Inmopro\AdvisorMembership;
use App\Models\Inmopro\AdvisorMembershipPayment;
use App\Models\Inmopro\City;
use App\Models\Inmopro\MembershipType;
use App\Models\Inmopro\Team;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InmoproAdvisorsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_guests_cannot_visit_advisors_index(): void
    {
        $response = $this->get(route('inmopro.advisors.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_advisors_index(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.advisors.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('inmopro/advisors/index')->has('advisors')->has('teams')->has('cities')->has('materialTypes'));
    }

    public function test_authenticated_users_can_visit_advisors_new(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('inmopro.advisors.new'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('inmopro/advisors/new')
            ->has('advisorLevels')
            ->has('teams')
            ->has('cities')
            ->has('materialTypes'));
    }

    public function test_authenticated_users_can_create_advisor(): void
    {
        $user = User::factory()->create();
        $level = AdvisorLevel::first();
        $team = Team::first();
        $city = City::firstOrFail();
        $this->actingAs($user);

        $response = $this->post(route('inmopro.advisors.store'), [
            'dni' => '87654321',
            'first_name' => 'Asesor Nuevo',
            'last_name' => 'Test',
            'phone' => '999888777',
            'email' => 'asesor@example.com',
            'city_id' => $city->id,
            'team_id' => $team->id,
            'advisor_level_id' => $level->id,
            'personal_quota' => 10,
        ]);

        $response->assertRedirect(route('inmopro.advisors.index', [
            'advisor_level_id' => $level->id,
            'team_id' => $team->id,
        ]));
        $this->assertDatabaseHas('advisors', [
            'dni' => '87654321',
            'first_name' => 'Asesor Nuevo',
            'last_name' => 'Test',
            'name' => 'Asesor Nuevo Test',
            'email' => 'asesor@example.com',
            'team_id' => $team->id,
            'username' => 'asesor',
        ]);
    }

    public function test_store_advisor_with_profile_creates_profile_and_documents(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $level = AdvisorLevel::first();
        $team = Team::first();
        $city = City::firstOrFail();
        $this->actingAs($user);

        $file = UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf');

        $response = $this->post(route('inmopro.advisors.store'), [
            'dni' => '87654329',
            'first_name' => 'Perfil',
            'last_name' => 'Completo',
            'phone' => '999888779',
            'email' => 'perfil-completo@example.com',
            'city_id' => $city->id,
            'team_id' => $team->id,
            'advisor_level_id' => $level->id,
            'personal_quota' => 10,
            'profile' => [
                'professional_profile' => 'Perfil profesional de prueba',
                'skills_strengths' => 'Negociación y cierre',
                'availability' => 'Lunes a viernes',
                'document_files' => [$file],
                'document_titles' => ['CV'],
            ],
        ]);

        $response->assertRedirect(route('inmopro.advisors.index', [
            'advisor_level_id' => $level->id,
            'team_id' => $team->id,
        ]));

        $advisor = Advisor::query()->where('email', 'perfil-completo@example.com')->firstOrFail();
        $this->assertDatabaseHas('advisor_profiles', [
            'advisor_id' => $advisor->id,
            'professional_profile' => 'Perfil profesional de prueba',
            'skills_strengths' => 'Negociación y cierre',
            'availability' => 'Lunes a viernes',
        ]);

        $profile = AdvisorProfile::query()->where('advisor_id', $advisor->id)->firstOrFail();
        $document = AdvisorProfileDocument::query()->where('advisor_profile_id', $profile->id)->firstOrFail();
        $this->assertSame('CV', $document->title);
        $this->assertSame('cv.pdf', $document->file_name);
        Storage::disk('public')->assertExists($document->file_path);
    }

    public function test_authenticated_users_can_update_advisor(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::first();
        $this->actingAs($user);

        $response = $this->put(route('inmopro.advisors.update', $advisor), [
            'dni' => $advisor->dni,
            'first_name' => 'Asesor',
            'last_name' => 'Actualizado',
            'phone' => $advisor->phone,
            'email' => $advisor->email,
            'city_id' => $advisor->city_id ?? City::firstOrFail()->id,
            'team_id' => $advisor->team_id,
            'advisor_level_id' => $advisor->advisor_level_id,
            'personal_quota' => 15,
        ]);

        $response->assertRedirect(route('inmopro.advisors.index', [
            'advisor_level_id' => $advisor->advisor_level_id,
            'team_id' => $advisor->team_id,
        ]));
        $this->assertDatabaseHas('advisors', [
            'id' => $advisor->id,
            'first_name' => 'Asesor',
            'last_name' => 'Actualizado',
            'name' => 'Asesor Actualizado',
            'personal_quota' => 15,
            'username' => $advisor->username,
        ]);
    }

    public function test_update_advisor_updates_profile_and_appends_documents(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $advisor = Advisor::firstOrFail();
        $profile = AdvisorProfile::query()->create([
            'advisor_id' => $advisor->id,
            'professional_profile' => 'Perfil inicial',
            'skills_strengths' => 'Inicial',
            'availability' => 'Mañanas',
        ]);
        $this->actingAs($user);

        $file = UploadedFile::fake()->create('certificado.pdf', 80, 'application/pdf');

        $response = $this->put(route('inmopro.advisors.update', $advisor), [
            'dni' => $advisor->dni,
            'first_name' => $advisor->first_name,
            'last_name' => $advisor->last_name,
            'phone' => $advisor->phone,
            'email' => $advisor->email,
            'city_id' => $advisor->city_id ?? City::firstOrFail()->id,
            'team_id' => $advisor->team_id,
            'advisor_level_id' => $advisor->advisor_level_id,
            'personal_quota' => $advisor->personal_quota,
            'profile' => [
                'professional_profile' => 'Perfil actualizado',
                'skills_strengths' => 'Cierre consultivo',
                'availability' => 'Tardes',
                'document_files' => [$file],
                'document_titles' => ['Certificado'],
            ],
        ]);

        $response->assertRedirect(route('inmopro.advisors.index', [
            'advisor_level_id' => $advisor->advisor_level_id,
            'team_id' => $advisor->team_id,
        ]));
        $this->assertDatabaseHas('advisor_profiles', [
            'id' => $profile->id,
            'professional_profile' => 'Perfil actualizado',
            'skills_strengths' => 'Cierre consultivo',
            'availability' => 'Tardes',
        ]);

        $document = AdvisorProfileDocument::query()->where('advisor_profile_id', $profile->id)->firstOrFail();
        $this->assertSame('Certificado', $document->title);
        Storage::disk('public')->assertExists($document->file_path);
    }

    public function test_store_advisor_rejects_invalid_cci(): void
    {
        $user = User::factory()->create();
        $level = AdvisorLevel::first();
        $team = Team::first();
        $city = City::firstOrFail();
        $this->actingAs($user);

        $this->post(route('inmopro.advisors.store'), [
            'dni' => '87654322',
            'first_name' => 'Test',
            'last_name' => 'CCI',
            'phone' => '999888777',
            'email' => 'cci-invalid@example.com',
            'city_id' => $city->id,
            'team_id' => $team->id,
            'advisor_level_id' => $level->id,
            'personal_quota' => 10,
            'bank_cci' => '123',
        ])->assertSessionHasErrors(['bank_cci']);
    }

    public function test_authenticated_users_can_update_advisor_material_items_only(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::firstOrFail();
        $type = AdvisorMaterialType::query()->firstOrFail();
        $this->actingAs($user);

        $response = $this->put(route('inmopro.advisors.material-items.update', $advisor), [
            'material_items' => [
                [
                    'advisor_material_type_id' => $type->id,
                    'delivered_at' => '2026-04-20',
                    'notes' => 'Entregado en oficina',
                ],
            ],
        ]);

        $response->assertRedirect(route('inmopro.advisors.index'));
        $this->assertDatabaseHas('advisor_material_items', [
            'advisor_id' => $advisor->id,
            'advisor_material_type_id' => $type->id,
            'notes' => 'Entregado en oficina',
        ]);
        $row = AdvisorMaterialItem::query()
            ->where('advisor_id', $advisor->id)
            ->where('advisor_material_type_id', $type->id)
            ->first();
        $this->assertNotNull($row);
        $this->assertSame('2026-04-20', $row->delivered_at->format('Y-m-d'));
    }

    public function test_update_material_items_rejects_invalid_type_id(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::firstOrFail();
        $this->actingAs($user);

        $response = $this->from(route('inmopro.advisors.index'))->put(route('inmopro.advisors.material-items.update', $advisor), [
            'material_items' => [
                [
                    'advisor_material_type_id' => 999999,
                    'delivered_at' => null,
                    'notes' => null,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('material_items.0.advisor_material_type_id');
    }

    public function test_authenticated_users_can_append_material_delivery(): void
    {
        $user = User::factory()->create();
        $advisor = Advisor::firstOrFail();
        $type = AdvisorMaterialType::query()->firstOrFail();
        $this->actingAs($user);

        $this->post(route('inmopro.advisors.material-items.store', $advisor), [
            'advisor_material_type_id' => $type->id,
            'delivered_at' => '2026-04-01',
            'notes' => 'Primera entrega',
        ])->assertRedirect(route('inmopro.advisors.index'));

        $this->post(route('inmopro.advisors.material-items.store', $advisor), [
            'advisor_material_type_id' => $type->id,
            'delivered_at' => '2026-05-10',
            'notes' => 'Segunda entrega',
        ])->assertRedirect(route('inmopro.advisors.index'));

        $this->assertSame(
            2,
            AdvisorMaterialItem::query()
                ->where('advisor_id', $advisor->id)
                ->where('advisor_material_type_id', $type->id)
                ->count()
        );
    }

    public function test_advisors_index_echoes_filters_in_props(): void
    {
        $user = User::factory()->create();
        $level = AdvisorLevel::query()->firstOrFail();
        $team = Team::query()->firstOrFail();
        $this->actingAs($user);

        $this->get(route('inmopro.advisors.index', [
            'advisor_level_id' => $level->id,
            'team_id' => $team->id,
            'membership_pending' => '1',
        ]))->assertInertia(fn ($page) => $page
            ->component('inmopro/advisors/index')
            ->where('filters.advisor_level_id', (string) $level->id)
            ->where('filters.team_id', (string) $team->id)
            ->where('filters.membership_pending', '1'));
    }

    public function test_advisors_index_membership_pending_filter_limits_results(): void
    {
        $user = User::factory()->create();
        $level = AdvisorLevel::query()->firstOrFail();
        $team = Team::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $type = MembershipType::query()->create([
            'name' => 'Anual filtro',
            'months' => 12,
            'amount' => 1000,
        ]);

        $unpaidAdvisor = Advisor::query()->create([
            'dni' => '99001122',
            'first_name' => 'Pendiente',
            'last_name' => 'FiltroMemb',
            'phone' => '999000001',
            'email' => 'memb-pendiente-filtro@example.com',
            'username' => 'memb_pend_filtro',
            'pin' => '123456',
            'is_active' => true,
            'city_id' => $city->id,
            'team_id' => $team->id,
            'advisor_level_id' => $level->id,
            'superior_id' => null,
            'personal_quota' => 100,
        ]);

        $paidAdvisor = Advisor::query()->create([
            'dni' => '99001123',
            'first_name' => 'Pagada',
            'last_name' => 'FiltroMemb',
            'phone' => '999000002',
            'email' => 'memb-pagada-filtro@example.com',
            'username' => 'memb_pag_filtro',
            'pin' => '123456',
            'is_active' => true,
            'city_id' => $city->id,
            'team_id' => $team->id,
            'advisor_level_id' => $level->id,
            'superior_id' => null,
            'personal_quota' => 100,
        ]);

        AdvisorMembership::query()->create([
            'advisor_id' => $unpaidAdvisor->id,
            'membership_type_id' => $type->id,
            'year' => 2026,
            'amount' => 1000,
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);

        $paidMembership = AdvisorMembership::query()->create([
            'advisor_id' => $paidAdvisor->id,
            'membership_type_id' => $type->id,
            'year' => 2026,
            'amount' => 1000,
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);
        AdvisorMembershipPayment::query()->create([
            'advisor_membership_id' => $paidMembership->id,
            'amount' => 1000,
            'paid_at' => '2026-03-01',
            'notes' => null,
        ]);

        $this->actingAs($user);
        $response = $this->get(route('inmopro.advisors.index', [
            'membership_pending' => '1',
            'search' => 'memb-pendiente-filtro',
        ]));

        $response->assertOk();
        $response->assertSee('memb-pendiente-filtro@example.com', false);
        $response->assertDontSee('memb-pagada-filtro@example.com', false);
    }
}
