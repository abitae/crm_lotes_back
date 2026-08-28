<?php

namespace Tests\Feature\Crm;

use App\Models\Inmopro\Advisor;
use Database\Seeders\Inmopro\AdvisorLevelSeeder;
use Database\Seeders\Inmopro\AdvisorSeeder;
use Database\Seeders\Inmopro\TeamSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TeamSeeder::class);
        $this->seed(AdvisorLevelSeeder::class);
        $this->seed(AdvisorSeeder::class);
    }

    public function test_advisor_can_update_own_profile(): void
    {
        $advisor = Advisor::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->patch(route('crm.profile.update'), [
            'name' => 'Nombre Actualizado',
            'phone' => '999888777',
            'email' => 'actualizado@test.com',
            'username' => $advisor->username,
        ])->assertRedirect(route('crm.profile.edit'));

        $this->assertDatabaseHas('advisors', [
            'id' => $advisor->id,
            'phone' => '999888777',
            'email' => 'actualizado@test.com',
        ]);
    }

    public function test_advisor_can_change_own_pin_with_correct_current_pin(): void
    {
        $advisor = Advisor::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->put(route('crm.profile.pin.update'), [
            'current_pin' => '123456',
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ])->assertRedirect(route('crm.profile.edit'));

        $this->post(route('crm.logout'));

        $this->post(route('crm.login.store'), [
            'username' => $advisor->username,
            'pin' => '654321',
        ])->assertRedirect(route('crm.dashboard'));
    }

    public function test_advisor_cannot_change_pin_with_wrong_current_pin(): void
    {
        $advisor = Advisor::firstOrFail();
        $this->actingAs($advisor, 'advisor');

        $this->put(route('crm.profile.pin.update'), [
            'current_pin' => '000000',
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ])->assertSessionHasErrors('current_pin');
    }

    public function test_advisor_with_pending_pin_change_is_redirected_away_from_other_crm_routes(): void
    {
        $advisor = Advisor::firstOrFail();
        $advisor->forceFill(['must_change_pin' => true])->save();
        $this->actingAs($advisor, 'advisor');

        $this->get(route('crm.dashboard'))->assertRedirect(route('crm.profile.edit'));
        $this->get(route('crm.clients.index'))->assertRedirect(route('crm.profile.edit'));

        // The profile screen itself, and the PIN-update endpoint, must remain reachable.
        $this->get(route('crm.profile.edit'))->assertOk();
    }

    public function test_changing_pin_clears_the_pending_pin_change_flag(): void
    {
        $advisor = Advisor::firstOrFail();
        $advisor->forceFill(['must_change_pin' => true])->save();
        $this->actingAs($advisor, 'advisor');

        $this->put(route('crm.profile.pin.update'), [
            'current_pin' => '123456',
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ])->assertRedirect(route('crm.profile.edit'));

        $this->assertDatabaseHas('advisors', [
            'id' => $advisor->id,
            'must_change_pin' => false,
        ]);

        // The flag being cleared unblocks the rest of the portal.
        $this->get(route('crm.dashboard'))->assertOk();
    }
}
