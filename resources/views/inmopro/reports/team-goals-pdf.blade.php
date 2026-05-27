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
    <p>{{ $description }}</p>
    <table>
        <thead><tr><th>Equipo</th><th>Ventas</th><th>Meta</th><th>%</th><th>Lotes</th></tr></thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    <td>{{ $row['team_name'] }}</td>
                    <td>{{ number_format($row['sold_amount'], 2) }}</td>
                    <td>{{ number_format($row['goal_amount'], 2) }}</td>
                    <td>{{ $row['pct'] }}%</td>
                    <td>{{ $row['lots_count'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
