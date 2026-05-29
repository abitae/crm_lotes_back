<?php

use App\OpenAi\Http\Controllers\Api\v1\Cazador\ChatController;
use App\OpenAi\Http\Controllers\Api\v1\Cazador\KnowledgeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/cazador/openai')
    ->name('api.v1.cazador.openai.')
    ->middleware(['advisor.api', 'openai.cazador'])
    ->group(function (): void {
        Route::middleware('throttle:ai-cazador-knowledge')->group(function (): void {
            Route::get('knowledge/projects', [KnowledgeController::class, 'indexProjects'])
                ->name('knowledge.projects.index');
            Route::get('knowledge/projects/{project}', [KnowledgeController::class, 'showProject'])
                ->name('knowledge.projects.show');
            Route::get('knowledge/lots', [KnowledgeController::class, 'indexLots'])
                ->name('knowledge.lots.index');
            Route::get('knowledge/lots/{lot}', [KnowledgeController::class, 'showLot'])
                ->name('knowledge.lots.show');
        });

        Route::post('chat', [ChatController::class, 'store'])
            ->middleware('throttle:ai-cazador')
            ->name('chat.store');
    });
