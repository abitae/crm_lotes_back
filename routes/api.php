<?php

use App\Http\Controllers\Api\v1\Cazador\AppVersionController;
use App\Http\Controllers\Api\v1\Cazador\AttentionTicketController;
use App\Http\Controllers\Api\v1\Cazador\AttentionTicketTypeController;
use App\Http\Controllers\Api\v1\Cazador\AuthController;
use App\Http\Controllers\Api\v1\Cazador\CityController;
use App\Http\Controllers\Api\v1\Cazador\ClientController;
use App\Http\Controllers\Api\v1\Cazador\ClientStatusController;
use App\Http\Controllers\Api\v1\Cazador\ClientTagController;
use App\Http\Controllers\Api\v1\Cazador\DashboardController;
use App\Http\Controllers\Api\v1\Cazador\DateroController;
use App\Http\Controllers\Api\v1\Cazador\GoogleAuthController as CazadorGoogleAuthController;
use App\Http\Controllers\Api\v1\Cazador\InboxController as CazadorInboxController;
use App\Http\Controllers\Api\v1\Cazador\LotController;
use App\Http\Controllers\Api\v1\Cazador\PreReservationController;
use App\Http\Controllers\Api\v1\Cazador\ProfileController;
use App\Http\Controllers\Api\v1\Cazador\ProjectAssetShareLinkController;
use App\Http\Controllers\Api\v1\Cazador\ProjectController;
use App\Http\Controllers\Api\v1\Cazador\ReminderController;
use App\Http\Controllers\Api\v1\Cazador\SharedProjectAssetController;
use App\Http\Controllers\Api\v1\Datero\AuthController as DateroAuthController;
use App\Http\Controllers\Api\v1\Datero\CityController as DateroCityController;
use App\Http\Controllers\Api\v1\Datero\ClientController as DateroClientController;
use App\Http\Controllers\Api\v1\Datero\GoogleAuthController as DateroGoogleAuthController;
use App\Http\Controllers\Api\v1\Datero\ProfileController as DateroProfileController;
use App\Http\Controllers\Api\v1\Datero\ProjectController as DateroProjectController;
use App\Http\Controllers\Api\v1\Datero\RegistrationLookupController;
use App\Http\Controllers\Api\v1\Web\Project360Controller as WebProject360Controller;
use App\Http\Controllers\Api\v1\Web\WebController;
use Illuminate\Support\Facades\Route;

require __DIR__.'/openai-cazador.php';

Route::prefix('v1/web')->name('api.v1.web.')->middleware('throttle:120,1')->group(function (): void {
    Route::get('projects', [WebController::class, 'index'])->name('projects.index');
    Route::get('projects/{project}', [WebController::class, 'show'])->name('projects.show');
    Route::get('projects/{project}/assets/{asset}', [WebController::class, 'asset'])->name('projects.assets.show');
    Route::get('projects/{project}/tour-360', [WebProject360Controller::class, 'show'])->name('projects.tour-360.show');
    Route::get('projects/{project}/tour-360/panoramas/{panorama}', [WebProject360Controller::class, 'panorama'])->name('projects.tour-360.panoramas.show');
});

