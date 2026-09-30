<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Inventario de Lotes - {{ $project->name ?? 'Proyecto' }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #334155; }
        h1 { font-size: 16px; margin-bottom: 4px; color: #0f172a; }
        .meta { font-size: 9px; color: #64748b; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; font-size: 9px; text-transform: uppercase; }
        tr:nth-child(even) { background: #f8fafc; }
        .block-title { margin-top: 16px; font-weight: bold; font-size: 11px; color: #0f172a; }
        .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; }
    </style>
</head>
<body>
    <h1>Inventario de Lotes · {{ $project->name }}</h1>
    <p class="meta">{{ $resolvedAppName }} · Generado el {{ now()->format('d/m/Y H:i') }}</p>

    @foreach ($blockGroups as $block => $lots)
    <div class="block-title">Manzana {{ $block }} ({{ count($lots) }} lotes)</div>
    <table>
        <thead>
            <tr>
                <th>N°</th>
                <th>Área (m²)</th>
                <th>Precio (S/)</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($lots as $lot)
            <tr>
                <td>{{ $lot->number }}</td>
                <td>{{ number_format((float) $lot->area, 2, ',', '.') }}</td>
                <td>{{ number_format((float) $lot->price, 2, ',', '.') }}</td>
                <td>{{ $lot->status?->name ?? '—' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endforeach

    <p class="footer">Documento generado por {{ $resolvedAppName }}. Uso interno.</p>
</body>
</html>
