<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $title ?? 'Top cazadores' }} - {{ config('app.name') }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #334155; margin: 0; }
        h1 { font-size: 15px; margin: 0 0 4px; color: #0f172a; }
        .meta { font-size: 8px; color: #64748b; margin: 0 0 8px; }
        .chart-wrap { width: 100%; margin: 4px 0 6px; }
        .legend { margin: 0 0 4px; font-size: 8px; color: #475569; }
        .legend span { margin-right: 14px; }
        .legend-bar { display: inline-block; width: 10px; height: 10px; background: #059669; margin-right: 4px; vertical-align: middle; }
        .legend-line { display: inline-block; width: 14px; height: 2px; background: #2563eb; margin-right: 4px; vertical-align: middle; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #e2e8f0; padding: 4px 5px; text-align: left; }
        th { background: #f1f5f9; font-size: 8px; text-transform: uppercase; }
        td.num { text-align: right; }
    </style>
</head>
<body>
    @php
        $periodStart = ! empty($filters['start_date'])
            ? \Illuminate\Support\Carbon::parse($filters['start_date'])->format('d/m/Y')
            : '';
        $periodEnd = ! empty($filters['end_date'])
            ? \Illuminate\Support\Carbon::parse($filters['end_date'])->format('d/m/Y')
            : '';
    @endphp

    <h1>{{ $title ?? 'Top cazadores (vendedores)' }}</h1>
    <p class="meta">Periodo: {{ $periodStart }} al {{ $periodEnd }}</p>

    @php
        $chartRows = $rows ?? [];
        $rowCount = count($chartRows);
        $maxAmount = max(array_map(fn ($row) => (float) ($row['transfer_amount'] ?? 0), $chartRows) ?: [0]);
        $maxCount = max(array_map(fn ($row) => (int) ($row['transfer_count'] ?? 0), $chartRows) ?: [0]);
        $maxAmount = $maxAmount > 0 ? $maxAmount : 1;
        $maxCount = $maxCount > 0 ? $maxCount : 1;

        $width = 1180;
        $height = 240;
        $paddingLeft = 52;
        $paddingRight = 40;
        $paddingTop = 16;
        $paddingBottom = 56;
        $plotWidth = $width - $paddingLeft - $paddingRight;
        $plotHeight = $height - $paddingTop - $paddingBottom;
        $slotWidth = $rowCount > 0 ? $plotWidth / $rowCount : $plotWidth;
        $barWidth = min(48, max(14, $slotWidth * 0.62));

        $linePoints = [];
        $bars = [];

        foreach ($chartRows as $index => $row) {
            $centerX = $paddingLeft + ($index + 0.5) * $slotWidth;
            $amount = (float) ($row['transfer_amount'] ?? 0);
            $count = (int) ($row['transfer_count'] ?? 0);
            $barHeight = ($amount / $maxAmount) * $plotHeight;
            $lineY = $paddingTop + $plotHeight - (($count / $maxCount) * $plotHeight);

            $bars[] = [
                'x' => $centerX - ($barWidth / 2),
                'y' => $paddingTop + $plotHeight - $barHeight,
                'width' => $barWidth,
                'height' => $barHeight,
                'label' => \Illuminate\Support\Str::limit($row['advisor_name'] ?? '', 18),
                'centerX' => $centerX,
            ];

            $linePoints[] = round($centerX, 1).','.round($lineY, 1);
        }

        $polyline = implode(' ', $linePoints);
    @endphp

    @if ($rowCount > 0)
        <div class="legend">
            <span><span class="legend-bar"></span>Monto transferido (S/)</span>
            <span><span class="legend-line"></span>N° transferencias</span>
        </div>

        <div class="chart-wrap">
            <svg width="100%" height="{{ $height }}" viewBox="0 0 {{ $width }} {{ $height }}" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="{{ $width }}" height="{{ $height }}" fill="#ffffff" />

                @for ($tick = 0; $tick <= 4; $tick++)
                    @php
                        $ratio = $tick / 4;
                        $y = $paddingTop + $plotHeight - ($ratio * $plotHeight);
                        $amountLabel = number_format($maxAmount * $ratio, 0);
                        $countLabel = (string) (int) round($maxCount * $ratio);
                    @endphp
                    <line x1="{{ $paddingLeft }}" y1="{{ $y }}" x2="{{ $paddingLeft + $plotWidth }}" y2="{{ $y }}" stroke="#e2e8f0" stroke-width="1" />
                    <text x="{{ $paddingLeft - 6 }}" y="{{ $y + 3 }}" font-size="8" text-anchor="end" fill="#64748b">{{ $amountLabel }}</text>
                    <text x="{{ $paddingLeft + $plotWidth + 6 }}" y="{{ $y + 3 }}" font-size="8" text-anchor="start" fill="#2563eb">{{ $countLabel }}</text>
                @endfor

                @foreach ($bars as $bar)
                    <rect x="{{ $bar['x'] }}" y="{{ $bar['y'] }}" width="{{ $bar['width'] }}" height="{{ $bar['height'] }}" fill="#059669" rx="2" />
                    <text x="{{ $bar['centerX'] }}" y="{{ $height - 20 }}" font-size="7" text-anchor="middle" fill="#475569">{{ $bar['label'] }}</text>
                @endforeach

                @if ($polyline !== '')
                    <polyline points="{{ $polyline }}" fill="none" stroke="#2563eb" stroke-width="2.5" />
                    @foreach ($chartRows as $index => $row)
                        @php
                            $centerX = $paddingLeft + ($index + 0.5) * $slotWidth;
                            $count = (int) ($row['transfer_count'] ?? 0);
                            $lineY = $paddingTop + $plotHeight - (($count / $maxCount) * $plotHeight);
                        @endphp
                        <circle cx="{{ $centerX }}" cy="{{ $lineY }}" r="3.5" fill="#2563eb" stroke="#ffffff" stroke-width="1" />
                    @endforeach
                @endif

                <line x1="{{ $paddingLeft }}" y1="{{ $paddingTop }}" x2="{{ $paddingLeft }}" y2="{{ $paddingTop + $plotHeight }}" stroke="#94a3b8" stroke-width="1" />
                <line x1="{{ $paddingLeft }}" y1="{{ $paddingTop + $plotHeight }}" x2="{{ $paddingLeft + $plotWidth }}" y2="{{ $paddingTop + $plotHeight }}" stroke="#94a3b8" stroke-width="1" />
                <line x1="{{ $paddingLeft + $plotWidth }}" y1="{{ $paddingTop }}" x2="{{ $paddingLeft + $plotWidth }}" y2="{{ $paddingTop + $plotHeight }}" stroke="#94a3b8" stroke-width="1" />
            </svg>
        </div>
    @else
        <p class="meta">No hay datos para graficar en el periodo seleccionado.</p>
    @endif

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Vendedor</th>
                <th>Equipo</th>
                <th>Transferencias</th>
                <th>Monto transferido (S/)</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($chartRows as $index => $row)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $row['advisor_name'] ?? '' }}</td>
                    <td>{{ $row['team_name'] ?? '—' }}</td>
                    <td class="num">{{ (int) ($row['transfer_count'] ?? 0) }}</td>
                    <td class="num">{{ number_format((float) ($row['transfer_amount'] ?? 0), 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
