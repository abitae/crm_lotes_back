<?php

use App\Http\Middleware\AuthenticateAdvisorApiToken;
use App\Http\Middleware\AuthenticateDateroApiToken;
use App\Http\Middleware\EnsureAdvisorIsActive;
use App\Http\Middleware\EnsureAdvisorPinIsCurrent;
use App\Http\Middleware\EnsureInmoproRoutePermission;
use App\Http\Middleware\EnsureOpenAiCazadorEnabled;
use App\Http\Middleware\EnsureUserIsSuperAdmin;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RecordInmoproAudit;
use App\Http\Middleware\ShareCrmInertiaData;
use App\Http\Requests\Inmopro\StoreProject360PanoramasRequest;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'advisor.api' => AuthenticateAdvisorApiToken::class,
            'datero.api' => AuthenticateDateroApiToken::class,
            'openai.cazador' => EnsureOpenAiCazadorEnabled::class,
            'inmopro.permission' => EnsureInmoproRoutePermission::class,
            'inmopro.audit' => RecordInmoproAudit::class,
            'rbac.super-admin' => EnsureUserIsSuperAdmin::class,
            'advisor.active' => EnsureAdvisorIsActive::class,
            'advisor.pin-current' => EnsureAdvisorPinIsCurrent::class,
            'crm.share-inertia' => ShareCrmInertiaData::class,
        ]);

        $middleware->redirectGuestsTo(function (Request $request): string {
            return $request->is('crm', 'crm/*')
                ? route('crm.login')
                : route('login');
        });

        $middleware->redirectUsersTo(function (Request $request): string {
            return $request->is('crm', 'crm/*')
                ? route('crm.dashboard')
                : route('dashboard');
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport([PostTooLargeException::class]);
        $exceptions->map(function (PostTooLargeException $exception): ValidationException {
            $message = StoreProject360PanoramasRequest::uploadFailedMessage();

            return ValidationException::withMessages([
                'panorama_files' => $message,
                'file' => $message,
            ]);
        });
    })->create();
