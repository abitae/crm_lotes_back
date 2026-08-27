# Dominio CRM (self-service web para vendedores)

- Es la versión **web** del self-service que ya existe en la API Cazador (app móvil): mismo vendedor (`App\Models\Inmopro\Advisor`), mismas reglas de negocio, mismos modelos de Inmopro. No se duplican reglas de negocio salvo adaptación de JSON a Inertia.
- Login por **usuario + PIN** (igual que Cazador), pero vía **guard de sesión** dedicado `advisor` (`config/auth.php`), no vía token API. `Advisor` implementa `Authenticatable` (trait `Illuminate\Auth\Authenticatable`), con `getAuthPasswordName() = 'pin'` y `getRememberTokenName() = ''` (sin "recordarme").
- Rutas en `routes/crm.php`, prefijo `/crm`, controladores en `App\Http\Controllers\Crm\*`. El grupo autenticado usa `['auth:advisor', 'advisor.active', 'crm.share-inertia']`.
- El resto de código de la app (`web`, Fortify, Spatie) sigue usando el guard `web` por defecto; `HandleInertiaRequests` usa explícitamente `$request->user('web')` para no mezclarse con sesiones `advisor`.
- Cada vendedor ve **únicamente su propia información** (clientes/lotes con `advisor_id` propio, tipos `PROPIO`/`DATERO`), igual que en Cazador. El acceso al CRM depende del mismo toggle `is_active` que gobierna el acceso a Cazador (revalidado en cada request vía `EnsureAdvisorIsActive`).
- Eventos CRM registrados desde este dominio usan `ClientCrmService::SOURCE_CRM` (distinto de `SOURCE_CAZADOR`/`SOURCE_INMOPRO`) para diferenciar el canal en el timeline del cliente.
- Sin 2FA y sin recuperación de PIN autoservicio: el PIN solo lo resetea un admin desde Inmopro, o el propio vendedor ya autenticado desde `/crm/profile`.
- Sidebar y layout propios (`resources/js/components/crm/*`, `resources/js/layouts/crm/*`), independientes del panel de Inmopro (`app-sidebar.tsx` no se toca).
