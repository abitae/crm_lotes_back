<?php

namespace Tests\Unit\Services\Inmopro;

use App\Services\Inmopro\ProjectLocationMapsResolver;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProjectLocationMapsResolverTest extends TestCase
{
    private ProjectLocationMapsResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = app(ProjectLocationMapsResolver::class);
    }

    #[DataProvider('googleMapsUrlProvider')]
    public function test_is_google_maps_url_accepts_valid_urls(string $url): void
    {
        $this->assertTrue($this->resolver->isGoogleMapsUrl($url));
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function googleMapsUrlProvider(): array
    {
        return [
            'maps search url' => ['https://www.google.com/maps/search/?api=1&query=Lima'],
            'maps place url' => ['https://www.google.com/maps/place/Huancayo'],
            'maps google host' => ['https://maps.google.com/?q=Lima'],
            'maps app short link' => ['https://maps.app.goo.gl/abc123'],
            'goo gl maps link' => ['https://goo.gl/maps/abc123'],
        ];
    }

    #[DataProvider('invalidGoogleMapsUrlProvider')]
    public function test_is_google_maps_url_rejects_invalid_urls(string $value): void
    {
        $this->assertFalse($this->resolver->isGoogleMapsUrl($value));
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function invalidGoogleMapsUrlProvider(): array
    {
        return [
            'plain text' => ['Huancayo'],
            'generic url' => ['https://example.com/maps'],
            'google without maps path' => ['https://www.google.com/search?q=lima'],
            'empty string' => [''],
        ];
    }

    public function test_resolve_maps_url_returns_direct_url_when_location_is_google_maps_link(): void
    {
        $url = 'https://maps.app.goo.gl/abc123';

        $this->assertSame($url, $this->resolver->resolveMapsUrl($url));
    }

    public function test_is_coordinate_pair_accepts_valid_coordinates(): void
    {
        $this->assertTrue($this->resolver->isCoordinatePair('-12.046374,-77.042793'));
        $this->assertTrue($this->resolver->isCoordinatePair(' -12.046374, -77.042793 '));
    }

    public function test_is_coordinate_pair_rejects_invalid_coordinates(): void
    {
        $this->assertFalse($this->resolver->isCoordinatePair('Huancayo'));
        $this->assertFalse($this->resolver->isCoordinatePair('-91,-77'));
        $this->assertFalse($this->resolver->isCoordinatePair('-12,-181'));
    }

    public function test_resolve_maps_url_builds_search_url_for_coordinates(): void
    {
        $this->assertSame(
            'https://www.google.com/maps/search/?api=1&query=-12.046374%2C-77.042793',
            $this->resolver->resolveMapsUrl('-12.046374,-77.042793')
        );
    }

    public function test_resolve_maps_url_builds_search_url_for_legacy_text(): void
    {
        $this->assertSame(
            'https://www.google.com/maps/search/?api=1&query=Huancayo',
            $this->resolver->resolveMapsUrl('Huancayo')
        );
    }

    public function test_resolve_maps_url_returns_null_for_empty_location(): void
    {
        $this->assertNull($this->resolver->resolveMapsUrl(null));
        $this->assertNull($this->resolver->resolveMapsUrl(''));
        $this->assertNull($this->resolver->resolveMapsUrl('   '));
    }

    public function test_display_label_returns_friendly_text_for_google_maps_url(): void
    {
        $this->assertSame(
            'Abrir en Google Maps',
            $this->resolver->displayLabel('https://maps.app.goo.gl/abc123')
        );
    }

    public function test_display_label_returns_friendly_text_for_coordinates(): void
    {
        $this->assertSame(
            'Abrir en Google Maps',
            $this->resolver->displayLabel('-12.069872155122834, -75.21095243577143')
        );
    }

    public function test_display_label_returns_legacy_text_for_non_url_location(): void
    {
        $this->assertSame('Huancayo', $this->resolver->displayLabel('Huancayo'));
    }

    public function test_display_label_returns_null_for_empty_location(): void
    {
        $this->assertNull($this->resolver->displayLabel(null));
        $this->assertNull($this->resolver->displayLabel(''));
    }
}
