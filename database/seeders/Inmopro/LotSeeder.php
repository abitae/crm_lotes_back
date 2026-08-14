<?php

namespace Database\Seeders\Inmopro;

use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Illuminate\Database\Seeder;

class LotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statusLibre = LotStatus::query()->where('code', LotStatus::CODE_LIBRE)->first();

        if ($statusLibre === null) {
            return;
        }

        Project::query()->withCount('lots')->get()->each(function (Project $project) use ($statusLibre): void {
            if (($project->lots_count ?? 0) > 0) {
                return;
            }

            $plannedLots = (int) ($project->total_lots ?? 0);
            $blocks = array_values(array_filter(
                array_map(static fn (mixed $block): string => trim((string) $block), $project->blocks ?? []),
                static fn (string $block): bool => $block !== '',
            ));

            if ($plannedLots < 1) {
                return;
            }

            if ($blocks === []) {
                $blocks = ['A'];
            }

            $basePrice = (float) ($project->precio_web ?? 0);
            if ($basePrice <= 0) {
                $basePrice = 35000;
            }

            $created = 0;
            $blockCount = count($blocks);
            $perBlock = intdiv($plannedLots, $blockCount);
            $remainder = $plannedLots % $blockCount;

            foreach ($blocks as $index => $block) {
                $count = $perBlock + ($index < $remainder ? 1 : 0);

                for ($num = 1; $num <= $count; $num++) {
                    Lot::query()->updateOrCreate(
                        [
                            'project_id' => $project->id,
                            'block' => $block,
                            'number' => (string) $num,
                        ],
                        [
                            'area' => 105.00,
                            'price' => $basePrice + (($num % 8) * 1500),
                            'lot_status_id' => $statusLibre->id,
                        ]
                    );
                    $created++;
                }
            }

            if ($created !== $plannedLots) {
                $project->update(['total_lots' => $created]);
            }
        });
    }
}
