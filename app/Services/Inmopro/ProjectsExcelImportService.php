<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class ProjectsExcelImportService
{
    private const CACHE_TTL_MINUTES = 20;

    /**
     * @var array<string, list<string>>
     */
    private const HEADER_ALIASES = [
        'project_name' => ['PROYECTO'],
        'item' => ['ITEM'],
        'client_name' => ['NOMBRE CLIENTE'],
        'client_phone' => ['TELEFONO', 'TELEFONO CLIENTE', 'CELULAR'],
        'block' => ['MZ', 'MANZANA'],
        'number' => ['LOTE', 'NRO LOTE', 'NUMERO LOTE'],
        'area' => ['AREA'],
        'price' => ['MONTO', 'PRECIO'],
        'advance' => ['ADELANTO - SEPARACION', 'ADELANTO', 'SEPARACION'],
        'remaining_balance' => ['MONTO RESTANTE', 'SALDO RESTANTE', 'SALDO'],
        'billing' => ['FACTURACION', 'FACTURACION '],
        'client_dni' => ['DNI CLIENTE', 'DNI'],
        'payment_limit_date' => ['FECHA LIMITE DE PAGO', 'FECHA LIMITE'],
        'lot_status' => ['ESTADO DE LOTE', 'ESTADO'],
        'operation_number' => ['N DE OPERACION S', 'NRO DE OPERACION S', 'N DE OPERACION', 'NRO DE OPERACION'],
        'contract_date' => ['FECHA DE CONTRATO'],
        'contract_number' => ['NRO DE CONTRATO', 'NUMERO DE CONTRATO'],
    ];

    /**
     * @var array<string, string>
     */
    private const FIELD_LABELS = [
        'header' => 'Encabezados de la plantilla',
        'project_name' => 'PROYECTO',
        'item' => 'ITEM',
        'client_name' => 'NOMBRE CLIENTE',
        'client_phone' => 'TELEFONO',
        'client_dni' => 'DNI CLIENTE',
        'block' => 'MZ',
        'number' => 'LOTE',
        'area' => 'AREA',
        'price' => 'MONTO',
        'advance' => 'ADELANTO - SEPARACION',
        'remaining_balance' => 'MONTO RESTANTE',
        'billing' => 'FACTURACION',
        'payment_limit_date' => 'FECHA LIMITE DE PAGO',
        'lot_status' => 'ESTADO DE LOTE',
        'operation_number' => 'N DE OPERACION S.',
        'contract_date' => 'FECHA DE CONTRATO',
        'contract_number' => 'NRO DE CONTRATO',
    ];

    /**
     * @var array<string, string>
     */
    private const REQUIRED_HEADER_LABELS = [
        'project_name' => 'PROYECTO',
        'block' => 'MZ',
        'number' => 'LOTE',
        'area' => 'AREA',
        'price' => 'MONTO',
        'lot_status' => 'ESTADO DE LOTE',
    ];

    /**
     * @return array{
     *     project: array{
     *         sheet_name: string,
     *         name: string,
     *         location: string,
     *         project_type_id: int,
     *         blocks: list<string>,
     *         total_lots: int,
     *         existing_project_id: int|null
     *     },
     *     summary: array{rows_read: int, valid: int, invalid: int},
     *     rows: list<array<string, mixed>>,
     *     errors: list<array{excel_row: int, field: string, field_label: string, message: string, received_value: string|null}>,
     *     error_summary: array{total: int, by_field: array<string, int>, affected_rows: int},
     *     validation: array{required_columns: list<string>, missing_columns: list<string>, recognized_columns: list<string>, valid_lot_statuses: list<string>},
     *     import_blocked_reason: string|null,
     *     token: string|null,
     *     can_import: bool
     * }
     */
    public function preview(UploadedFile $file, int $projectTypeId, string $location, ?string $nameOverride = null): array
    {
        $loaded = $this->loadSheet($file);
        $headerMap = $this->buildHeaderMap($loaded['header']);
        $sheetName = $loaded['sheet_name'];

        $missingHeaders = $this->missingRequiredHeaders($headerMap);
        if ($missingHeaders !== []) {
            $headerErrors = array_map(
                fn (string $header): array => $this->makeRowError(
                    1,
                    'header',
                    'Falta la columna obligatoria en la fila 1 (encabezados). Descargue la plantilla oficial y verifique el nombre exacto de la columna.',
                    $header
                ),
                $missingHeaders
            );

            return $this->finalizePreviewResponse([
                'project' => [
                    'sheet_name' => $sheetName,
                    'name' => trim((string) $nameOverride) !== '' ? trim((string) $nameOverride) : '',
                    'location' => $location,
                    'project_type_id' => $projectTypeId,
                    'blocks' => [],
                    'total_lots' => 0,
                    'existing_project_id' => null,
                ],
                'summary' => [
                    'rows_read' => 0,
                    'valid' => 0,
                    'invalid' => 0,
                ],
                'rows' => [],
                'errors' => $headerErrors,
                'token' => null,
                'can_import' => false,
            ], $headerMap, $missingHeaders);
        }

        $rows = [];
        $errors = [];
        $validLots = [];
        $blocks = [];
        $detectedProjectName = null;
        $rowsRead = 0;
        $seenLots = [];

        foreach ($loaded['rows'] as $row) {
            $cells = $row['cells'];
            if ($this->isRowEmpty($cells)) {
                continue;
            }

            $rowsRead++;
            $excelRow = $row['excel_row'];
            $rowErrors = [];

            $projectNameInRow = $this->cellStringByField($cells, $headerMap, 'project_name');
            if ($projectNameInRow !== null) {
                if ($detectedProjectName === null) {
                    $detectedProjectName = $projectNameInRow;
                } elseif ($detectedProjectName !== $projectNameInRow) {
                    $rowErrors[] = $this->makeRowError(
                        $excelRow,
                        'project_name',
                        sprintf(
                            'La columna PROYECTO debe repetir el mismo nombre en todas las filas. Se detecto "%s" pero el proyecto ya definido es "%s".',
                            $projectNameInRow,
                            $detectedProjectName
                        ),
                        $projectNameInRow
                    );
                }
            }

            $block = $this->cellStringByField($cells, $headerMap, 'block');
            $number = $this->parseIntegerByField($cells, $headerMap, 'number');
            $area = $this->parseDecimalByField($cells, $headerMap, 'area');
            $price = $this->parseDecimalByField($cells, $headerMap, 'price');
            $advance = $this->parseDecimalByField($cells, $headerMap, 'advance');
            $remainingBalance = $this->parseDecimalByField($cells, $headerMap, 'remaining_balance');
            $clientName = $this->cellStringByField($cells, $headerMap, 'client_name');
            $clientPhone = $this->normalizeNullableDigits($this->cellStringByField($cells, $headerMap, 'client_phone'));
            $clientDni = $this->normalizeNullableDigits($this->cellStringByField($cells, $headerMap, 'client_dni'));
            $paymentLimitDate = $this->parseDateByField($cells, $headerMap, 'payment_limit_date');
            $contractDate = $this->parseDateByField($cells, $headerMap, 'contract_date');
            $operationNumber = $this->cellStringByField($cells, $headerMap, 'operation_number');
            $contractNumber = $this->cellStringByField($cells, $headerMap, 'contract_number');
            $item = $this->cellStringByField($cells, $headerMap, 'item');
            $statusRaw = $this->cellStringByField($cells, $headerMap, 'lot_status');
            $statusCode = $this->normalizeStatusCode($statusRaw);

            if ($block === null) {
                $rowErrors[] = $this->makeRowError(
                    $excelRow,
                    'block',
                    $this->fieldHasValue($cells, $headerMap, 'block')
                        ? 'La manzana (MZ) no es valida.'
                        : 'La manzana (MZ) es obligatoria.',
                    $this->cellRawByField($cells, $headerMap, 'block')
                );
            }
            if ($number === null) {
                $rowErrors[] = $this->makeRowError(
                    $excelRow,
                    'number',
                    $this->fieldHasValue($cells, $headerMap, 'number')
                        ? 'El numero de lote debe ser un valor numerico entero.'
                        : 'El numero de lote es obligatorio.',
                    $this->cellRawByField($cells, $headerMap, 'number')
                );
            }
            if ($area === null) {
                $rowErrors[] = $this->makeRowError(
                    $excelRow,
                    'area',
                    $this->fieldHasValue($cells, $headerMap, 'area')
                        ? 'El area debe ser un numero (use punto como separador decimal).'
                        : 'El area es obligatoria.',
                    $this->cellRawByField($cells, $headerMap, 'area')
                );
            }
            if ($price === null) {
                $rowErrors[] = $this->makeRowError(
                    $excelRow,
                    'price',
                    $this->fieldHasValue($cells, $headerMap, 'price')
                        ? 'El monto debe ser un numero (use punto como separador decimal).'
                        : 'El monto es obligatorio.',
                    $this->cellRawByField($cells, $headerMap, 'price')
                );
            }
            if ($this->fieldHasValue($cells, $headerMap, 'payment_limit_date') && $paymentLimitDate === null) {
                $rowErrors[] = $this->makeRowError(
                    $excelRow,
                    'payment_limit_date',
                    'La fecha limite de pago no es valida. Use formato dd/mm/aaaa.',
                    $this->cellRawByField($cells, $headerMap, 'payment_limit_date')
                );
            }
            if ($this->fieldHasValue($cells, $headerMap, 'contract_date') && $contractDate === null) {
                $rowErrors[] = $this->makeRowError(
                    $excelRow,
                    'contract_date',
                    'La fecha de contrato no es valida. Use formato dd/mm/aaaa.',
                    $this->cellRawByField($cells, $headerMap, 'contract_date')
                );
            }

            $lotStatusId = $this->resolveLotStatusId($statusCode);
            if ($lotStatusId === null) {
                $rowErrors[] = $this->makeRowError(
                    $excelRow,
                    'lot_status',
                    sprintf(
                        'Estado de lote no reconocido. Valores permitidos: %s.',
                        implode(', ', $this->validLotStatusCodes())
                    ),
                    $statusRaw
                );
            }

            if ($statusCode === LotStatus::CODE_TRANSFERIDO) {
                $remainingBalance = 0.0;
            }

            if ($block !== null && $number !== null) {
                $lotKey = mb_strtoupper(trim($block)).'-'.$number;
                if (isset($seenLots[$lotKey])) {
                    $rowErrors[] = $this->makeRowError(
                        $excelRow,
                        'number',
                        sprintf(
                            'El lote %s esta duplicado en el archivo (primera aparicion en la fila %d).',
                            $lotKey,
                            $seenLots[$lotKey]
                        ),
                        (string) $number
                    );
                } else {
                    $seenLots[$lotKey] = $excelRow;
                }
            }

            if ($block !== null) {
                $blocks[mb_strtoupper(trim($block))] = mb_strtoupper(trim($block));
            }

            foreach ($rowErrors as $rowError) {
                $errors[] = $rowError;
            }

            $rows[] = [
                'excel_row' => $excelRow,
                'item' => $item,
                'block' => $block,
                'number' => $number,
                'area' => $area,
                'price' => $price,
                'client_name' => $clientName,
                'client_phone' => $clientPhone,
                'client_dni' => $clientDni,
                'status' => $statusCode,
                'errors' => array_map(fn (array $error): string => $this->formatRowErrorForDisplay($error), $rowErrors),
                'field_errors' => $rowErrors,
            ];

            if ($rowErrors === []) {
                $validLots[] = [
                    'block' => $block,
                    'number' => $number,
                    'area' => $area,
                    'price' => $price,
                    'lot_status_id' => $lotStatusId,
                    'client_name' => $clientName,
                    'client_phone' => $clientPhone,
                    'client_dni' => $clientDni,
                    'advance' => $advance,
                    'remaining_balance' => $remainingBalance,
                    'payment_limit_date' => $paymentLimitDate,
                    'operation_number' => $operationNumber,
                    'contract_date' => $contractDate,
                    'contract_number' => $contractNumber,
                ];
            }
        }

        $projectName = trim((string) $nameOverride) !== ''
            ? trim((string) $nameOverride)
            : ($detectedProjectName ?? '');

        if ($projectName === '') {
            $errors[] = $this->makeRowError(
                1,
                'project_name',
                'No se detecto el nombre del proyecto. Complete la columna PROYECTO en al menos una fila de datos o indique el nombre en el formulario.',
                null
            );
        }

        if ($rowsRead === 0) {
            $errors[] = $this->makeRowError(
                1,
                'header',
                'El archivo no contiene filas de datos. Agregue al menos un lote debajo de la fila de encabezados.',
                null
            );
        }

        $validCount = count($validLots);
        $invalidCount = count($rows) - $validCount;
        $blocksList = array_values($blocks);
        sort($blocksList);

        $existingProjectId = null;
        if ($projectName !== '') {
            $existingProjectId = Project::query()
                ->where('name', $projectName)
                ->value('id');
        }

        $canImport = $errors === [] && $validCount > 0 && $projectName !== '';
        $token = null;

        if ($canImport) {
            $userId = auth()->id();
            if (! is_int($userId)) {
                throw new RuntimeException('Usuario no autenticado.');
            }

            $token = (string) Str::uuid();
            Cache::put(
                $this->cacheKey($userId, $token),
                [
                    'project' => [
                        'name' => $projectName,
                        'location' => $location,
                        'project_type_id' => $projectTypeId,
                        'total_lots' => $validCount,
                        'blocks' => $blocksList,
                        'existing_project_id' => $existingProjectId !== null ? (int) $existingProjectId : null,
                    ],
                    'lots' => $validLots,
                ],
                now()->addMinutes(self::CACHE_TTL_MINUTES)
            );
        }

        return $this->finalizePreviewResponse([
            'project' => [
                'sheet_name' => $sheetName,
                'name' => $projectName,
                'location' => $location,
                'project_type_id' => $projectTypeId,
                'blocks' => $blocksList,
                'total_lots' => $validCount,
                'existing_project_id' => $existingProjectId !== null ? (int) $existingProjectId : null,
            ],
            'summary' => [
                'rows_read' => $rowsRead,
                'valid' => $validCount,
                'invalid' => $invalidCount,
            ],
            'rows' => $rows,
            'errors' => $errors,
            'token' => $token,
            'can_import' => $canImport,
        ], $headerMap);
    }

    public function confirm(string $token, User $user): Project
    {
        $cached = Cache::pull($this->cacheKey($user->id, $token));

        if (! is_array($cached) || ! isset($cached['project'], $cached['lots'])) {
            throw new RuntimeException('La validacion expiro o no es valida. Vuelva a cargar el archivo.');
        }

        /** @var array{name: string, location: string, project_type_id: int, total_lots: int, blocks: list<string>, existing_project_id: int|null} $projectPayload */
        $projectPayload = $cached['project'];
        /** @var list<array<string, mixed>> $lotsPayload */
        $lotsPayload = $cached['lots'];

        return DB::transaction(function () use ($projectPayload, $lotsPayload): Project {
            $project = Project::query()->firstOrNew([
                'name' => $projectPayload['name'],
            ]);

            $project->fill([
                'name' => $projectPayload['name'],
                'location' => $projectPayload['location'],
                'project_type_id' => $projectPayload['project_type_id'],
                'total_lots' => $projectPayload['total_lots'],
                'blocks' => $projectPayload['blocks'],
            ]);
            $project->save();

            $project->lots()->delete();

            foreach ($lotsPayload as $lotPayload) {
                Lot::query()->create([
                    ...$this->lotAttributesForCreate($lotPayload),
                    'project_id' => $project->id,
                ]);
            }

            return $project->fresh();
        });
    }

    /**
     * @return array{sheet_name: string, header: array<int, mixed>, rows: list<array{excel_row: int, cells: array<int, mixed>}>}
     */
    private function loadSheet(UploadedFile $file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getSheet(0);
        $rows = $sheet->toArray(null, true, true, false);

        if ($rows === []) {
            throw new RuntimeException('El archivo Excel no contiene filas.');
        }

        $header = array_values((array) $rows[0]);
        $dataRows = [];

        foreach (array_slice($rows, 1) as $index => $row) {
            $dataRows[] = [
                'excel_row' => $index + 2,
                'cells' => array_values((array) $row),
            ];
        }

        return [
            'sheet_name' => $sheet->getTitle(),
            'header' => $header,
            'rows' => $dataRows,
        ];
    }

    /**
     * @param  array<int, mixed>  $header
     * @return array<string, int>
     */
    private function buildHeaderMap(array $header): array
    {
        $normalizedHeader = [];

        foreach ($header as $index => $value) {
            $normalizedHeader[$this->normalizeHeader((string) $value)] = $index;
        }

        $map = [];
        foreach (self::HEADER_ALIASES as $field => $aliases) {
            foreach ($aliases as $alias) {
                $normalizedAlias = $this->normalizeHeader($alias);
                if (array_key_exists($normalizedAlias, $normalizedHeader)) {
                    $map[$field] = $normalizedHeader[$normalizedAlias];
                    break;
                }
            }
        }

        return $map;
    }

    /**
     * @param  array<string, int>  $headerMap
     * @return list<string>
     */
    private function missingRequiredHeaders(array $headerMap): array
    {
        $missing = [];
        foreach (self::REQUIRED_HEADER_LABELS as $field => $label) {
            if (! array_key_exists($field, $headerMap)) {
                $missing[] = $label;
            }
        }

        return $missing;
    }

    /**
     * @return array{excel_row: int, field: string, field_label: string, message: string, received_value: string|null}
     */
    private function makeRowError(int $excelRow, string $field, string $message, ?string $receivedValue = null): array
    {
        return [
            'excel_row' => $excelRow,
            'field' => $field,
            'field_label' => self::FIELD_LABELS[$field] ?? $field,
            'message' => $message,
            'received_value' => $receivedValue !== null && trim($receivedValue) !== '' ? trim($receivedValue) : null,
        ];
    }

    /**
     * @param  array{excel_row: int, field: string, field_label: string, message: string, received_value: string|null}  $error
     */
    private function formatRowErrorForDisplay(array $error): string
    {
        $label = $error['field_label'];
        $message = $error['message'];

        if ($error['received_value'] !== null) {
            return "[{$label}] {$message} Valor en celda: \"{$error['received_value']}\".";
        }

        return "[{$label}] {$message}";
    }

    /**
     * @param  array<string, int>  $headerMap
     * @return list<string>
     */
    private function recognizedColumnLabels(array $headerMap): array
    {
        $labels = [];
        foreach ($headerMap as $field => $index) {
            unset($index);
            $labels[] = self::FIELD_LABELS[$field] ?? $field;
        }

        sort($labels);

        return array_values(array_unique($labels));
    }

    /**
     * @return list<string>
     */
    private function validLotStatusCodes(): array
    {
        return LotStatus::query()
            ->orderBy('sort_order')
            ->pluck('code')
            ->map(fn (mixed $code): string => mb_strtoupper((string) $code))
            ->all();
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function cellRawByField(array $cells, array $headerMap, string $field): ?string
    {
        if (! isset($headerMap[$field])) {
            return null;
        }

        $index = $headerMap[$field];
        if (! array_key_exists($index, $cells)) {
            return null;
        }

        $value = $cells[$index];
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    /**
     * @param  list<array{excel_row: int, field: string, field_label: string, message: string, received_value: string|null}>  $errors
     * @return array{total: int, by_field: array<string, int>, affected_rows: int}
     */
    private function buildErrorSummary(array $errors): array
    {
        $byField = [];
        $rows = [];

        foreach ($errors as $error) {
            $label = $error['field_label'];
            $byField[$label] = ($byField[$label] ?? 0) + 1;
            $rows[$error['excel_row']] = true;
        }

        arsort($byField);

        return [
            'total' => count($errors),
            'by_field' => $byField,
            'affected_rows' => count($rows),
        ];
    }

    /**
     * @param  array<string, int>  $headerMap
     * @param  list<string>  $missingColumns
     * @return array{required_columns: list<string>, missing_columns: list<string>, recognized_columns: list<string>, valid_lot_statuses: list<string>}
     */
    private function buildValidationMeta(array $headerMap, array $missingColumns = []): array
    {
        return [
            'required_columns' => array_values(self::REQUIRED_HEADER_LABELS),
            'missing_columns' => $missingColumns,
            'recognized_columns' => $this->recognizedColumnLabels($headerMap),
            'valid_lot_statuses' => $this->validLotStatusCodes(),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, int>  $headerMap
     * @param  list<string>  $missingColumns
     * @return array<string, mixed>
     */
    private function finalizePreviewResponse(array $payload, array $headerMap, array $missingColumns = []): array
    {
        /** @var list<array{excel_row: int, field: string, field_label: string, message: string, received_value: string|null}> $errors */
        $errors = $payload['errors'] ?? [];

        $payload['validation'] = $this->buildValidationMeta($headerMap, $missingColumns);
        $payload['error_summary'] = $this->buildErrorSummary($errors);
        $payload['import_blocked_reason'] = $this->buildImportBlockedReason($payload);

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function buildImportBlockedReason(array $payload): ?string
    {
        if (($payload['can_import'] ?? false) === true) {
            return null;
        }

        $missing = $payload['validation']['missing_columns'] ?? [];
        if (is_array($missing) && $missing !== []) {
            return 'Faltan columnas obligatorias en la plantilla: '.implode(', ', $missing).'.';
        }

        /** @var array{total?: int, affected_rows?: int} $summary */
        $summary = $payload['error_summary'] ?? [];
        $totalErrors = (int) ($summary['total'] ?? 0);
        $affectedRows = (int) ($summary['affected_rows'] ?? 0);

        if ($totalErrors > 0) {
            return sprintf(
                'Se encontraron %d error(es) en %d fila(s). Corrija la plantilla y vuelva a validar.',
                $totalErrors,
                $affectedRows
            );
        }

        $valid = (int) ($payload['summary']['valid'] ?? 0);
        if ($valid === 0) {
            return 'No hay filas validas para importar. Revise que el archivo tenga lotes con datos completos.';
        }

        return 'La importacion no puede confirmarse hasta corregir los errores de validacion.';
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function cellStringByField(array $cells, array $headerMap, string $field): ?string
    {
        if (! isset($headerMap[$field])) {
            return null;
        }

        $index = $headerMap[$field];
        if (! array_key_exists($index, $cells)) {
            return null;
        }

        $value = trim((string) ($cells[$index] ?? ''));

        return $value === '' ? null : $value;
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function parseDecimalByField(array $cells, array $headerMap, string $field): ?float
    {
        if (! isset($headerMap[$field])) {
            return null;
        }

        $index = $headerMap[$field];
        $value = $cells[$index] ?? null;

        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        if (is_numeric($value)) {
            return round((float) $value, 2);
        }

        $normalized = str_replace([' ', ','], ['', '.'], trim((string) $value));

        return is_numeric($normalized) ? round((float) $normalized, 2) : null;
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function parseIntegerByField(array $cells, array $headerMap, string $field): ?int
    {
        $value = $this->parseDecimalByField($cells, $headerMap, $field);

        return $value === null ? null : (int) round($value);
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function parseDateByField(array $cells, array $headerMap, string $field): ?string
    {
        if (! isset($headerMap[$field])) {
            return null;
        }

        $index = $headerMap[$field];
        if (! array_key_exists($index, $cells)) {
            return null;
        }

        $value = $cells[$index];
        if ($value === null) {
            return null;
        }

        return $this->parseDateValue($value);
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function fieldHasValue(array $cells, array $headerMap, string $field): bool
    {
        if (! isset($headerMap[$field])) {
            return false;
        }

        $index = $headerMap[$field];
        if (! array_key_exists($index, $cells)) {
            return false;
        }

        $value = $cells[$index];

        return $value !== null && trim((string) $value) !== '';
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function isRowEmpty(array $cells): bool
    {
        foreach ($cells as $value) {
            if ($value !== null && trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function normalizeHeader(string $value): string
    {
        $value = Str::of($value)
            ->ascii()
            ->upper()
            ->replaceMatches('/[^A-Z0-9]+/', ' ')
            ->trim()
            ->value();

        return preg_replace('/\s+/', ' ', $value) ?? '';
    }

    private function normalizeStatusCode(?string $value): string
    {
        if ($value === null || trim($value) === '') {
            return LotStatus::CODE_LIBRE;
        }

        return Str::of($value)
            ->ascii()
            ->upper()
            ->replaceMatches('/[^A-Z0-9]+/', '')
            ->value();
    }

    private function resolveLotStatusId(string $statusCode): ?int
    {
        $id = LotStatus::query()
            ->whereRaw('UPPER(code) = ?', [$statusCode])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }

    private function normalizeNullableDigits(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);

        return $digits === '' ? null : $digits;
    }

    private function parseDateValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value) && (float) $value > 0) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $value)->format('Y-m-d');
            } catch (\Throwable) {
                // continue with text parsing
            }
        }

        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        if (is_numeric($text) && (float) $text > 0) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $text)->format('Y-m-d');
            } catch (\Throwable) {
                // continue with text parsing
            }
        }

        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        $text = trim($text);
        $text = str_replace("\xc2\xa0", ' ', $text);
        $text = trim($text);

        if (preg_match('/^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/', $text, $matches)) {
            $text = $matches[1];
        } elseif (preg_match('/^(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/', $text, $matches)) {
            $text = $matches[1];
        }

        $directFormats = [
            'd/m/Y',
            'd-m-Y',
            'd.m.Y',
            'd/m/y',
            'd-m-y',
            'd.m.y',
            'Y-m-d',
            'Y/m/d',
            'Y.m.d',
            'd/m/Y H:i',
            'd-m-Y H:i',
            'd.m.Y H:i',
            'd/m/Y H:i:s',
            'd-m-Y H:i:s',
            'd.m.Y H:i:s',
            'Y-m-d H:i',
            'Y/m/d H:i',
            'Y.m.d H:i',
            'Y-m-d H:i:s',
            'Y/m/d H:i:s',
            'Y.m.d H:i:s',
        ];

        foreach ($directFormats as $format) {
            try {
                $parsed = Carbon::createFromFormat($format, $text);
                if ($parsed !== false) {
                    return $parsed->format('Y-m-d');
                }
            } catch (\Throwable) {
                // try the next supported format
            }
        }

        if (preg_match('/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/', $text, $matches)) {
            $day = (int) $matches[1];
            $month = (int) $matches[2];
            $year = (int) $matches[3];

            if ($year < 100) {
                $year += $year >= 70 ? 1900 : 2000;
            }

            return checkdate($month, $day, $year)
                ? sprintf('%04d-%02d-%02d', $year, $month, $day)
                : null;
        }

        if (preg_match('/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/', $text, $matches)) {
            $year = (int) $matches[1];
            $month = (int) $matches[2];
            $day = (int) $matches[3];

            return checkdate($month, $day, $year)
                ? sprintf('%04d-%02d-%02d', $year, $month, $day)
                : null;
        }

        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $text, $matches)) {
            $year = (int) $matches[1];
            $month = (int) $matches[2];
            $day = (int) $matches[3];

            return checkdate($month, $day, $year)
                ? sprintf('%04d-%02d-%02d', $year, $month, $day)
                : null;
        }

        try {
            return Carbon::parse($text)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $lotPayload
     * @return array<string, mixed>
     */
    private function lotAttributesForCreate(array $lotPayload): array
    {
        $clientName = isset($lotPayload['client_name']) ? trim((string) $lotPayload['client_name']) : '';
        $clientDni = $lotPayload['client_dni'] ?? null;
        $clientPhone = $lotPayload['client_phone'] ?? null;

        unset($lotPayload['client_phone']);

        if ($clientName === '') {
            return [
                ...$lotPayload,
                'client_id' => null,
                'client_name' => null,
                'client_dni' => null,
            ];
        }

        $defaultClientTypeId = ClientType::query()->where('code', 'PROPIO')->value('id')
            ?? ClientType::query()->orderBy('sort_order')->value('id');
        $defaultAdvisorId = Advisor::query()->value('id');

        if ($clientDni !== null && $clientDni !== '') {
            $existing = Client::query()->where('dni', $clientDni)->first();

            if ($existing) {
                $existing->update([
                    'name' => $clientName,
                    'phone' => $clientPhone ?? $existing->phone,
                    'client_type_id' => $defaultClientTypeId,
                ]);
                $client = $existing;
            } else {
                $client = Client::create([
                    'name' => $clientName,
                    'dni' => $clientDni,
                    'phone' => $clientPhone ?: null,
                    'client_type_id' => $defaultClientTypeId,
                    'advisor_id' => $defaultAdvisorId,
                ]);
            }
        } else {
            $client = Client::create([
                'name' => $clientName,
                'dni' => null,
                'phone' => $clientPhone ?: null,
                'client_type_id' => $defaultClientTypeId,
                'advisor_id' => $defaultAdvisorId,
            ]);
        }

        return [
            ...$lotPayload,
            'client_id' => $client->id,
            'client_name' => $clientName,
            'client_dni' => $clientDni,
        ];
    }

    private function cacheKey(int $userId, string $token): string
    {
        return 'project_excel_import_confirm:'.$userId.':'.$token;
    }
}
