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
     *     errors: list<array{excel_row: int, field: string, message: string}>,
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
            return [
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
                'errors' => array_map(
                    fn (string $header): array => [
                        'excel_row' => 1,
                        'field' => 'header',
                        'message' => 'Falta la columna obligatoria: '.$header,
                    ],
                    $missingHeaders
                ),
                'token' => null,
                'can_import' => false,
            ];
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
                    $rowErrors[] = ['field' => 'project_name', 'message' => 'La columna PROYECTO debe tener el mismo nombre en todas las filas.'];
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
            $statusCode = $this->normalizeStatusCode($this->cellStringByField($cells, $headerMap, 'lot_status'));

            if ($block === null) {
                $rowErrors[] = ['field' => 'block', 'message' => 'La manzana (MZ) es obligatoria.'];
            }
            if ($number === null) {
                $rowErrors[] = ['field' => 'number', 'message' => 'El numero de lote es obligatorio.'];
            }
            if ($area === null) {
                $rowErrors[] = ['field' => 'area', 'message' => 'El area debe ser numerica.'];
            }
            if ($price === null) {
                $rowErrors[] = ['field' => 'price', 'message' => 'El monto debe ser numerico.'];
            }
            if ($this->fieldHasValue($cells, $headerMap, 'payment_limit_date') && $paymentLimitDate === null) {
                $rowErrors[] = ['field' => 'payment_limit_date', 'message' => 'La fecha limite de pago no es valida.'];
            }
            if ($this->fieldHasValue($cells, $headerMap, 'contract_date') && $contractDate === null) {
                $rowErrors[] = ['field' => 'contract_date', 'message' => 'La fecha de contrato no es valida.'];
            }

            $lotStatusId = $this->resolveLotStatusId($statusCode);
            if ($lotStatusId === null) {
                $rowErrors[] = ['field' => 'lot_status', 'message' => 'El estado de lote no es reconocido.'];
            }

            if ($statusCode === LotStatus::CODE_TRANSFERIDO) {
                $remainingBalance = 0.0;
            }

            if ($block !== null && $number !== null) {
                $lotKey = mb_strtoupper(trim($block)).'-'.$number;
                if (isset($seenLots[$lotKey])) {
                    $rowErrors[] = ['field' => 'number', 'message' => 'El lote esta duplicado dentro del archivo.'];
                } else {
                    $seenLots[$lotKey] = true;
                }
            }

            if ($block !== null) {
                $blocks[mb_strtoupper(trim($block))] = mb_strtoupper(trim($block));
            }

            foreach ($rowErrors as $rowError) {
                $errors[] = [
                    'excel_row' => $excelRow,
                    'field' => $rowError['field'],
                    'message' => $rowError['message'],
                ];
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
                'errors' => array_map(fn (array $error): string => $error['message'], $rowErrors),
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
            $errors[] = [
                'excel_row' => 1,
                'field' => 'project_name',
                'message' => 'No se pudo detectar el nombre del proyecto desde la columna PROYECTO.',
            ];
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

        return [
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
        ];
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
        $required = [
            'project_name' => 'PROYECTO',
            'block' => 'MZ',
            'number' => 'LOTE',
            'area' => 'AREA',
            'price' => 'MONTO',
            'lot_status' => 'ESTADO DE LOTE',
        ];

        $missing = [];
        foreach ($required as $field => $label) {
            if (! array_key_exists($field, $headerMap)) {
                $missing[] = $label;
            }
        }

        return $missing;
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