Route::prefix('v1/cazador')->name('api.v1.cazador.')->group(function (): void {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:cazador-login')
        ->name('auth.login');

    Route::post('auth/google', [CazadorGoogleAuthController::class, 'login'])
        ->middleware('throttle:google-auth')
        ->name('auth.google');

    Route::get('app-version', [AppVersionController::class, 'show'])
        ->middleware('throttle:60,1')
        ->name('app-version.show');

    Route::get('shared/assets/{asset}', [SharedProjectAssetController::class, 'show'])
        ->middleware('signed')
        ->name('shared-assets.show');

    Route::middleware('advisor.api')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('me', [ProfileController::class, 'show'])->name('me.show');
        Route::put('me', [ProfileController::class, 'update'])->name('me.update');
        Route::put('me/pin', [ProfileController::class, 'updatePin'])->name('me.pin.update');

        Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard.show');

        Route::get('inbox', [CazadorInboxController::class, 'index'])->name('inbox.index');

        Route::get('cities', [CityController::class, 'index'])->name('cities.index');

        Route::get('dateros', [DateroController::class, 'index'])->name('dateros.index');
        Route::post('dateros', [DateroController::class, 'store'])->name('dateros.store');
        Route::put('dateros/{datero}', [DateroController::class, 'update'])->name('dateros.update');

        Route::get('client-statuses', [ClientStatusController::class, 'index'])->name('client-statuses.index');
        Route::get('client-tags', [ClientTagController::class, 'index'])->name('client-tags.index');

        Route::get('clients', [ClientController::class, 'index'])->name('clients.index');
        Route::post('clients', [ClientController::class, 'store'])->name('clients.store');
        Route::get('clients/{client}', [ClientController::class, 'show'])->name('clients.show');
        Route::match(['put', 'patch'], 'clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        Route::patch('clients/{client}/crm', [ClientController::class, 'updateCrm'])->name('clients.crm.update');
        Route::post('clients/{client}/crm/events', [ClientController::class, 'storeCrmEvent'])->name('clients.crm.events.store');
        Route::get('attention-ticket-types', [AttentionTicketTypeController::class, 'index'])->name('attention-ticket-types.index');
        Route::get('attention-tickets', [AttentionTicketController::class, 'index'])->name('attention-tickets.index');
        Route::post('attention-tickets', [AttentionTicketController::class, 'store'])->name('attention-tickets.store');
        Route::post('attention-tickets/{attentionTicket}/cancel', [AttentionTicketController::class, 'cancel'])->name('attention-tickets.cancel');

        Route::get('reminders', [ReminderController::class, 'index'])->name('reminders.index');
        Route::post('reminders', [ReminderController::class, 'store'])->name('reminders.store');
        Route::get('reminders/{reminder}', [ReminderController::class, 'show'])->name('reminders.show');
        Route::put('reminders/{reminder}', [ReminderController::class, 'update'])->name('reminders.update');
        Route::delete('reminders/{reminder}', [ReminderController::class, 'destroy'])->name('reminders.destroy');
        Route::post('reminders/{reminder}/complete', [ReminderController::class, 'complete'])->name('reminders.complete');

        Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::get('projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
        Route::get('projects/{project}/assets/{asset}/download', [ProjectController::class, 'downloadAsset'])->name('projects.assets.download');
        Route::post('projects/{project}/assets/share-links', [ProjectAssetShareLinkController::class, 'store'])
            ->middleware('throttle:cazador-share-links')
            ->name('projects.assets.share-links');
        Route::get('my-lots', [LotController::class, 'indexMine'])->name('my-lots.index');
        Route::get('lots', [LotController::class, 'index'])->name('lots.index');
        Route::get('lots/{lot}', [LotController::class, 'show'])->name('lots.show');
        Route::post('lots/{lot}/pre-reservations', [PreReservationController::class, 'store'])->name('lots.pre-reservations.store');
    });
});

Route::prefix('v1/datero')->name('api.v1.datero.')->group(function (): void {
    Route::get('auth/cities', [RegistrationLookupController::class, 'cities'])
        ->middleware('throttle:google-auth')
        ->name('auth.cities');

    Route::get('auth/advisors', [RegistrationLookupController::class, 'advisors'])
        ->middleware('throttle:google-auth')
        ->name('auth.advisors');

    Route::post('auth/google/register', [DateroGoogleAuthController::class, 'register'])
        ->middleware('throttle:google-auth')
        ->name('auth.google.register');

    Route::post('auth/google', [DateroGoogleAuthController::class, 'login'])
        ->middleware('throttle:google-auth')
        ->name('auth.google');

    Route::post('auth/login', [DateroAuthController::class, 'login'])
        ->middleware('throttle:datero-login')
        ->name('auth.login');

    Route::middleware('datero.api')->group(function (): void {
        Route::post('auth/logout', [DateroAuthController::class, 'logout'])->name('auth.logout');
        Route::get('me', [DateroProfileController::class, 'show'])->name('me.show');
        Route::put('me/pin', [DateroProfileController::class, 'updatePin'])->name('me.pin.update');

        Route::get('cities', [DateroCityController::class, 'index'])->name('cities.index');

        Route::get('projects', [DateroProjectController::class, 'index'])->name('projects.index');

        Route::get('clients', [DateroClientController::class, 'index'])->name('clients.index');
        Route::post('clients', [DateroClientController::class, 'store'])->name('clients.store');
        Route::get('clients/{client}', [DateroClientController::class, 'show'])->name('clients.show');
        Route::match(['put', 'patch'], 'clients/{client}', [DateroClientController::class, 'update'])->name('clients.update');
    });
});
