<?php

use App\Models\Inmopro\Advisor;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('inbox.advisor.{advisorId}', function (Advisor $advisor, int $advisorId): bool {
    return (int) $advisor->id === (int) $advisorId;
});
