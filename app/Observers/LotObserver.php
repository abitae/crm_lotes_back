<?php

namespace App\Observers;

use App\Models\Inmopro\Lot;
use App\Services\Inmopro\LotHistoryRecorder;

class LotObserver
{
    public function __construct(
        private LotHistoryRecorder $recorder,
    ) {}

    public function created(Lot $lot): void
    {
        $this->recorder->recordCreated($lot);
    }

    public function updated(Lot $lot): void
    {
        $this->recorder->recordUpdated($lot);
    }
}
