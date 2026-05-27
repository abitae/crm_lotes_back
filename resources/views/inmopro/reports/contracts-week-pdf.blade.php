@include('inmopro.reports.detail-pdf', [
    'title' => $title,
    'description' => $description,
    'criteriaNote' => $criteriaNote,
    'generatedAt' => $generatedAt,
    'tableHeaders' => ['Tipo', 'Proyecto', 'Lote', 'Asesor', 'Monto', 'F. contrato'],
    'tableBody' => collect($reserved_rows ?? [])->map(fn ($r) => [
        'Reservado', $r['project_name'] ?? '', ($r['block'] ?? '').'-'.($r['number'] ?? ''),
        $r['advisor_name'] ?? '', number_format((float) ($r['price'] ?? 0), 2),
        $r['contract_date'] ?? '',
    ])->merge(collect($transferred_rows ?? [])->map(fn ($r) => [
        'Transferido', $r['project_name'] ?? '', ($r['block'] ?? '').'-'.($r['number'] ?? ''),
        $r['advisor_name'] ?? '', number_format((float) ($r['price'] ?? 0), 2),
        $r['contract_date'] ?? '',
    ]))->all(),
])
