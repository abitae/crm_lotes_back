<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }} - {{ config('app.name') }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 5px; }
        th { background: #f1f5f9; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <p>{{ $criteriaNote }}</p>
    <h2>Resumen</h2>
    <table>
        <thead><tr><th>Grupo</th><th>Cantidad</th></tr></thead>
        <tbody>
            @foreach ($aggregates as $row)
                <tr><td>{{ $row['label'] }}</td><td>{{ $row['count'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
