# Dominio Inmopro (CRM lotes)

- La aplicación gestiona **proyectos inmobiliarios**, **lotes**, **clientes**, **asesores**, **comisiones**, **cuotas**, **tickets de atención** y flujos como pre-reservas y confirmación de transferencias.
- Los textos de interfaz y mensajes al usuario deben ir en **español** salvo que el código existente use otro idioma de forma explícita.
- El estado **TRANSFERIDO** puede registrarse desde la vista de proyecto (`/inmopro/projects/{id}`) solo desde **RESERVADO**, con **fecha de escritura** (`notarial_transfer_date`) obligatoria y liquidación de saldo (`advance = price`, `remaining_balance = 0`); también existe el flujo con evidencia en **confirmación de transferencia** (`LotTransferConfirmation`).
- Las comisiones se generan vía `App\Services\Inmopro\CommissionService::createCommissionsForTransferredLot` al aprobar transferencia o al pasar a TRANSFERIDO desde proyecto (si el lote tiene asesor y aún no tiene comisiones).
- En **API Cazador**, los **recordatorios** (`ReminderController`) solo aplican a clientes del asesor con tipo **`PROPIO`** (misma regla que tickets de atención y pre-reservas).
- **DNI** y **teléfono** de cliente son **únicos en todo el sistema** al crear o actualizar (Inmopro web y API Cazador). Si hay conflicto, el mensaje indica el vendedor que registró al cliente existente (`ClientDuplicateRegistrationChecker`).
