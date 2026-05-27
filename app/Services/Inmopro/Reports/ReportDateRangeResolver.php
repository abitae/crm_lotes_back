<?php

namespace App\Services\Inmopro\Reports;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportDateRangeResolver
{
    /**
     * Rango de fechas por defecto: inicio = primer día del mes actual, fin = hoy.
     *
     * @return array{start_date: string, end_date: string}
     */
    public function resolve(Request $request): array
    {
        $startInput = $request->input('start_date');
        $endInput = $request->input('end_date');

        $startFilled = $startInput !== null && $startInput !== '';
        $endFilled = $endInput !== null && $endInput !== '';

        if (! $startFilled && ! $endFilled) {
            $start = now()->startOfMonth()->toDateString();
            $end = now()->toDateString();
        } elseif (! $startFilled && $endFilled) {
            $endCarbon = Carbon::parse((string) $endInput);
            $start = $endCarbon->copy()->startOfMonth()->toDateString();
            $end = $endCarbon->toDateString();
        } elseif ($startFilled && ! $endFilled) {
            $start = Carbon::parse((string) $startInput)->toDateString();
            $end = now()->toDateString();
        } else {
            $start = Carbon::parse((string) $startInput)->toDateString();
            $end = Carbon::parse((string) $endInput)->toDateString();
        }

        if ($start > $end) {
            [$start, $end] = [$end, $start];
        }

        return [
            'start_date' => $start,
            'end_date' => $end,
        ];
    }

    /**
     * Semana calendario (lunes–domingo) que contiene la fecha dada o hoy.
     *
     * @return array{start_date: string, end_date: string}
     */
    public function resolveWeek(Request $request): array
    {
        $anchor = $request->filled('week_date')
            ? Carbon::parse((string) $request->input('week_date'))
            : now();

        return [
            'start_date' => $anchor->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
            'end_date' => $anchor->copy()->endOfWeek(Carbon::SUNDAY)->toDateString(),
        ];
    }

    /**
     * @return array{year: int, start_date: string, end_date: string}
     */
    public function resolveYear(Request $request): array
    {
        $year = $request->filled('year')
            ? (int) $request->input('year')
            : (int) now()->format('Y');

        return [
            'year' => $year,
            'start_date' => Carbon::create($year, 1, 1)->toDateString(),
            'end_date' => Carbon::create($year, 12, 31)->toDateString(),
        ];
    }
}
