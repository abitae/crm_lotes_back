<?php

use App\Http\Controllers\Meta\MetaWebhookController;
use App\Http\Controllers\Inmopro\DashboardController;
use App\Http\Controllers\LegalDocumentController;
use App\Http\Controllers\PublicDateroClientRegistrationController;
use App\Http\Controllers\PublicProject360Controller;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome'))->name('home');

Route::get('/registro-datero/{token}/qr.png', [PublicDateroClientRegistrationController::class, 'qrPng'])
    ->middleware('throttle:datero-public-qr')
    ->name('public.datero-registration.qr');
Route::get('/registro-datero/{token}', [PublicDateroClientRegistrationController::class, 'show'])
    ->name('public.datero-registration.show');
Route::post('/registro-datero/{token}', [PublicDateroClientRegistrationController::class, 'store'])
    ->middleware('throttle:datero-public-register')
    ->name('public.datero-registration.store');

Route::get('/legal/terminos', [LegalDocumentController::class, 'terms'])->name('legal.terms');
Route::get('/legal/privacidad', [LegalDocumentController::class, 'privacy'])->name('legal.privacy');

Route::prefix('tours/360')
    ->name('public.project-360.')
    ->middleware('throttle:project-360-public')
    ->group(function (): void {
        Route::get('projects/{project}', [PublicProject360Controller::class, 'showByProject'])->name('projects.show');
        Route::get('projects/{project}/panoramas/{panorama}', [PublicProject360Controller::class, 'panoramaByProject'])->name('projects.panoramas.show');
    });

Route::prefix('tours/360')
    ->name('public.project-360.')
    ->middleware(['signed', 'throttle:project-360-public'])
    ->group(function (): void {
        Route::get('{shareLink}', [PublicProject360Controller::class, 'show'])->name('show');
        Route::get('{shareLink}/panoramas/{panorama}', [PublicProject360Controller::class, 'panorama'])->name('panoramas.show');
    });

Route::get('dashboard', DashboardController::class)->middleware(['auth', 'verified'])->name('dashboard');

Route::get('webhooks/meta', [MetaWebhookController::class, 'verify']);
Route::post('webhooks/meta', [MetaWebhookController::class, 'receive']);

require __DIR__.'/inmopro.php';
require __DIR__.'/crm.php';
require __DIR__.'/settings.php';
