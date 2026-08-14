<?php

namespace Tests\Unit\Console;

use App\Console\ServeCommand;
use Illuminate\Foundation\Console\ServeCommand as LaravelServeCommand;
use Tests\TestCase;

class ServeCommandTest extends TestCase
{
    public function test_development_server_uses_raised_php_upload_limits(): void
    {
        $command = $this->app->make(LaravelServeCommand::class);

        $this->assertInstanceOf(ServeCommand::class, $command);
        $this->assertStringContainsString(
            'upload_max_filesize=40M',
            (string) file_get_contents((new \ReflectionClass($command))->getFileName()),
        );
        $this->assertStringContainsString(
            'post_max_size=128M',
            (string) file_get_contents((new \ReflectionClass($command))->getFileName()),
        );
    }
}
