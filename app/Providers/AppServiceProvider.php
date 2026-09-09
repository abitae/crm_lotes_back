<?php

namespace App\Providers;

use App\Console\ServeCommand;
use App\Contracts\Google\GoogleIdTokenVerifier;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorReminder;
use App\Models\User;
use App\Observers\AdvisorObserver;
use App\Observers\AdvisorReminderObserver;
use App\Services\Google\GoogleIdTokenVerifierService;
use App\Support\AppBrandingResolver;
use App\Support\OpenAiCazadorConfigResolver;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Console\ServeCommand as LaravelServeCommand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(GoogleIdTokenVerifier::class, GoogleIdTokenVerifierService::class);

        $this->app->extend(LaravelServeCommand::class, function ($command) {
            return $command instanceof ServeCommand
                ? $command
                : $this->app->make(ServeCommand::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        OpenAiCazadorConfigResolver::applyRuntimeConfig();
        $this->configureRateLimiting();
        $this->configureViewComposers();
        Advisor::observe(AdvisorObserver::class);
        AdvisorReminder::observe(AdvisorReminderObserver::class);
    }

    protected function configureViewComposers(): void
    {
        View::composer('app', function (\Illuminate\View\View $view): void {
            $view->with([
                'resolvedAppName' => AppBrandingResolver::resolvedDisplayName(),
                'brandingFaviconUrl' => AppBrandingResolver::faviconUrl(),
                'brandingPrimaryColorHex' => AppBrandingResolver::primaryColorHex(),
            ]);
        });

        View::composer(
            ['inmopro.report-pdf', 'inmopro.lots-export-pdf'],
            function (\Illuminate\View\View $view): void {
                $view->with('resolvedAppName', AppBrandingResolver::resolvedDisplayName());
            }
        );
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('ai', function (Request $request) {
            $key = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

            return Limit::perMinute(10)->by($key);
        });

        RateLimiter::for('ai-cazador', function (Request $request) {
            $advisor = $request->attributes->get('advisor');
            $key = $advisor ? 'advisor:'.$advisor->id : (string) $request->ip();

            return Limit::perMinute((int) config('openai_cazador.rate_limit', 8))->by($key);
        });

        RateLimiter::for('ai-cazador-knowledge', function (Request $request) {
            $advisor = $request->attributes->get('advisor');
            $key = $advisor ? 'advisor:'.$advisor->id : (string) $request->ip();

            return Limit::perMinute((int) config('openai_cazador.knowledge_rate_limit', 60))->by($key);
        });

        RateLimiter::for('cazador-share-links', function (Request $request) {
            $advisor = $request->attributes->get('advisor');
            $key = $advisor ? 'advisor:'.$advisor->id : (string) $request->ip();

            return Limit::perMinute(60)->by($key);
        });

        RateLimiter::for('cazador-login', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('datero-login', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('google-auth', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('crm-login', function (Request $request) {
            $username = strtolower((string) $request->input('username'));

            return [
                // Fast per-connection throttle: stops a single client from hammering the endpoint.
                Limit::perMinute(10)->by($username.'|'.$request->ip()),
                // Account-level throttle, independent of source IP: caps total PIN guesses
                // against one username even if an attacker rotates IPs to dodge the limit above.
                Limit::perMinutes(30, 20)->by('username:'.$username),
            ];
        });

        RateLimiter::for('crm-forgot-pin', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perHour(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('datero-public-register', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('datero-public-qr', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('project-360-public', function (Request $request) {
            $shareLink = $request->route('shareLink');
            $project = $request->route('project');
            $key = '';

            if (is_object($shareLink) && isset($shareLink->id)) {
                $key = (string) $shareLink->id;
            } elseif (filled($shareLink)) {
                $key = (string) $shareLink;
            } elseif (is_object($project) && isset($project->id)) {
                $key = 'project:'.$project->id;
            } elseif (filled($project)) {
                $key = 'project:'.$project;
            }

            return Limit::perMinute(120)->by($request->ip().':'.$key);
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );

        Gate::before(function (?User $user, string $ability): ?bool {
            if (! $user instanceof User) {
                return null;
            }

            return $user->hasRole('super-admin') ? true : null;
        });
    }
}
