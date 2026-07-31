<?php

namespace App\Models\Inmopro;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project360ShareLink extends Model
{
    protected $table = 'project_360_share_links';

    use HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'project_360_tour_id',
        'created_by',
        'label',
        'last_accessed_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'last_accessed_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Project360Tour::class, 'project_360_tour_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
