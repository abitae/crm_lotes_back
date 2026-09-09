<?php

namespace Tests\Feature\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\User;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\CitySeeder;
use Database\Seeders\Inmopro\ClientTagSeeder;
use Database\Seeders\Inmopro\ClientTypeSeeder;
use Database\Seeders\Inmopro\CommissionStatusSeeder;
use Database\Seeders\Inmopro\LotStatusSeeder;
use Database\Seeders\Inmopro\ProjectSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InmoproClientDuplicateMergeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(TeamSeeder::class);
        $this->seed(ClientTypeSeeder::class);
        $this->seed(ClientTagSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(LotStatusSeeder::class);
        $this->seed(CommissionStatusSeeder::class);
        $this->seed(ProjectSeeder::class);
        $this->seed(CitySeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_phone_duplicates_lists_only_groups_with_two_or_more_clients(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();

        Client::create([
            'name' => 'Solo Uno',
            'dni' => '10000001',
            'phone' => '911111111',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $keep = Client::create([
            'name' => 'Duplicado A',
            'dni' => '10000002',
            'phone' => '987-654-321',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $merge = Client::create([
            'name' => 'Duplicado B',
            'dni' => '10000003',
            'phone' => '987654321',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $this->actingAs($user);

        $response = $this->getJson(route('inmopro.clients.phone-duplicates'));

        $response->assertOk();
        $response->assertJsonCount(1, 'groups');
        $response->assertJsonPath('groups.0.key', '987654321');
        $ids = collect($response->json('groups.0.clients'))->pluck('id')->sort()->values()->all();
        $this->assertSame([$keep->id, $merge->id], $ids);
    }

    public function test_dni_duplicates_lists_only_groups_with_two_or_more_clients(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();

        Client::create([
            'name' => 'DNI Unico',
            'dni' => '11111111',
            'phone' => '911111112',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $keep = Client::create([
            'name' => 'DNI Dup A',
            'dni' => '22.222.222',
            'phone' => '922222221',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $merge = Client::create([
            'name' => 'DNI Dup B',
            'dni' => '22222222',
            'phone' => '922222222',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $this->actingAs($user);

        $response = $this->getJson(route('inmopro.clients.dni-duplicates'));

        $response->assertOk();
        $response->assertJsonCount(1, 'groups');
        $response->assertJsonPath('groups.0.key', '22222222');
        $ids = collect($response->json('groups.0.clients'))->pluck('id')->sort()->values()->all();
        $this->assertSame([$keep->id, $merge->id], $ids);
    }

    public function test_merge_by_phone_moves_relations_and_deletes_duplicates(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $project = Project::query()->firstOrFail();
        $lotStatus = LotStatus::query()->firstOrFail();
        $tagKeep = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'WHATSAPP')->firstOrFail();
        $tagMerge = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'CALIENTE')->firstOrFail();

        $keep = Client::create([
            'name' => 'Principal Merge',
            'dni' => '20000001',
            'phone' => '955555555',
            'email' => 'keep@example.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
        $keep->tags()->attach($tagKeep->id);

        $duplicate = Client::create([
            'name' => 'Secundario Merge',
            'dni' => '20000002',
            'phone' => '955-555-555',
            'email' => 'dup@example.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
        $duplicate->tags()->attach([$tagKeep->id, $tagMerge->id]);

        $lot = Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'client_id' => $duplicate->id,
            'block' => 'A',
            'number' => '99',
            'area' => 120,
            'price' => 25000,
            'lot_status_id' => $lotStatus->id,
        ]);

        $this->actingAs($user);

        $response = $this->post(route('inmopro.clients.merge-by-phone'), [
            'keep_client_id' => $keep->id,
            'merge_client_ids' => [$duplicate->id],
        ]);

        $response->assertRedirect(route('inmopro.clients.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('clients', ['id' => $duplicate->id]);
        $this->assertDatabaseHas('clients', [
            'id' => $keep->id,
            'name' => 'Principal Merge',
            'email' => 'keep@example.com',
        ]);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'client_id' => $keep->id,
        ]);

        $keep->refresh();
        $this->assertEqualsCanonicalizing(
            [$tagKeep->id, $tagMerge->id],
            $keep->tags()->pluck('client_tags.id')->map(fn ($id) => (int) $id)->all()
        );
    }

    public function test_merge_by_dni_moves_relations_and_deletes_duplicates(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();
        $project = Project::query()->firstOrFail();
        $lotStatus = LotStatus::query()->firstOrFail();
        $tagKeep = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'WHATSAPP')->firstOrFail();
        $tagMerge = ClientTag::query()->forAdvisor($advisor->id)->where('code', 'FRIO')->firstOrFail();

        $keep = Client::create([
            'name' => 'Principal DNI',
            'dni' => '44556677',
            'phone' => '966666661',
            'email' => 'keep-dni@example.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
        $keep->tags()->attach($tagKeep->id);

        $duplicate = Client::create([
            'name' => 'Secundario DNI',
            'dni' => '44-556-677',
            'phone' => '966666662',
            'email' => 'dup-dni@example.com',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);
        $duplicate->tags()->attach([$tagKeep->id, $tagMerge->id]);

        $lot = Lot::create([
            'project_id' => $project->id,
            'advisor_id' => $advisor->id,
            'client_id' => $duplicate->id,
            'block' => 'B',
            'number' => '12',
            'area' => 90,
            'price' => 18000,
            'lot_status_id' => $lotStatus->id,
        ]);

        $this->actingAs($user);

        $response = $this->post(route('inmopro.clients.merge-by-dni'), [
            'keep_client_id' => $keep->id,
            'merge_client_ids' => [$duplicate->id],
        ]);

        $response->assertRedirect(route('inmopro.clients.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('clients', ['id' => $duplicate->id]);
        $this->assertDatabaseHas('clients', [
            'id' => $keep->id,
            'name' => 'Principal DNI',
            'email' => 'keep-dni@example.com',
            'phone' => '966666661',
        ]);
        $this->assertDatabaseHas('lots', [
            'id' => $lot->id,
            'client_id' => $keep->id,
        ]);

        $keep->refresh();
        $this->assertEqualsCanonicalizing(
            [$tagKeep->id, $tagMerge->id],
            $keep->tags()->pluck('client_tags.id')->map(fn ($id) => (int) $id)->all()
        );
    }

    public function test_merge_by_phone_rejects_clients_with_different_phones(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();

        $keep = Client::create([
            'name' => 'Tel A',
            'dni' => '30000001',
            'phone' => '933333333',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $other = Client::create([
            'name' => 'Tel B',
            'dni' => '30000002',
            'phone' => '944444444',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $this->actingAs($user);

        $response = $this->from(route('inmopro.clients.index'))
            ->post(route('inmopro.clients.merge-by-phone'), [
                'keep_client_id' => $keep->id,
                'merge_client_ids' => [$other->id],
            ]);

        $response->assertSessionHasErrors('merge_client_ids');
        $this->assertDatabaseHas('clients', ['id' => $keep->id]);
        $this->assertDatabaseHas('clients', ['id' => $other->id]);
    }

    public function test_merge_by_dni_rejects_clients_with_different_dnis(): void
    {
        $user = User::factory()->create();
        $type = ClientType::query()->firstOrFail();
        $advisor = Advisor::query()->firstOrFail();
        $city = City::query()->firstOrFail();

        $keep = Client::create([
            'name' => 'DNI A',
            'dni' => '55555555',
            'phone' => '955555551',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $other = Client::create([
            'name' => 'DNI B',
            'dni' => '66666666',
            'phone' => '955555552',
            'client_type_id' => $type->id,
            'city_id' => $city->id,
            'advisor_id' => $advisor->id,
        ]);

        $this->actingAs($user);

        $response = $this->from(route('inmopro.clients.index'))
            ->post(route('inmopro.clients.merge-by-dni'), [
                'keep_client_id' => $keep->id,
                'merge_client_ids' => [$other->id],
            ]);

        $response->assertSessionHasErrors('merge_client_ids');
        $this->assertDatabaseHas('clients', ['id' => $keep->id]);
        $this->assertDatabaseHas('clients', ['id' => $other->id]);
    }

    public function test_guests_cannot_list_or_merge_duplicates(): void
    {
        $this->getJson(route('inmopro.clients.phone-duplicates'))
            ->assertUnauthorized();
        $this->getJson(route('inmopro.clients.dni-duplicates'))
            ->assertUnauthorized();

        $this->post(route('inmopro.clients.merge-by-phone'), [
            'keep_client_id' => 1,
            'merge_client_ids' => [2],
        ])->assertRedirect(route('login'));

        $this->post(route('inmopro.clients.merge-by-dni'), [
            'keep_client_id' => 1,
            'merge_client_ids' => [2],
        ])->assertRedirect(route('login'));
    }
}
