<?php

use App\Http\Controllers\Crm\AgendaController;
use App\Http\Controllers\Crm\AttentionTicketController;
use App\Http\Controllers\Crm\Auth\LoginController;
use App\Http\Controllers\Crm\ClientController;
use App\Http\Controllers\Crm\CommissionController;
use App\Http\Controllers\Crm\DashboardController;
use App\Http\Controllers\Crm\LotController;
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
    });

    Route::middleware(['auth:advisor', 'advisor.active', 'crm.share-inertia'])->group(function (): void {
        Route::post('logout', [LoginController::class, 'destroy'])->name('logout');

        Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard');

        Route::get('clients', [ClientController::class, 'index'])->name('clients.index');
        Route::get('clients/create', [ClientController::class, 'create'])->name('clients.create');
        Route::post('clients', [ClientController::class, 'store'])->name('clients.store');
        Route::get('clients/{client}', [ClientController::class, 'show'])->name('clients.show');
        Route::get('clients/{client}/edit', [ClientController::class, 'edit'])->name('clients.edit');
        Route::match(['put', 'patch'], 'clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        Route::patch('clients/{client}/crm', [ClientController::class, 'updateCrm'])->name('clients.crm.update');

        Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
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
    });
});
