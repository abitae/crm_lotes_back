<?php

namespace Tests\Feature\Inmopro;

use App\Models\AppBranding;
use App\Models\User;
use App\Support\AppBrandingResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AppBrandingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        AppBrandingResolver::forgetCache();
    }

    public function test_guest_cannot_view_branding_page(): void
    {
        $this->get(route('inmopro.branding.edit'))
            ->assertRedirect();
    }

    public function test_authenticated_user_can_view_branding_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('inmopro.branding.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('inmopro/branding')
                ->has('branding'));
    }

    public function test_authenticated_user_can_update_display_name(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'Mi inmobiliaria',
            ])
            ->assertRedirect(route('inmopro.branding.edit'));

        $this->assertSame('Mi inmobiliaria', AppBranding::current()->display_name);
        AppBrandingResolver::forgetCache();
        $this->assertSame('Mi inmobiliaria', AppBrandingResolver::resolvedDisplayName());
    }

    public function test_empty_display_name_is_stored_as_null_and_falls_back_to_config(): void
    {
        $user = User::factory()->create();

        AppBranding::current()->update(['display_name' => 'Temporal']);
        AppBrandingResolver::forgetCache();

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => '',
            ])
            ->assertRedirect(route('inmopro.branding.edit'));

        $this->assertNull(AppBranding::current()->display_name);
        AppBrandingResolver::forgetCache();
        $this->assertSame(config('app.name'), AppBrandingResolver::resolvedDisplayName());
    }

    public function test_authenticated_user_can_upload_logo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('logo.png', 120, 120);

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'Con logo',
                'logo' => $file,
            ])
            ->assertRedirect(route('inmopro.branding.edit'));

        $path = AppBranding::current()->logo_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        AppBrandingResolver::forgetCache();
        $this->assertNotNull(AppBrandingResolver::logoUrl());
    }

    public function test_authenticated_user_can_remove_logo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('logo.png', 80, 80);

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'X',
                'logo' => $file,
            ]);

        $path = AppBranding::current()->logo_path;
        $this->assertNotNull($path);

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'X',
                'remove_logo' => true,
            ])
            ->assertRedirect(route('inmopro.branding.edit'));

        $this->assertNull(AppBranding::current()->logo_path);
        Storage::disk('public')->assertMissing($path);
        AppBrandingResolver::forgetCache();
        $this->assertNull(AppBrandingResolver::logoUrl());
    }

    public function test_update_rejects_invalid_logo_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'X',
                'logo' => $file,
            ])
            ->assertSessionHasErrors('logo');
    }

    public function test_authenticated_user_can_update_tagline_and_primary_color(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'Marca',
                'tagline' => 'Lotes y más',
                'primary_color' => '#a1b2c3',
            ])
            ->assertRedirect(route('inmopro.branding.edit'));

        $row = AppBranding::current();
        $this->assertSame('Lotes y más', $row->tagline);
        $this->assertSame('#a1b2c3', $row->primary_color);

        AppBrandingResolver::forgetCache();
        $this->assertSame('Lotes y más', AppBrandingResolver::tagline());
        $this->assertSame('#a1b2c3', AppBrandingResolver::primaryColorHex());
    }

    public function test_update_rejects_invalid_primary_color(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'X',
                'primary_color' => 'red',
            ])
            ->assertSessionHasErrors('primary_color');
    }

    public function test_authenticated_user_can_upload_favicon(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('favicon.png', 32, 32);

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'Con favicon',
                'favicon' => $file,
            ])
            ->assertRedirect(route('inmopro.branding.edit'));

        $path = AppBranding::current()->favicon_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        AppBrandingResolver::forgetCache();
        $this->assertNotNull(AppBrandingResolver::faviconUrl());
    }

    public function test_gcs_logo_url_is_regenerated_instead_of_caching_an_expired_signed_url(): void
    {
        Storage::fake('gcs');
        config([
            'filesystems.default' => 'gcs',
            'cazador.default_storage_disk' => 'gcs',
            'filesystems.temporary_urls.catalog_ttl_minutes' => 60,
        ]);
        Storage::disk('gcs')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): string => 'https://signed.test/'.$path.'?expires='.$expiration->getTimestamp(),
        );

        Storage::disk('gcs')->put('branding/logo.png', 'fake');
        AppBranding::current()->update(['logo_path' => 'branding/logo.png']);
        AppBrandingResolver::forgetCache();

        $first = AppBrandingResolver::logoUrl();
        $this->travel(2)->hours();
        $second = AppBrandingResolver::logoUrl();

        parse_str((string) parse_url((string) $first, PHP_URL_QUERY), $firstQuery);
        parse_str((string) parse_url((string) $second, PHP_URL_QUERY), $secondQuery);

        $this->assertNotSame($firstQuery['expires'] ?? null, $secondQuery['expires'] ?? null);
        $this->assertEqualsWithDelta(now()->addMinutes(60)->timestamp, (int) ($secondQuery['expires'] ?? 0), 5);
    }

    public function test_login_page_shares_logo_url(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('logo.png', 120, 120);

        $this->actingAs($user)
            ->put(route('inmopro.branding.update'), [
                'display_name' => 'Con logo',
                'logo' => $file,
            ]);

        $this->post(route('logout'));

        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('brandingLogoUrl', fn ($url) => is_string($url) && $url !== ''));
    }
}
