<?php

namespace Tests\Feature\Api\Interno;

use App\Jobs\SendTaskCompletedPush;
use App\Models\Task;
use App\Models\User;
use App\Models\UserPushToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Tests\TestCase;

class InternoTaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_logout(): void
    {
        $user = User::factory()->create([
            'email' => 'interno@example.com',
            'password' => 'password',
        ]);

        $login = $this->postJson(route('api.v1.interno.auth.login'), [
            'email' => 'interno@example.com',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);

        $this->withToken($login->json('token'))
            ->postJson(route('api.v1.interno.auth.logout'))
            ->assertOk();

        $this->assertDatabaseMissing('user_api_tokens', [
            'user_id' => $user->id,
        ]);
    }

    public function test_advisor_and_datero_credentials_are_rejected(): void
    {
        $this->postJson(route('api.v1.interno.auth.login'), [
            'email' => 'vendedor@example.com',
            'password' => '123456',
        ])->assertStatus(422);

        $this->postJson(route('api.v1.interno.auth.login'), [
            'email' => 'datero_api@example.com',
            'password' => '123456',
        ])->assertStatus(422);

        $this->assertDatabaseCount('user_api_tokens', 0);
    }

    public function test_user_with_two_factor_must_confirm_a_code(): void
    {
        User::factory()->withTwoFactor()->create([
            'email' => 'seguro@example.com',
            'password' => 'password',
        ]);

        $challenge = $this->postJson(route('api.v1.interno.auth.login'), [
            'email' => 'seguro@example.com',
            'password' => 'password',
        ])->assertOk()
            ->assertJson(['two_factor' => true])
            ->assertJsonMissingPath('token');

        $this->mock(TwoFactorAuthenticationProvider::class, function ($mock): void {
            $mock->shouldReceive('verify')->once()->andReturn(true);
        });

        $this->postJson(route('api.v1.interno.auth.two-factor'), [
            'challenge_token' => $challenge->json('challenge_token'),
            'code' => '123456',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id']]);
    }

    public function test_user_creates_tasks_for_self_and_others_and_cannot_see_foreign_tasks(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $stranger = User::factory()->create();
        $token = $this->tokenFor($owner);

        $this->withToken($token)
            ->postJson(route('api.v1.interno.tasks.store'), [
                'title' => 'Mi pendiente',
                'assigned_to' => $owner->id,
            ])->assertCreated();

        $this->withToken($token)
            ->postJson(route('api.v1.interno.tasks.store'), [
                'title' => 'Para el equipo',
                'assigned_to' => $other->id,
            ])->assertCreated();

        Task::factory()->create([
            'title' => 'Ajena',
            'created_by' => $stranger->id,
            'assigned_to' => $stranger->id,
        ]);

        $assigned = $this->withToken($token)
            ->getJson(route('api.v1.interno.tasks.index', ['scope' => 'asignadas']))
            ->assertOk()
            ->json('tasks');

        $created = $this->withToken($token)
            ->getJson(route('api.v1.interno.tasks.index', ['scope' => 'creadas']))
            ->assertOk()
            ->json('tasks');

        $this->assertSame(['Mi pendiente'], array_column($assigned, 'title'));
        $this->assertSame(['Para el equipo'], array_column($created, 'title'));
    }

    public function test_only_the_assignee_can_mark_a_task_and_the_creator_is_notified(): void
    {
        Cache::flush();
        Http::fake(['https://exp.host/*' => Http::response(['data' => [['status' => 'ok']]], 200)]);

        $creator = User::factory()->create(['name' => 'Ana']);
        $assignee = User::factory()->create(['name' => 'Luis']);
        UserPushToken::query()->create([
            'user_id' => $creator->id,
            'expo_push_token' => 'ExponentPushToken[abc]',
            'platform' => 'android',
        ]);
        $task = Task::factory()->create([
            'title' => 'Llamar al cliente',
            'created_by' => $creator->id,
            'assigned_to' => $assignee->id,
        ]);

        $this->withToken($this->tokenFor($creator))
            ->patchJson(route('api.v1.interno.tasks.completion', $task), ['completed' => true])
            ->assertForbidden();

        $this->withToken($this->tokenFor($assignee))
            ->patchJson(route('api.v1.interno.tasks.completion', $task), ['completed' => true])
            ->assertOk()
            ->assertJsonPath('task.completed_by.id', $assignee->id);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $creator->id,
            'notifiable_type' => User::class,
        ]);

        Http::assertSent(function ($request): bool {
            $payload = $request->data();

            return $request->url() === 'https://exp.host/--/api/v2/push/send'
                && ($payload[0]['to'] ?? null) === 'ExponentPushToken[abc]'
                && str_contains((string) ($payload[0]['body'] ?? ''), 'Llamar al cliente');
        });

        $this->assertTrue(class_exists(SendTaskCompletedPush::class));
    }

    public function test_completing_your_own_task_does_not_notify(): void
    {
        Http::fake();
        $user = User::factory()->create();
        $task = Task::factory()->create([
            'created_by' => $user->id,
            'assigned_to' => $user->id,
        ]);

        $this->withToken($this->tokenFor($user))
            ->patchJson(route('api.v1.interno.tasks.completion', $task), ['completed' => true])
            ->assertOk();

        $this->assertDatabaseCount('notifications', 0);
        Http::assertNothingSent();
    }

    public function test_login_route_is_rate_limited_per_ip(): void
    {
        Cache::flush();

        for ($i = 0; $i < 10; $i++) {
            $this->postJson(route('api.v1.interno.auth.login'), [
                'email' => 'nadie@example.com',
                'password' => 'password',
            ]);
        }

        $this->postJson(route('api.v1.interno.auth.login'), [
            'email' => 'nadie@example.com',
            'password' => 'password',
        ])->assertStatus(429);

        Cache::flush();
    }

    private function tokenFor(User $user): string
    {
        return $this->postJson(route('api.v1.interno.auth.login'), [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()->json('token');
    }
}
