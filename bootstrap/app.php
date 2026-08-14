<?php

use App\Http\Middleware\AuthenticateAdvisorApiToken;
use App\Http\Middleware\AuthenticateDateroApiToken;
use App\Http\Middleware\EnsureInmoproRoutePermission;
use App\Http\Middleware\EnsureOpenAiCazadorEnabled;
use App\Http\Middleware\EnsureUserIsSuperAdmin;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Requests\Inmopro\StoreProject360PanoramasRequest;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
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
            'rbac.super-admin' => EnsureUserIsSuperAdmin::class,
        ]);
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
