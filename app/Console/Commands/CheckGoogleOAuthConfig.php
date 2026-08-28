<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckGoogleOAuthConfig extends Command
{
    protected $signature = 'google:oauth-check {--app=cazador : cazador|datero|all}';

    protected $description = 'Valida variables OAuth de Google y muestra checklist de Google Cloud Console.';

    public function handle(): int
    {
        $app = strtolower((string) $this->option('app'));

        $this->info('Google OAuth — verificación de configuración');
        $this->newLine();

        $checks = [
            ['GOOGLE_CLIENT_ID (Web)', filled(config('google.client_id'))],
            ['GOOGLE_CLIENT_SECRET', filled(config('google.client_secret'))],
            ['GOOGLE_REDIRECT_URI', filled(config('services.google.redirect'))],
            ['GOOGLE_CALENDAR_REDIRECT_URI', filled(config('google.calendar_redirect_uri'))],
        ];

        if ($app === 'cazador' || $app === 'all') {
            $checks[] = ['GOOGLE_CAZADOR_IOS_CLIENT_ID', filled(config('google.mobile.cazador.ios_client_id'))];
            $checks[] = ['GOOGLE_CAZADOR_ANDROID_CLIENT_ID', filled(config('google.mobile.cazador.android_client_id'))];
        }

        if ($app === 'datero' || $app === 'all') {
            $checks[] = ['GOOGLE_DATERO_IOS_CLIENT_ID', filled(config('google.mobile.datero.ios_client_id'))];
            $checks[] = ['GOOGLE_DATERO_ANDROID_CLIENT_ID', filled(config('google.mobile.datero.android_client_id'))];
        }

        $missing = 0;

        foreach ($checks as [$label, $ok]) {
            $this->line(sprintf('  [%s] %s', $ok ? 'OK' : '!!', $label));

            if (! $ok) {
                $missing++;
            }
        }

        $this->newLine();
        $this->comment('Checklist Google Cloud Console (mismo proyecto OAuth):');
        $this->line('  1. APIs: habilitar "Google Calendar API" si usas sync de agenda CRM.');
        $this->line('  2. Cliente Web → Authorized redirect URIs:');
        $this->line('     - '.config('services.google.redirect'));
        $this->line('     - '.config('google.calendar_redirect_uri'));

        if ($app === 'cazador' || $app === 'all') {
            $this->newLine();
            $this->comment('Cazador (app móvil):');
            $this->line('  - Android OAuth: package com.abitae.app_cazador + SHA-1 (debug y/o EAS/Play).');
            $this->line('  - iOS OAuth: bundle com.abitae.cazador1');
            $this->line('  - En mobile/.env: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = GOOGLE_CLIENT_ID');
            $this->line('  - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = GOOGLE_CAZADOR_IOS_CLIENT_ID');
            $this->line('  - Build nativo EAS (no Expo Go). iosUrlScheme se deriva del iOS client ID en app.config.ts.');
        }

        if ($missing > 0) {
            $this->newLine();
            $this->warn("Faltan {$missing} variable(s). Copia crm_lotes_back/.env.example → .env y completa GOOGLE_*.");

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Configuración OAuth completa en el backend.');

        return self::SUCCESS;
    }
}
