<?php

use App\Http\Controllers\Crm\AgendaController;
use App\Http\Controllers\Crm\AttentionTicketController;
use App\Http\Controllers\Crm\Auth\ForgotPinController;
use App\Http\Controllers\Crm\Auth\GoogleAuthController;
use App\Http\Controllers\Crm\Auth\LoginController;
use App\Http\Controllers\Crm\Auth\ResetPinController;
use App\Http\Controllers\Crm\AutomationFlowController;
use App\Http\Controllers\Crm\BroadcastController;
use App\Http\Controllers\Crm\ClientController;
use App\Http\Controllers\Crm\CommissionController;
use App\Http\Controllers\Crm\DashboardController;
use App\Http\Controllers\Crm\GoogleCalendarController;
use App\Http\Controllers\Crm\InboxController;
use App\Http\Controllers\Crm\LotController;
use App\Http\Controllers\Crm\MetaConnectionController;
use App\Http\Controllers\Crm\PipelineController;
use App\Http\Controllers\Crm\PreReservationController;
use App\Http\Controllers\Crm\ProfileController;
use App\Http\Controllers\Crm\ProjectController;
use App\Http\Controllers\Crm\ReminderController;
use Illuminate\Support\Facades\Route;

Route::prefix('crm')->name('crm.')->group(function (): void {
    Route::middleware('guest:advisor')->group(function (): void {
        Route::get('login', [LoginController::class, 'create'])->name('login');
        Route::post('login', [LoginController::class, 'store'])
            ->middleware('throttle:crm-login')
            ->name('login.store');

        Route::get('forgot-pin', [ForgotPinController::class, 'create'])->name('forgot-pin');
        Route::post('forgot-pin', [ForgotPinController::class, 'store'])
            ->middleware('throttle:crm-forgot-pin')
            ->name('forgot-pin.store');
        Route::get('reset-pin/{token}', [ResetPinController::class, 'create'])->name('reset-pin');
        Route::post('reset-pin', [ResetPinController::class, 'store'])
            ->middleware('throttle:crm-forgot-pin')
            ->name('reset-pin.store');

        Route::get('auth/google', [GoogleAuthController::class, 'redirect'])->name('auth.google');
        Route::get('auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
    });

    Route::middleware(['auth:advisor', 'advisor.active', 'advisor.pin-current', 'crm.share-inertia'])->group(function (): void {
        Route::post('logout', [LoginController::class, 'destroy'])->name('logout');

        Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard');

        Route::get('clients', [ClientController::class, 'index'])->name('clients.index');
        Route::get('clients/create', [ClientController::class, 'create'])->name('clients.create');
        Route::post('clients', [ClientController::class, 'store'])->name('clients.store');
        Route::get('clients/{client}', [ClientController::class, 'show'])->name('clients.show');
        Route::get('clients/{client}/edit', [ClientController::class, 'edit'])->name('clients.edit');
        Route::match(['put', 'patch'], 'clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        Route::patch('clients/{client}/crm', [ClientController::class, 'updateCrm'])->name('clients.crm.update');
        Route::delete('clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');

        Route::get('pipeline', [PipelineController::class, 'index'])->name('pipeline.index');
        Route::post('pipeline/statuses', [PipelineController::class, 'storeStatus'])->name('pipeline.statuses.store');
        Route::put('pipeline/statuses/{status}', [PipelineController::class, 'updateStatus'])->name('pipeline.statuses.update');
        Route::delete('pipeline/statuses/{status}', [PipelineController::class, 'destroyStatus'])->name('pipeline.statuses.destroy');
        Route::post('pipeline/tags', [PipelineController::class, 'storeTag'])->name('pipeline.tags.store');
        Route::put('pipeline/tags/{tag}', [PipelineController::class, 'updateTag'])->name('pipeline.tags.update');
        Route::delete('pipeline/tags/{tag}', [PipelineController::class, 'destroyTag'])->name('pipeline.tags.destroy');

        Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::get('projects/{project}/flat', [ProjectController::class, 'flat'])->name('projects.flat');
        Route::get('projects/{project}/assets/{asset}/download', [ProjectController::class, 'downloadAsset'])
            ->name('projects.assets.download');
        Route::get('projects/{project}', [ProjectController::class, 'show'])->name('projects.show');

        Route::get('my-lots', [LotController::class, 'indexMine'])->name('lots.mine');
        Route::get('lots/{lot}', [LotController::class, 'show'])->name('lots.show');
        Route::get('lots/{lot}/pre-reservations/create', [PreReservationController::class, 'create'])->name('lots.pre-reservations.create');
        Route::post('lots/{lot}/pre-reservations', [PreReservationController::class, 'store'])->name('lots.pre-reservations.store');

        Route::get('pre-reservations', [PreReservationController::class, 'index'])->name('pre-reservations.index');

        Route::get('attention-tickets', [AttentionTicketController::class, 'index'])->name('attention-tickets.index');
        Route::get('attention-tickets/create', [AttentionTicketController::class, 'create'])->name('attention-tickets.create');
        Route::post('attention-tickets', [AttentionTicketController::class, 'store'])->name('attention-tickets.store');
        Route::post('attention-tickets/{attentionTicket}/cancel', [AttentionTicketController::class, 'cancel'])->name('attention-tickets.cancel');

        Route::get('reminders', [ReminderController::class, 'index'])->name('reminders.index');
        Route::post('reminders', [ReminderController::class, 'store'])->name('reminders.store');
        Route::put('reminders/{reminder}', [ReminderController::class, 'update'])->name('reminders.update');
        Route::delete('reminders/{reminder}', [ReminderController::class, 'destroy'])->name('reminders.destroy');
        Route::post('reminders/{reminder}/complete', [ReminderController::class, 'complete'])->name('reminders.complete');

        Route::get('agenda', [AgendaController::class, 'index'])->name('agenda.index');

        Route::get('commissions', [CommissionController::class, 'index'])->name('commissions.index');

        Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('profile/pin', [ProfileController::class, 'updatePin'])->name('profile.pin.update');

        Route::get('google/calendar/connect', [GoogleCalendarController::class, 'connect'])->name('google.calendar.connect');
        Route::get('google/calendar/callback', [GoogleCalendarController::class, 'callback'])->name('google.calendar.callback');
        Route::post('google/calendar/disconnect', [GoogleCalendarController::class, 'disconnect'])->name('google.calendar.disconnect');
        Route::post('google/calendar/sync', [GoogleCalendarController::class, 'syncNow'])->name('google.calendar.sync');

        Route::get('meta/connect', [MetaConnectionController::class, 'connect'])->name('meta.connect');
        Route::get('meta/callback', [MetaConnectionController::class, 'callback'])->name('meta.callback');
        Route::post('meta/disconnect', [MetaConnectionController::class, 'disconnect'])->name('meta.disconnect');
        Route::post('meta/whatsapp/sync-templates', [MetaConnectionController::class, 'syncTemplates'])->name('meta.whatsapp.sync-templates');

        Route::get('inbox', [InboxController::class, 'index'])->name('inbox.index');
        Route::post('inbox/conversations/{conversation}/messages', [InboxController::class, 'send'])->name('inbox.messages.send');
        Route::post('inbox/conversations/{conversation}/toggle-bot', [InboxController::class, 'toggleBot'])->name('inbox.toggle-bot');

        Route::get('automations', [AutomationFlowController::class, 'index'])->name('automations.index');
        Route::get('automations/create', [AutomationFlowController::class, 'create'])->name('automations.create');
        Route::post('automations', [AutomationFlowController::class, 'store'])->name('automations.store');
        Route::get('automations/{flow}/edit', [AutomationFlowController::class, 'edit'])->name('automations.edit');
        Route::patch('automations/{flow}', [AutomationFlowController::class, 'update'])->name('automations.update');
        Route::post('automations/{flow}/publish', [AutomationFlowController::class, 'publish'])->name('automations.publish');
        Route::post('automations/templates/{template}/clone', [AutomationFlowController::class, 'cloneTemplate'])->name('automations.templates.clone');
        Route::delete('automations/{flow}', [AutomationFlowController::class, 'destroy'])->name('automations.destroy');

        Route::get('broadcasts', [BroadcastController::class, 'index'])->name('broadcasts.index');
        Route::get('broadcasts/create', [BroadcastController::class, 'create'])->name('broadcasts.create');
        Route::post('broadcasts', [BroadcastController::class, 'store'])->name('broadcasts.store');
    });
});
