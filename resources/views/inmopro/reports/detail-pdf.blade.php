<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $title ?? 'Reporte' }} - {{ config('app.name') }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #334155; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        .meta { font-size: 9px; color: #64748b; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; }
        th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
    </style>
</head>
<body>
    <h1>{{ $title ?? 'Reporte' }}</h1>
    <p class="meta">{{ $description ?? '' }} · Generado el {{ $generatedAt ?? now()->format('d/m/Y H:i') }}</p>
    @if (!empty($criteriaNote))
        <p class="meta">{{ $criteriaNote }}</p>
    @endif
    <table>
        <thead>
            <tr>
                @foreach ($tableHeaders ?? [] as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($tableBody ?? [] as $cells)
                <tr>
                    @foreach ($cells as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
