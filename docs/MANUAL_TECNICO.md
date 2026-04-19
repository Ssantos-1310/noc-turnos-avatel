# Manual técnico NOC Turnos Avatel v3.7

> Documento para desarrolladores que tengan que mantener, extender o migrar la aplicación **NOC Turnos Avatel**. Todo lo que aparece aquí está verificado contra el código real (`index.html` en la raíz del repo) y la base de datos Supabase `naywdwsjwtbagbzrncke` (región `eu-west-3`). Lo que no he podido verificar queda marcado explícitamente con "No verificado".

---

## 1. Visión general

### 1.1 Qué es la aplicación

NOC Turnos es una aplicación web de planificación de turnos para el Network Operations Center de Avatel Telecom. Gestiona ~25 operadores, cobertura diaria, solicitudes (cambio de turno, vacaciones, asuntos propios), guardias N2 semanales y un resumen mensual para RRHH.

### 1.2 Stack real

| Capa | Tecnología | Cómo se carga |
|------|------------|---------------|
| Frontend | React 18 | CDN `unpkg.com/react@18/umd/react.production.min.js` |
| Frontend | React DOM 18 | CDN `unpkg.com/react-dom@18/umd/react-dom.production.min.js` |
| Transpilación | Babel Standalone | CDN `unpkg.com/@babel/standalone/babel.min.js` — JSX transpilado **en el navegador** al cargar la página |
| Datos | Supabase JS SDK v2 | CDN `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` |
| Export Excel | SheetJS (`xlsx-0.20.2`) | CDN `cdn.sheetjs.com` |
| Tipografías | DM Sans + DM Mono | Google Fonts |
| Backend | Supabase (Postgres 17, Auth, Edge Functions, RLS) | Proyecto `naywdwsjwtbagbzrncke`, región `eu-west-3` |
| Hosting frontend | GitHub Pages (branch `v2` → producción) | `.nojekyll` en raíz |

### 1.3 Patrón arquitectónico

- **Single-page app, single HTML file.** TODO el código del cliente vive en `index.html` (~4.122 líneas, ~272 KB). No hay build step en producción.
- **Babel in-browser.** El `<script type="text/babel">` es transpilado por Babel Standalone en el cliente en cada carga. Coste: parseo + transform de ~3.900 líneas de JSX/ES2020 en cada hard reload.
- **Cliente anónimo de Supabase.** La `SUPABASE_KEY` inyectada es la `anon` pública (JWT con `role=anon`). Toda la seguridad real se apoya en RLS + Edge Function + SECURITY DEFINER.
- **Escritura atómica vía RPC.** Las operaciones delicadas (swap de turnos, ajuste de vacaciones, borrado de empleados, resolución de grupo de swaps) van por funciones SQL `SECURITY DEFINER` para evitar estados inconsistentes y bypassear RLS bajo control.
- **Polling de versión via `window.__calendarVersion` y `window.__coverageVersion`.** Varias vistas (`TodayView`, `CalendarView`, `TeamView`, `ResumenRRHH`) corren `setInterval` cada 500–2.000 ms comprobando estas variables para refrescarse tras escrituras.

### 1.4 Entorno de ejecución

- **Producción:** https://`<github_user>`.github.io/noc-turnos-avatel/ (branch `v2`). URL exacta no verificable desde el repo.
- **Dev:** branch `main`. La rama `claude/exciting-saha` es la que está activa ahora mismo.
- **Supabase project ID:** `naywdwsjwtbagbzrncke`, URL `https://naywdwsjwtbagbzrncke.supabase.co`.
- **Edge Function URL base:** `${SUPABASE_URL}/functions/v1`.
- **Año operativo:** hardcoded a `2026` (`const CURRENT_YEAR = Number(localStorage.getItem('noc_year')) || 2026`). Para forzar otro año en pruebas: `localStorage.setItem('noc_year','2027')` — pero ojo, sigue habiendo strings `'2026'` hardcoded en varios sitios.

### 1.5 Cómo correrlo en local

1. Clonar el repo.
2. Abrir `index.html` con cualquier servidor estático (por ejemplo `python3 -m http.server` o VSCode Live Server). **Abrir el fichero con `file://` directamente NO funciona** porque Supabase Auth requiere `http(s)://` para `localStorage` cross-origin y `fetch` al endpoint.
3. Login con cualquier email real dado de alta en `employees` con `auth_id` vinculado.

No hay `package.json` en la raíz. En `app/` hay un scaffold de Vite+TS+React aparcado que nunca llegó a reemplazar al `index.html` monolítico — ver §10.

---

## 2. Esquema de base de datos

Schema: `public`. RLS activo en todas las tablas salvo `shifts_backup_2026` (tabla de backup manual).

### 2.1 Diagrama de relaciones

```
auth.users (gestionado por Supabase Auth)
    │ auth_id (1:1 opcional)
    ▼
employees ─┬──< shifts (employee_id, created_by)
           │
           ├──< shift_requests (requester_id, target_id, approved_by)
           │       │ swap_group_id agrupa pares de un cambio multi-día
           │       ▼
           │    request_history (VIEW: approved|rejected|cancelled)
           │
           ├──< n2_assignments (employee_id, week_number UNIQUE por year)
           │
           ├──< rrhh_entries (employee_id, created_by) [sin uso activo en UI]
           │
           ├──< vacation_balance (employee_id, year UNIQUE)
           │
           └──< audit_log (actor_id)

festivos       (standalone — fechas de festivos Madrid)
coverage_rules (standalone — mínimos de cobertura editables)
shifts_backup_2026 (tabla de snapshot manual, RLS off)
```

### 2.2 Tablas

#### `employees` (1 fila activa en el momento de redactar)

| Columna | Tipo | Default / Notas |
|---------|------|-----------------|
| `id` | uuid PK | `uuid_generate_v4()` |
| `full_name` | text NOT NULL | |
| `short_name` | text NOT NULL | Nombre corto (clave lógica para `shifts_cache`, UI, RRHH) |
| `email` | text UNIQUE nullable | Login |
| `role` | text NOT NULL | default `'operator'`. Valores usados: `operator`, `staff`, `coordinator`, `manager`, `admin` |
| `active` | boolean NOT NULL | default `true` |
| `join_date` | date nullable | |
| `created_at` | timestamptz | `now()` |
| `username` | text UNIQUE nullable | Generado automáticamente al alta (`nombre.apellido` sin tildes) |
| `photo_url` | text nullable | URL externa (no hay Storage configurado) |
| `dni` | text nullable | |
| `auth_id` | uuid FK `auth.users(id)` | Si NULL → el empleado existe en BD pero no tiene cuenta Supabase Auth |

Índices: `employees_pkey`, `employees_email_key`, `employees_username_key`.

#### `shifts` (3.558 filas)

Una fila por (empleado, día) con turno asignado. No hay fila → día libre.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `employee_id` | uuid FK → employees | |
| `shift_date` | date NOT NULL | |
| `shift_type` | text NOT NULL | `M`/`T`/`N`/`D`/`V`/`B`/`P`/`O`/`L` — ver §6.3 |
| `notes` | text nullable | Para `D`: rango horario `HH:MM-HH:MM`. Para otros: libre |
| `created_by` | uuid FK → employees nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | trigger `trg_shifts_updated_at` (BEFORE UPDATE) |

Constraints: `UNIQUE(employee_id, shift_date)` → permite `upsert` con `onConflict:'employee_id,shift_date'`.

Índices: `shifts_pkey`, `idx_shifts_date`, `idx_shifts_employee_date`, `shifts_employee_id_shift_date_key` (el propio UNIQUE).

#### `shift_requests` (0 filas en el momento de redactar)

Solicitudes pendientes y resueltas.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `request_type` | text | `swap` / `vacation` / `personal_day` |
| `requester_id` | uuid FK → employees | Quien pide |
| `target_id` | uuid FK → employees nullable | Compañero de cambio (solo `swap`) |
| `requester_date`, `requester_shift` | date, text nullable | Para `swap`: fecha y turno que CEDE el solicitante. Para `personal_day`: fecha del día de asuntos |
| `target_date`, `target_shift` | date, text nullable | Para `swap`: fecha y turno que TOMA el solicitante |
| `vacation_start`, `vacation_end` | date nullable | Solo `vacation`. Ambos inclusive |
| `vacation_year` | int | default 2026 |
| `status` | text NOT NULL | default `pending`. Valores: `pending`, `approved`, `rejected`, `cancelled` |
| `approved_by` | uuid FK → employees nullable | |
| `notes` | text nullable | Texto libre del solicitante |
| `created_at`, `updated_at`, `resolved_at` | timestamptz | `trg_requests_updated_at` mantiene `updated_at` |
| `resolver_notes` | text nullable | Motivo del aprobador/rechazador |
| `swap_group_id` | uuid nullable | **Clave para swaps multi-día**: todas las filas de un mismo cambio de N días comparten este UUID. Generado en cliente con `crypto.randomUUID()` |

Índices: `shift_requests_pkey`, `idx_shift_requests_status`, `idx_shift_requests_requester`, `idx_shift_requests_group` (partial WHERE swap_group_id IS NOT NULL).

#### `vacation_balance` (1 fila)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `employee_id` | uuid FK | |
| `year` | int | default 2026 |
| `days_total` | int | default 23 |
| `days_used` | int | default 0 |
| `days_remaining` | int GENERATED | `days_total - days_used` |
| `updated_at` | timestamptz | trigger `trg_vb_updated_at` (usa `set_updated_at()`) |

Constraint: `UNIQUE(employee_id, year)`.

#### `festivos` (28 filas)

Festivos oficiales (fallback hardcoded en el código — ver §6.4).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `fecha` | date UNIQUE | |
| `nombre` | text | default `''` |
| `year` | int | default 2026 |

#### `n2_assignments` (0 filas)

Asignaciones semanales de guardia N2 (nivel 2 de escalado). Exactamente una fila por semana del año.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `week_number` | int | 1-53 |
| `year` | int | default 2026 |
| `employee_id` | uuid FK | |
| `has_festivo` | bool | default false (calculado a posteriori desde `festivos`) |
| `importe_base` | numeric | default 250.00 |
| `importe_festivo` | numeric | default 40.00 |
| `created_at`, `updated_at` | timestamptz | trigger `trg_n2_updated_at` |

Constraint: `UNIQUE(week_number, year)` → permite upsert.

#### `coverage_rules` (0 filas por defecto; se inicializa con `INIT_RULES`)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `label` | text | Ej. `"Turno mañana (L–V)"` |
| `weekday_value` | numeric nullable | Valor para laborable |
| `weekend_value` | numeric nullable | Valor para finde |
| `unit` | text | default `'operadores'`. Valores vistos: `operadores`, `horas`, `jornadas`, `días`, `horas/año` |
| `active` | bool | default true (no usado en UI) |
| `sort_order` | int | default 0 |
| `created_at`, `updated_at` | timestamptz | trigger `trg_rules_updated_at` |

El parser `parseCovMins(rules)` identifica reglas `M`/`T`/`N` por substring en el label (`"manana"`, `"tarde"`, `"noche"`).

#### `rrhh_entries` (0 filas — legacy, sin uso activo en UI)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `employee_id` | uuid FK | |
| `report_month`, `report_year` | int | |
| `entry_type` | text | |
| `value` | numeric nullable | |
| `fecha_hora` | text nullable | |
| `descripcion` | text nullable | |
| `created_by` | uuid FK nullable | |
| `created_at` | timestamptz | |

La vista `ResumenRRHH` **calcula la tabla en cliente** a partir de `shifts`, `n2_assignments` y `festivos` y la exporta a XLSX; no persiste en `rrhh_entries`. Está ahí para uso futuro.

#### `audit_log` (34 filas)

Log de auditoría best-effort (los errores de inserción se silencian intencionadamente).

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | bigint PK | serial |
| `action` | text | `login`, `request_created`, `request_approved`, `request_rejected`, `employee_deleted` |
| `details` | jsonb | default `{}` |
| `actor_id` | uuid FK → employees nullable | |
| `created_at` | timestamptz | |

#### `shifts_backup_2026` (2.988 filas, **RLS OFF**)

Snapshot de backup. Misma estructura que `shifts` pero sin PK, sin FK, sin RLS. Existe para poder restaurar tras una migración mal hecha. **No tocar desde código.**

### 2.3 Vista `request_history`

```sql
SELECT sr.id, sr.request_type, sr.status, sr.created_at, sr.resolved_at,
       r.full_name AS requester_name, r.short_name AS requester_short, r.id AS requester_id,
       t.full_name AS target_name, t.short_name AS target_short, t.id AS target_id,
       a.full_name AS approver_name,
       sr.requester_date, sr.requester_shift, sr.target_date, sr.target_shift,
       sr.vacation_start, sr.vacation_end,
       sr.notes AS requester_notes, sr.resolver_notes, sr.swap_group_id,
       CASE WHEN sr.request_type='vacation' THEN (sr.vacation_end - sr.vacation_start) + 1
            ELSE NULL END AS vacation_days
  FROM shift_requests sr
  JOIN employees r ON r.id = sr.requester_id
  LEFT JOIN employees t ON t.id = sr.target_id
  LEFT JOIN employees a ON a.id = sr.approved_by
 WHERE sr.status = ANY (ARRAY['approved','rejected','cancelled'])
 ORDER BY COALESCE(sr.resolved_at, sr.created_at) DESC;
```

Usada por `HistorialView` (sin filtro adicional, `limit 100`).

### 2.4 Funciones SQL (RPCs)

Todas en schema `public`. Todas las user-facing son `SECURITY DEFINER` para poder bypassear RLS bajo control tras comprobar rol con `is_noc_admin()`.

#### `is_noc_admin() RETURNS boolean` — `SECURITY DEFINER`, `STABLE`, lenguaje SQL
```sql
SELECT EXISTS (
  SELECT 1 FROM employees
  WHERE auth_id = auth.uid()
    AND role IN ('admin','manager','coordinator')
    AND active = true
);
```
**Nota:** incluye `coordinator` dentro de "admin NOC". Los operadores y staff quedan fuera.

#### `current_employee_id() RETURNS uuid` — `SECURITY DEFINER`, `STABLE`, SQL
```sql
SELECT id FROM employees WHERE auth_id = auth.uid() AND active = true LIMIT 1;
```
Base para las políticas de `shift_requests`, `rrhh_entries`, `vacation_balance`, `shifts.delete`.

#### `delete_employee_permanent(p_id uuid) RETURNS jsonb` — `SECURITY DEFINER`, plpgsql
Borra un empleado permanentemente. Pasos (en este orden):
1. Guard `is_noc_admin()` — si no, devuelve `{"error":"No autorizado"}`.
2. Nullifica referencias donde era aprobador/creador (`shifts.created_by`, `shift_requests.approved_by`, `shift_requests.target_id`, `rrhh_entries.created_by`).
3. Borra sus filas propias: `vacation_balance`, `rrhh_entries`, `n2_assignments`, `shifts`, `shift_requests` (como requester).
4. Borra de `employees`.
5. Inserta en `audit_log` con `actor_id = auth.uid()`.
6. Devuelve `{"ok":true, "deleted_name":"..."}`.

No borra del `auth.users` — eso lo hace el cliente con una segunda llamada a la Edge Function `manage-auth-user` action `delete`.

#### `resolve_swap_group(p_group_id uuid, p_new_status text, p_resolver_id uuid, p_resolver_notes text DEFAULT NULL) RETURNS TABLE(updated_count int, error text)` — SECURITY DEFINER
Cambia el `status` de TODAS las filas `shift_requests` con un mismo `swap_group_id` a `approved` o `rejected`, solo si estaban en `pending`. Guard `is_noc_admin()`. Usada para resolver cambios multi-día atómicamente.

#### `apply_swap_pair(p_req_emp uuid, p_req_date date, p_tgt_emp uuid, p_tgt_date date) RETURNS TABLE(ok bool, error text)` — SECURITY DEFINER
Intercambia dos turnos:
1. Lee `shifts.shift_type` actual de `(p_req_emp, p_req_date)` → `v_req_shift`.
2. Lee `shifts.shift_type` actual de `(p_tgt_emp, p_tgt_date)` → `v_tgt_shift`.
3. Valida que ambos sean `M`/`T`/`N`/`D` (no se puede swap contra libre, vacaciones o asuntos).
4. Borra las dos filas originales.
5. Upsert: `(p_req_emp, p_tgt_date, v_tgt_shift)` y `(p_tgt_emp, p_req_date, v_req_shift)` con `ON CONFLICT (employee_id, shift_date) DO UPDATE`.
6. En caso de excepción, devuelve `(false, SQLERRM)`.

#### `revert_swap_pair(p_req_emp, p_req_date, p_tgt_emp, p_tgt_date) RETURNS TABLE(ok bool, error text)` — SECURITY DEFINER
Revierte un swap ya aplicado:
1. Lee el turno que el solicitante tiene ahora en la fecha del compañero (`v_cur1`) y viceversa (`v_cur2`).
2. Borra las dos filas actuales (post-swap).
3. Reasigna con upsert: `(p_req_emp, p_req_date, v_cur2)` y `(p_tgt_emp, p_tgt_date, v_cur1)`.

Usada desde `HistorialView.cancelRequest` cuando el admin cancela un swap aprobado.

#### `adjust_vacation_balance(p_employee_id uuid, p_year int, p_delta int) RETURNS TABLE(new_used int, new_remaining int, error text)` — SECURITY DEFINER
Ajusta `vacation_balance.days_used` de forma atómica usando expresión relativa (`GREATEST(0, days_used + p_delta)`) para evitar race conditions read-modify-write entre dos admins que aprueban vacaciones simultáneamente. Devuelve `new_used`, `new_remaining` (`days_total - new_used`), o error si no hay balance.

#### Triggers auxiliares
- `set_updated_at()` → `NEW.updated_at = now()`. Usada por trigger de `vacation_balance`.
- `update_updated_at()` → idéntico pero con `SET search_path=''`. Usada por triggers de `shifts`, `shift_requests`, `coverage_rules`, `n2_assignments`.

### 2.5 Políticas RLS

| Tabla | Policy | CMD | Qual / With check |
|-------|--------|-----|-------------------|
| `employees` | `emp_select` | SELECT | `true` (todos los autenticados leen todos los empleados) |
| `employees` | `emp_update` | UPDATE | `auth_id=auth.uid() OR is_noc_admin()` |
| `employees` | `emp_insert_admin` | INSERT | `is_noc_admin()` |
| `employees` | `emp_delete_admin` | DELETE | `is_noc_admin()` |
| `shifts` | `shifts_select` | SELECT | `true` |
| `shifts` | `shifts_insert` | INSERT | `is_noc_admin()` |
| `shifts` | `shifts_update` | UPDATE | `is_noc_admin()` |
| `shifts` | `shifts_delete` | DELETE | `employee_id=current_employee_id() OR is_noc_admin()` |
| `shift_requests` | `sr_select` | SELECT | `requester_id=current_employee_id() OR target_id=current_employee_id() OR is_noc_admin()` |
| `shift_requests` | `sr_insert` | INSERT | with_check `requester_id=current_employee_id()` |
| `shift_requests` | `sr_update` | UPDATE | `is_noc_admin() OR requester_id=current_employee_id()` |
| `shift_requests` | `sr_delete` | DELETE | `requester_id=current_employee_id() OR is_noc_admin()` |
| `vacation_balance` | `vb_select` | SELECT | `employee_id=current_employee_id() OR is_noc_admin()` |
| `vacation_balance` | `vb_insert_admin` | INSERT | `is_noc_admin()` |
| `vacation_balance` | `vb_update` | UPDATE | `employee_id=current_employee_id() OR is_noc_admin()` |
| `vacation_balance` | `vb_delete_admin` | DELETE | `is_noc_admin()` |
| `festivos` | `festivos_select` | SELECT | `true` |
| `festivos` | `festivos_write` | ALL | `is_noc_admin()` |
| `coverage_rules` | `cov_select` | SELECT | `true` |
| `coverage_rules` | `cov_write` | ALL | `is_noc_admin()` |
| `n2_assignments` | `n2_select` | SELECT | `true` |
| `n2_assignments` | `n2_write` | ALL | `is_noc_admin()` |
| `rrhh_entries` | `rrhh_read` | SELECT | `employee_id=current_employee_id() OR is_noc_admin()` |
| `rrhh_entries` | `rrhh_write` | ALL | `is_noc_admin()` |
| `audit_log` | `audit_log_insert` | INSERT | `true` (cualquier autenticado escribe) |
| `audit_log` | `audit_log_select_admin` | SELECT | `role IN ('admin','manager','coordinator')` |

**Principios derivados:**
- Cualquiera que esté autenticado puede **leer** casi todo (útil para UI: ver quién trabaja hoy). La información sensible (solicitudes ajenas, vacaciones ajenas, RRHH ajeno) sí está protegida.
- **Escritura:** todo lo "de producción" (empleados, turnos, reglas, guardias, RRHH, festivos) es solo admin. Los operadores solo pueden crear/cancelar sus propias solicitudes y editar su propio empleado.
- RLS + `SECURITY DEFINER` es el único vector de seguridad real. No hay backend propio entre la app y la BD.

---

## 3. Autenticación y autorización

### 3.1 Flujo de login (código en `LoginView` y `App`)

```
Usuario introduce email + password
    │
    ▼ sb.auth.signInWithPassword({email, password})
    │   (Supabase Auth: POST /auth/v1/token?grant_type=password)
    │
    ▼ ok? ─ no ─▶ incrementar noc_login_fails_v2[email]
    │              si fails>=5 → bloqueo 180 s (lockout por email en localStorage)
    │
    ▼ ok? sí
    │
    ▼ sb.from('employees').select('*')
         .eq('auth_id', authData.user.id).eq('active', true).maybeSingle()
    │
    ▼ empleado existe y activo? ─ no ─▶ sb.auth.signOut()
    │                                     "Cuenta no encontrada o inactiva"
    │
    ▼ sí
    │
    ▼ logAudit('login',...); onLogin(emp);  // el componente App guarda currentUser
```

Al arrancar, `App.useEffect` llama `sb.auth.getSession()`. Si hay sesión activa (Supabase persiste el refresh_token en `localStorage` bajo la clave `sb-<project_ref>-auth-token`), recupera `currentUser` sin mostrar login.

Listener `sb.auth.onAuthStateChange` escucha `SIGNED_OUT` y `TOKEN_REFRESHED` (con session nula) para limpiar el estado cuando caduca la sesión o se cierra en otra pestaña.

### 3.2 Roles y routing

| Rol | Acceso frontend |
|-----|-----------------|
| `operator` | `OperatorDashboard` (página inicial), `TodayView`, `CalendarView` (read-only), `ProfileView` |
| `staff` | Idem operator |
| `coordinator` | Menú admin completo: `today`, `calendar` (editable), `team`, `admin`, `caln2`, `rrhh`, `profile`. En BD cuenta como admin NOC (`is_noc_admin()=true`) |
| `manager` | Idem coordinator |
| `admin` | Idem + puede editar el rol de otros a `admin` |

La detección en cliente:
```js
const isAdmin = currentUser && (currentUser.role==='admin' || currentUser.role==='manager' || currentUser.role==='coordinator');
const isOperator = currentUser && (currentUser.role==='operator' || currentUser.role==='staff');
```

Debe mantenerse coherente con `is_noc_admin()` en BD. Si añades un rol nuevo, ACTUALIZA los dos sitios.

### 3.3 Edge Function `manage-auth-user` con `verify_jwt=false`

La función se despliega con `verify_jwt: false` en el gateway de Supabase Edge Functions (ver `get_edge_function` → `"verify_jwt":false`). La decisión está documentada en el propio código:

```ts
// verify_jwt=false en el gateway — la verificación la hacemos aquí con getUser()
// getUser() valida el JWT consultando /auth/v1/user, que soporta HS256 y ES256
```

**Razón:** el gateway antiguo de Supabase valida internamente el JWT con el secreto HS256 histórico del proyecto. Cuando Supabase empezó a rotar claves a ES256 algunos proyectos antiguos heredaron un gateway que devolvía `"Invalid JWT algorithm"` al recibir un token firmado con ES256. La workaround estándar es desactivar la validación del gateway (`verify_jwt=false`) y validar manualmente llamando a `adminClient.auth.getUser(token)`, que consulta `/auth/v1/user` y acepta ambos algoritmos.

Esto NO es un downgrade de seguridad: la validación sigue haciéndose, solo cambia el lugar (Deno en lugar de PostgREST gateway).

### 3.4 Dentro de la Edge Function

```
1. CORS preflight (OPTIONS) → 200 OK.
2. Leer Authorization: Bearer <token>  → si falta, 401.
3. adminClient (SERVICE_ROLE_KEY) .auth.getUser(token) → valida JWT.
4. SELECT role FROM employees WHERE auth_id = user.id AND active=true.
5. role ∈ {admin, manager, coordinator} → sigue. Si no → 403.
6. Despachar por body.action:
   - create(email, password, full_name, role)
   - update_password(auth_id, password)
   - delete(auth_id)
```

Ver §7 para detalles.

---

## 4. Estructura del código frontend

Todos los componentes viven en el mismo `<script type="text/babel">`. Orden de aparición en `index.html`:

### 4.1 `App` (línea ~3956)

Raíz. Gestiona:
- `currentUser` (employee completo tras login) y `authChecked`.
- `page` (routing interno; no usa react-router — simple `useState`).
- `adminOpen` (acordeón del menú Administración).

Efectos:
- Al montar: `sb.auth.getSession()` → si hay sesión, lookup en `employees`, si no existe o está inactivo → `signOut()`.
- Suscripción a `sb.auth.onAuthStateChange` para detectar expiración.
- Llama `fetchFestivos()` una vez al arrancar para poblar el módulo `festDates`.

Routing estático en el objeto `P`:
```js
const P = {
  today: TodayView, calendar: ()=><CalendarView isAdmin={isAdmin}/>,
  team: TeamView, requests: RequestsView,
  admin: ()=><AdminView currentUser={currentUser}/>,
  caln2: CalN2View, rrhh: ResumenRRHH,
  opdashboard: ()=><OperatorDashboard user={currentUser}/>,
  profile: ()=><ProfileView user={currentUser} onUserUpdate={handleUserUpdate}/>,
};
```

Sidebar: dos menús distintos según rol (operator vs admin/manager/coordinator).

### 4.2 `LoginView` (línea ~2421)

Login con signInWithPassword. Lockout por email, 5 intentos, 180 s, guardado en `localStorage.noc_login_fails_v2` como mapa `{email: {fails, until?}}`. Countdown visible en la UI.

Props: `onLogin(user)`.
APIs llamadas: `sb.auth.signInWithPassword`, `sb.from('employees').select(...)`.

### 4.3 `OperatorDashboard` (línea ~2552)

Panel del operador. State: `selMonth`, `monthData`, `allShifts`, `myBalance`, `myReqs`, `notifications`, `showNotifs`, `modal`.

Cargas:
- Turnos del año completo (`.gte('shift_date','2026-01-01').lte('shift_date','2026-12-31')`).
- Últimas 20 solicitudes propias.
- Balance de vacaciones (`fetchVacationBalance`).
- Turnos del mes seleccionado (`fetchShiftsForMonth`).
- **Realtime:** `sb.channel('op-reqs-'+user.id).on('postgres_changes', ...)` filtrado por `requester_id=eq.${user.id}` para notificar al operador cuando sus solicitudes cambian de estado. Esto requiere que Realtime esté habilitado para la tabla `shift_requests` en Supabase (replication).

Widgets renderizados:
- Card "Resumen anual 2026" (horas, jornadas, MTND, vacaciones restantes).
- "Próximos 7 días".
- "Resumen del mes" navegable.
- "Mis solicitudes" agrupadas por `swap_group_id` para swaps multi-día.
- Botones abren `OpRequestModal`.

### 4.4 `OpRequestModal` (línea ~2847)

Modal para crear solicitudes. Tres modos: `cambio`, `asuntos`, `vacaciones`.

Estado principal:
- `swapPairs`: array de `{id, reqDate, tgtDate, reqShift, tgtShift}` (soporta N pares para un cambio multi-día).
- `form`: `{date1, date2, targetId, reason}`.
- `confirming`: dos pasos (editar → revisar antes de enviar).

Funciones clave:
- `validateAsuntos(dateStr)`: 1 día/año, no fin de semana, no lunes ni viernes, no adyacente a festivo.
- `validate()`: valida cambio multi-día exigiendo que ambos tengan turno `M`/`T`/`N`/`D`. Detecta pares duplicados.
- `addPair()`, `removePair(id)`, `addWeek()`: crea los 6 días siguientes consecutivos a partir del último par relleno (atajo "Completar semana").
- `save()`: inserta en `shift_requests`. Para `swap`, genera un `swap_group_id` con `crypto.randomUUID()` e inserta TODAS las filas con ese mismo group id. Para `asuntos` comprueba antes si ya hay una solicitud activa ese año.

Efecto reactivo: cuando cambian las fechas o el compañero, llama `fetchShiftsFor([userId,targetId], allDates)` en una sola query y pinta los badges de turno en cada par.

### 4.5 `CalendarView` (línea ~849)

Calendario mensual. Props: `isAdmin=true`. Si `false`, las celdas no son editables.

State:
- `mi`: mes actual (0-11).
- `dbShifts`: turnos del mes desde BD.
- `sel`: `{emp, days:Set}` — selección múltiple de celdas de UN MISMO operador.
- `batchModal`, `batchShift`, `dStart`, `dEnd`: modal de asignación en lote.
- `covMins`: mínimos de cobertura parseados de `coverage_rules`.

Mecanismo de refresh: `setInterval(500ms)` que compara `window.__calendarVersion` local vs global. Cualquier escritura de turnos (aprobación, batch, swap) incrementa la variable global y todas las vistas que hacen polling recargan.

Edición en lote: el admin hace clic en celdas del MISMO empleado, se acumulan en `sel.days`, luego "Aplicar a N días" → `Promise.all` de `saveShift(...)`. Para turno `D` (horas extra) abre un selector de rango horario que se guarda en `shifts.notes` como `"HH:MM-HH:MM"`.

Renderizado:
- `<thead>`: números de día con marcas de festivo/finde/hoy.
- `<tbody>`: una fila por operador, 28-31 columnas según mes. Cada celda es un `<Bdg s={shift}/>`.
- `<tfoot>`: resumen de cobertura por turno (M/T/N) con indicador `pill` en verde/amber/rojo según mínimo.

### 4.6 `TeamView` (línea ~1156)

Resumen anual del equipo. Consume `shifts` con paginación manual (Supabase tiene un límite de 1.000 filas por query → while loop con `.range(from, from+999)`).

Calcula por empleado:
- Horas anuales (`(M+T+N+P)*8 + dHours` donde `dHours` se lee del `notes` de los turnos `D`).
- Jornadas = M+T+N.
- Horas extra (solo del turno `D`).
- Bajas.
- Vacaciones usadas/restantes (desde `vacation_balance`).

Polling de `window.__calendarVersion` para refrescar.

### 4.7 `TodayView` (línea ~777)

Dashboard del día. Carga empleados activos, calcula quién trabaja hoy por turno (M/T/N) y compara con `covMins`. Marca verde/rojo "Cobertura correcta/insuficiente". Muestra ausencias (B y V).

### 4.8 `RequestsView` (línea ~1449)

Vista "legacy" de solicitudes pendientes. **Nota importante del código:** el estado inicial se pobla con `REQS` (constante hardcoded con datos de ejemplo) antes de que cargue BD. Hay un anti-patrón con `reqsRef = useRef(REQS)` para evitar que handlers async lean closures caducadas tras un re-render (solución a un bug de cierres con Babel in-browser).

Maneja aprobación/rechazo llamando directamente a `sb.rpc('apply_swap_pair', ...)`, `sb.rpc('adjust_vacation_balance', ...)` y upserts de `shifts`.

### 4.9 `AdminView` (línea ~1825)

Consola del admin. Contiene:
- Lista de solicitudes pendientes (`AdminReqItem` por cada una).
- `<HistorialView/>` embebido.
- Gestión de operadores (alta, editar, eliminar permanente con confirmación por nombre).
- Reglas de cobertura editables.
- Test de diagnóstico BD (`runDiagnostics()`).

Flujo de alta:
1. Insertar fila en `employees` (sin `auth_id`).
2. Generar password con `genTempPassword()`.
3. `callManageAuth({action:'create', email, password, full_name, role})` → Edge Function crea en Auth. Si el email ya existía (email colisión), la EF lo "recupera" actualizando la password → devuelve `{auth_id, recovered:true}`.
4. UPDATE `employees.auth_id = <nuevo_auth_id>`.
5. Si role === 'operator': INSERT en `vacation_balance` con `days_total=23` por default.
6. Mostrar modal con la password temporal (botón copiar al portapapeles).

Flujo de borrado permanente:
1. Modal rojo, requiere escribir el `full_name` exacto.
2. `sb.rpc('delete_employee_permanent', {p_id})`.
3. Si tenía `auth_id`, `callManageAuth({action:'delete', auth_id})`.

### 4.10 `AdminReqItem` (línea ~3837)

Ítem individual de la lista de solicitudes del admin. Maneja cambios multi-día expandibles. Aprueba aplicando `apply_swap_pair` por cada par y luego `resolve_swap_group` para marcarlas todas como approved atómicamente.

### 4.11 `HistorialView` (línea ~1652)

Card colapsable dentro de `AdminView`. Muestra `request_history` (últimas 100). Permite cancelar una solicitud aprobada:
- Si es swap multi-día (`_isGroup=true`): revierte cada par con `revert_swap_pair` y marca todas las filas como `cancelled`.
- Si es `vacation`: borra las filas `V` de `shifts`, llama `adjust_vacation_balance` con delta negativo.
- Si es `personal_day`: borra la fila `P` de `shifts`.

### 4.12 `CalN2View` (línea ~3376)

Calendario de guardia N2 para 2026. Rotación cíclica por defecto entre los 3 miembros `N2_MEMBERS` cuando no hay asignación en BD. Click en un nombre abre modal de confirmación y persiste en `n2_assignments` con upsert por `(week_number, year)`.

### 4.13 `ResumenRRHH` (línea ~3580)

Calcula filas para nómina mensual a partir de:
- Turnos `D` → Horas Extra (diurno L-V no festivo) o Horas Festivos (domingo/festivo/nocturno).
- Turnos `N` → Plus NOC (contador).
- Turnos `M`/`T` en festivo → Complemento Festivo 40€/día.
- Asignaciones N2 → Guardia N2 250€/semana + 40€ si la semana tiene festivo.

Aprobador:
```js
if (RESPONSABLES.find(r => r.name === empName)) return 'Joaquín';
return 'Sergio Santos Ruiz';
```

Exporta a XLSX con SheetJS (nombre fichero `RRHH_NOC_<Mes>_2026.xlsx`).

### 4.14 `ProfileView` (línea ~3219)

Edición de datos personales (DNI, email, foto URL), cambio de contraseña (con re-autenticación con `sb.auth.signInWithPassword` para validar la contraseña actual), y toggle de tema claro/oscuro (persistido en `localStorage.noc_theme`).

---

## 5. Flujos críticos paso a paso

### 5.1 Login + verificación de sesión

```
Pantalla inicial                          App.useEffect (una vez)
    │                                           │
    │                                           ▼
    │                                     sb.auth.getSession()
    │                                           │
    │                                           ▼
    │                                   ¿hay session?
    │                                   │         │
    │                                 sí│       no│
    │                                   ▼         ▼
    │                        SELECT employees     setAuthChecked(true)
    │                        WHERE auth_id=user.id  │
    │                                   │           │
    │                          ¿emp active?         │
    │                          │    │               │
    │                        sí│  no│               │
    │                          ▼    ▼               │
    │                setCurrentUser()  signOut()    │
    │                          │                    │
    └──────── ← no user ─────────────── ← auth fallida ───┘
                   │                                       │
                   ▼                                       │
                LoginView ◀──── sb.auth.signInWithPassword(){
                                 │           │
                              error│        ok│
                                 ▼           ▼
                        incrementar      SELECT employees
                        fails lockout    WHERE auth_id=...
                                              │
                                          active?
                                          │    │
                                          ▼    ▼
                                       onLogin signOut+error
```

### 5.2 Cambio de turno multi-día (de la creación a la aprobación)

```
Operador:
    OpRequestModal (modal='cambio')
    │
    ▼ Selecciona compañero (form.targetId)
    │
    ▼ Añade pares {reqDate, tgtDate} (N pares = N días)
    │
    ▼ useEffect detecta cambios → fetchShiftsFor([userId, targetId], allDates)
    │     → pinta badges de turno en cada par
    │
    ▼ Botón "Revisar solicitud →"  validate():
    │       - todos los pares tienen fechas
    │       - ambos tienen turno M/T/N/D
    │       - sin duplicados
    │
    ▼ Confirmación visual con tabla de pares
    │
    ▼ save():
    │   groupId = crypto.randomUUID()
    │   INSERT INTO shift_requests rows con swap_group_id=groupId, status='pending'
    │
    ▼ logAudit('request_created')

[...la solicitud aparece en AdminView.adminReqs agrupada por swap_group_id...]

Admin:
    AdminReqItem  (r.isGroup=true, r.pairs=[...])
    │
    ▼ Click "✓ Aprobar"
    │
    ▼ for (const p of r.pairs):
    │     sb.rpc('apply_swap_pair', {p_req_emp, p_req_date, p_tgt_emp, p_tgt_date})
    │       ├─ valida turnos M/T/N/D
    │       ├─ DELETE turnos originales
    │       └─ INSERT (con ON CONFLICT UPSERT) turnos intercambiados
    │
    ▼ Invalida shiftsCache de meses afectados
    │
    ▼ window.__calendarVersion++
    │
    ▼ sb.rpc('resolve_swap_group', {p_group_id, p_new_status:'approved', p_resolver_id})
    │     → UPDATE shift_requests SET status='approved'... WHERE swap_group_id=... AND status='pending'
    │
    ▼ logAudit('request_approved')
    │
    ▼ onResolved() → AdminView retira el ítem
    │
    ▼ setInterval en OperatorDashboard sb.channel postgres_changes dispara notificación al operador
```

Si `apply_swap_pair` falla a mitad (por ejemplo el par 3/5 devuelve error), los pares 1–2 ya aplicados **permanecen**. El error se muestra en la UI y el admin puede re-intentar. No es ideal (no es 100% atómico entre pares), pero cada par individualmente sí lo es.

### 5.3 Alta de empleado con contraseña temporal

```
AdminView → saveNewUser()
    │
    ▼ Valida firstName/lastName/email
    │
    ▼ full_name = "Nombre Apellidos"
    │ short_name = "Nombre PrimerApellido"
    │ username = "nombre.primerapellido" (normalizado: tildes fuera, espacios → ".")
    │
    ▼ tempPwd = genTempPassword()  // 12 chars seguros con Web Crypto
    │
    ▼ INSERT INTO employees (full_name, short_name, email, role, active, username [,join_date])
    │     retorna inserted.id
    │
    ▼ callManageAuth({action:'create', email, password:tempPwd, full_name, role})
    │   │
    │   ▼ EF valida JWT + rol del caller
    │   │
    │   ▼ adminClient.auth.admin.createUser({email, password, email_confirm:true, user_metadata})
    │   │
    │   ▼ ¿email ya existía?
    │       │        │
    │      sí│      no│
    │       ▼        ▼
    │   findAuthUserByEmail(email)   return {auth_id}
    │       │
    │       ▼ updateUserById(...) para forzar la password
    │       │
    │       ▼ return {auth_id, recovered:true}
    │
    ▼ UPDATE employees SET auth_id=<returned> WHERE id=inserted.id
    │
    ▼ si role='operator': INSERT vacation_balance (default 23 días)
    │
    ▼ Modal muestra la tempPwd con botón copiar
    │     → el admin tiene que comunicársela al empleado por canal seguro
    │     → en su primer login, ProfileView → Cambiar contraseña
```

### 5.4 Aprobación de vacaciones con `adjust_vacation_balance`

```
AdminView / RequestsView:
    handleApprove(r) con r.type='vacaciones'
    │
    ▼ Generar array `days` desde r.vacation_start a r.vacation_end (inclusive)
    │     con reloj a mediodía para evitar DST bugs
    │
    ▼ for (day of days):
    │     UPSERT INTO shifts (employee_id, shift_date=day, shift_type='V')
    │         ON CONFLICT (employee_id, shift_date) DO UPDATE
    │
    ▼ sb.rpc('adjust_vacation_balance', {p_employee_id, p_year, p_delta: days.length})
    │     → UPDATE atómico:
    │         days_used = GREATEST(0, days_used + days.length)
    │         RETURNING days_used, days_total
    │
    ▼ shiftsCache: borra las keys yyyy-MM afectadas
    │
    ▼ window.__calendarVersion++
    │
    ▼ UPDATE shift_requests SET status='approved', resolved_at=now()
    │
    ▼ logAudit('request_approved', {type:'vacation', days:N})
```

### 5.5 Cancelación desde historial

```
HistorialView.cancelRequest(h)
    │
    ▼ confirm() del admin
    │
    ▼ isGroup?
    │
    ├── sí (swap multi-día):
    │       for each req in h._rows: revertSwap(req) → sb.rpc('revert_swap_pair', ...)
    │       Invalida caches de meses
    │       window.__calendarVersion++
    │       UPDATE shift_requests SET status='cancelled' WHERE id IN (...)
    │
    ├── no, type='vacation':
    │       for each day in [vacation_start..vacation_end]:
    │           DELETE FROM shifts WHERE employee_id=.. shift_date=day shift_type='V'
    │       sb.rpc('adjust_vacation_balance', {delta: -N})
    │       UPDATE shift_requests SET status='cancelled'
    │
    ├── no, type='personal_day':
    │       DELETE FROM shifts WHERE employee_id=.. shift_date=.. shift_type='P'
    │       UPDATE shift_requests SET status='cancelled'
    │
    └── no, type='swap' (individual):
            revertSwap(req)
            UPDATE shift_requests SET status='cancelled'
```

---

## 6. Helpers y utilidades

### 6.1 Funciones globales

| Función | Ubicación | Qué hace |
|---------|-----------|----------|
| `callManageAuth(body)` | 312 | Llama a la Edge Function. Antes refresca la sesión con `sb.auth.refreshSession()`. Normaliza los errores a `{ok, data?, error?, status?}`. |
| `genTempPassword()` | 342 | 12 chars aleatorios con Web Crypto, alfabeto sin caracteres ambiguos (`I`, `l`, `O`, `0`...). |
| `genGroupId` | 714 | `crypto.randomUUID()` con fallback a timestamp+random para navegadores viejos. |
| `logAudit(action, details, actorId)` | 350 | INSERT best-effort en `audit_log`. Errores silenciados. |
| `fetchShiftsForMonth(monthIdx)` | 372 | Lee turnos de un mes con `employee:employee_id(short_name)`. Cachea en `shiftsCache[key]`. |
| `fetchShiftsFor(empIds, dates)` | 695 | Pluriconsulta: devuelve `Map<"empId_date", shift_type>`. Usada por el modal de swap. |
| `saveShift(shortName, date, shiftType, notes?)` | 399 | Resuelve empleado por short/full_name, upsert, invalida cache del mes. |
| `fetchEmployees()`, `fetchCoverageRules()`, `fetchN2Assignments()`, `fetchPendingRequests()`, `fetchRequestHistory()`, `fetchFestivos()`, `fetchVacationBalance()` | varios | Wrappers cortos sobre Supabase. |
| `runDiagnostics()` | 472 | Test de conectividad y permisos contra las tablas críticas. Se dispara desde el botón "Ejecutar test" en AdminView. |
| `approveRequest(req)` / `rejectRequest(reqId, notes)` | 539/666 | Lógica de aprobación legacy (usada por `RequestsView`). En `AdminReqItem` se usa la versión que llama directamente a las RPCs. |

### 6.2 Caches y variables de coordinación

| Variable | Scope | Propósito |
|----------|-------|-----------|
| `shiftsCache` | módulo | `{"2026-MM": {shortName:[s1..s31]}}`. Se invalida con `delete shiftsCache[key]`. |
| `window.__calendarVersion` | global | Contador. Cualquier escritura que afecte al calendario lo incrementa; vistas con polling detectan y recargan. |
| `window.__coverageVersion` | global | Mismo patrón, solo para cambios en `coverage_rules`. |
| `window.__pendingReqs` | global | Número de solicitudes pendientes. Actualizado desde `RequestsView` para que el badge del menú lateral lo lea. |
| `festDates` | módulo (`let`) | `Set<'YYYY-MM-DD'>`. Inicializa con `FEST_FALLBACK`, se sobrescribe con lo que venga de `fetchFestivos()`. |
| `EMPS`, `EMP_SHORT` | módulo | Arrays/maps vacíos al arrancar. **Nunca se rellenan** globalmente — cada vista los carga con su propio `useEffect`. Los valores por defecto solo aplican a la UI hasta que la query vuelve. |

### 6.3 Constantes de negocio

```js
CURRENT_YEAR       = 2026 (overridable en localStorage)
HMAX = 1624   // Horas anuales máx.
JMAX = 203    // Jornadas anuales
VMAX = 23     // Vacaciones anuales
MWK = {M:4, T:4, N:2}   // Cobertura mínima L-V
MWE = {M:2, T:2, N:2}   // Cobertura mínima finde
GUARDIA_N2_IMPORTE         = 250
GUARDIA_N2_FESTIVO_IMPORTE = 40
```

Tipos de turno y labels:
```js
SHIFT_LABEL_FULL = { M:'Mañana', T:'Tarde', N:'Noche', D:'Noche/Festivo',
                     V:'Vacaciones', P:'Asuntos propios', L:'Libre' };
SL = {M:'Mañana', T:'Tarde', N:'Noche', V:'Vacaciones', B:'Baja',
      D:'Horas extras', O:'Oficina', P:'Asuntos propios'};
SHIFT_COLOR = { M:'#7eb8f7', T:'#f7b84f', N:'#c084fc', D:'#fb923c',
                DN:'#f87171', V:'#4fc97a', P:'#2dd4bf' };
isWorkShift = s => s==='M'||s==='T'||s==='N'||s==='D';
```

### 6.4 Festivos fallback

```js
FEST_FALLBACK = ["2026-01-01","2026-01-06","2026-04-02","2026-04-03","2026-05-01",
                 "2026-05-02","2026-05-15","2026-08-15","2026-10-12","2026-11-02",
                 "2026-11-09","2026-12-07","2026-12-08","2026-12-25"];
```

14 fechas. La BD tiene 28 filas, así que al arrancar `fetchFestivos()` completa el set. Si la BD está caída, el fallback garantiza que la UI sigue marcando festivos.

### 6.5 Paleta y tema

Colores gestionados con CSS variables definidas en `:root`. `body.light-theme` sobrescribe el conjunto completo. El toggle está en `ProfileView.toggleTheme()`, se persiste en `localStorage.noc_theme` y se aplica al `<body>` en el IIFE del bootstrap (línea 357).

Las clases `.badge-M`, `.badge-T`, `.badge-N`, `.badge-V`, `.badge-B`, `.badge-D`, `.badge-DN`, `.badge-O`, `.badge-P`, `.badge-empty` existen para cada tipo de turno y tienen overrides específicos en el tema claro (líneas 248-259).

Coverage pills: `.covc-ok`, `.covc-warn`, `.covc-bad`. Verde si `cuenta >= mínimo`, amber si `>= mínimo-1`, rojo si menor.

---

## 7. Edge Function `manage-auth-user`

- **Slug:** `manage-auth-user`
- **Versión actual:** 4
- **verify_jwt:** `false` en el gateway.
- **Fichero:** `supabase/functions/manage-auth-user/index.ts` (no versionado en este repo — vive solo en Supabase).

### 7.1 Request

```http
POST /functions/v1/manage-auth-user
Content-Type: application/json
Authorization: Bearer <access_token_del_cliente_supabase>

{ "action": "create" | "update_password" | "delete", ... }
```

### 7.2 Variables de entorno

| Nombre | Uso |
|--------|-----|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave para `createClient` admin (bypass RLS, crea/edita auth.users) |
| `SUPABASE_ANON_KEY` | Importada pero no usada en la lógica actual |

Se inyectan automáticamente por Supabase Edge Functions — no configurar a mano salvo en rollout nuevo.

### 7.3 Acciones

#### `create`
```json
{ "action":"create", "email":"...", "password":"min8chars",
  "full_name":"...", "role":"operator" }
```
Llama `adminClient.auth.admin.createUser({email, password, email_confirm:true, user_metadata})`.

**Manejo de email duplicado:** si `createUser` devuelve error con substring `already|exists|registered|duplicate`, entra en el flujo de recuperación: lista todos los auth users paginando (hasta 5 páginas × 200 = 1.000), busca por email case-insensitive, y si lo encuentra hace `updateUserById` para forzar la nueva password. Devuelve `{auth_id, recovered:true}`.

#### `update_password`
```json
{ "action":"update_password", "auth_id":"...", "password":"min8chars" }
```
Simple `updateUserById`. Retorna `{ok:true}`.

#### `delete`
```json
{ "action":"delete", "auth_id":"..." }
```
`deleteUser(auth_id)`. Retorna `{ok:true}`.

### 7.4 Validación interna de JWT

1. Lee `Authorization: Bearer <token>` → 401 si falta.
2. `adminClient.auth.getUser(token)` — contacta `/auth/v1/user`, admite HS256 y ES256.
3. Busca `employees` por `auth_id` y `active=true`.
4. Comprueba `role IN ('admin','manager','coordinator')` → 403 si no.

No hace NINGUNA otra comprobación. Un admin puede dar de alta con cualquier rol, incluso `admin`.

### 7.5 CORS

Respuesta con `Access-Control-Allow-Origin: *` y headers permitidos `authorization, x-client-info, apikey, content-type`. Maneja preflight `OPTIONS`.

En producción podría restringirse al dominio real (`turnos.noc.avatel.es` o el de GitHub Pages) para endurecer.

---

## 8. Seguridad

### 8.1 Capas de defensa

1. **Supabase Auth** para autenticación. Contraseñas hasheadas por Supabase (bcrypt internamente).
2. **RLS** en todas las tablas `public.*` (salvo `shifts_backup_2026`).
3. **Funciones SQL `SECURITY DEFINER`** con guard `is_noc_admin()` para operaciones privilegiadas (swap, revert, borrado de empleado, resolución de grupo). Nunca revocan RLS sin comprobar rol.
4. **Edge Function `manage-auth-user`** con JWT validation interno.
5. **Lockout de login por email** en `localStorage`: 5 intentos → 180 s. No bloquea a toda la web, solo a la víctima/atacante con ese email.

### 8.2 Contraseñas

- Generadas por `genTempPassword()` con `crypto.getRandomValues`, 12 caracteres, alfabeto sin ambigüedades.
- Hasheadas por Supabase Auth (el plaintext nunca toca la BD pública).
- Reset del propio usuario: `ProfileView.changePassword()` → re-autentica con la contraseña actual y llama `sb.auth.updateUser({password})`.
- Reset por admin: `callManageAuth({action:'update_password'})` o (si el empleado no tenía `auth_id`) `create` con recovery automático.
- Mínimo 8 caracteres (validado tanto en frontend como en la Edge Function).

### 8.3 Superficie de ataque residual

| Vector | Estado |
|--------|--------|
| SQL injection | No hay SQL concatenado. Todo va por `sb.from(...)` (PostgREST) o `sb.rpc(...)` (RPC con parámetros tipados). |
| XSS | React escapa por defecto. No se usa `dangerouslySetInnerHTML` en ningún sitio. Campos libres (notas, motivo) no se renderizan como HTML. |
| CSRF | Irrelevante: la autenticación va por Bearer token en header, no por cookie. |
| Rate limiting | No hay. Supabase aplica el suyo interno pero la aplicación no. |
| Content Security Policy | No hay `<meta>` CSP. Todo se carga por CDN. Migrar a dominio propio debería añadir CSP estricto. |

---

## 9. Deploy y operaciones

### 9.1 GitHub Pages

- **Branch `main`** → dev/preview.
- **Branch `v2`** → producción. Hace falta mergear manualmente `main` → `v2` y pushear.
- `.nojekyll` en raíz evita que Jekyll procese underscores y oculte carpetas.
- La URL exacta es la que tenga configurada el repo (no verificada desde el código).

### 9.2 Deploy de un cambio nuevo

```
# Cambio en index.html (u otros archivos)
git commit -m "v3.X.Y: descripción"
git push origin main

# Cuando está validado:
git checkout v2
git merge main
git push origin v2

# GitHub Pages redespliega en 1-2 min.
```

No hay build step. Cualquier breaking change de React/Babel se detecta en dev probando con el CDN `@latest`.

### 9.3 Logs de Edge Function

Desde Supabase Studio: Settings → Edge Functions → `manage-auth-user` → Logs. O vía MCP `get_logs` (si se tiene permiso).

Los `console.error` de la EF aparecen ahí. La app silencia los errores de `logAudit()`, así que si algo va mal con la EF, hay que mirar ahí.

### 9.4 Migraciones SQL

Dos opciones:
1. **Supabase Studio → SQL Editor** (editar, "Run"). Sin control de versión.
2. **Migraciones vía MCP** (`apply_migration`). Tiene historial y rollback parcial.

En este repo NO hay carpeta `supabase/migrations/*.sql`. Todo el schema actual se construyó incrementalmente desde Studio. Si se planea migrar a infra propia, el primer paso es dumpear el schema con `pg_dump --schema-only -n public` para tener un fichero versionable.

### 9.5 Recrear la vista `request_history`

```sql
CREATE OR REPLACE VIEW public.request_history AS
SELECT sr.id, sr.request_type, sr.status, sr.created_at, sr.resolved_at,
       r.full_name AS requester_name, r.short_name AS requester_short, r.id AS requester_id,
       t.full_name AS target_name, t.short_name AS target_short, t.id AS target_id,
       a.full_name AS approver_name,
       sr.requester_date, sr.requester_shift, sr.target_date, sr.target_shift,
       sr.vacation_start, sr.vacation_end,
       sr.notes AS requester_notes, sr.resolver_notes, sr.swap_group_id,
       CASE WHEN sr.request_type='vacation'
            THEN (sr.vacation_end - sr.vacation_start) + 1
            ELSE NULL END AS vacation_days
  FROM shift_requests sr
  JOIN employees r ON r.id = sr.requester_id
  LEFT JOIN employees t ON t.id = sr.target_id
  LEFT JOIN employees a ON a.id = sr.approved_by
 WHERE sr.status = ANY (ARRAY['approved','rejected','cancelled'])
 ORDER BY COALESCE(sr.resolved_at, sr.created_at) DESC;
```

### 9.6 Backup manual

El repo tiene `shifts_backup_2026` con 2.988 filas (snapshot previo al año operativo). Para tomar uno nuevo:
```sql
CREATE TABLE shifts_backup_YYYY_MM_DD AS SELECT * FROM shifts;
ALTER TABLE shifts_backup_YYYY_MM_DD DISABLE ROW LEVEL SECURITY;
```

---

## 10. Deuda técnica conocida

- **Single HTML de 4.122 líneas** con Babel en el navegador. Cada carga en frío transpila ~3.900 líneas de JSX. Hay un scaffold Vite+TS+React en `app/` aparcado que nunca se terminó de migrar.
- **React y SDKs por CDN** sin pin de versión mayor (`@2` de Supabase, `@18/umd/...` de React). Si CDN rompe o tumba el fichero (nunca ha pasado), la app cae. **Recomendación a la hora de migrar:** bundle local con pin de versión exacta.
- **`setInterval` polling cada 500–2.000 ms** en `CalendarView`, `TodayView`, `TeamView`, `ResumenRRHH`, `PendingBadge`. Es funcional pero impreciso. La alternativa correcta es Realtime de Supabase (ya se usa en `OperatorDashboard`) o bus de eventos interno. No hay ningún listener `beforeunload` para limpiar intervalos; React lo gestiona vía `clearInterval` en el cleanup del `useEffect`.
- **`2026` hardcoded en strings de UI** (cabeceras "Enero 2026", input `defaultValue="2026-04-01"`...). `CURRENT_YEAR` es parametrizable pero solo afecta a datos (no a los labels). Grep recomendado: `rg -n '2026' index.html`.
- **Sin tests automatizados.** Ni unit ni e2e. El QA es manual.
- **`alert` / `confirm` nativos** en varios puntos (ej. `RequestsView`, `HistorialView`, `AdminView`). Bloquean el hilo principal y no son accesibles. Reemplazar por modales React.
- **`REQS` hardcoded** como estado inicial de `RequestsView` es un flash visible hasta que `fetchPendingRequests` responde. Debería inicializarse a `[]` con un `reqLoading=true`.
- **`EMPS`/`EMP_SHORT` módulo vacío**: cada vista hace su propio `SELECT employees`, lo que multiplica por N las consultas. Un único `EmployeesContext` eliminaría 5+ queries redundantes.
- **Lista de auth users paginada 1.000 hard cap** en la Edge Function. Si el proyecto crece a >1.000 cuentas, la recuperación de email duplicado fallará silenciosamente.
- **Auditoría con errores silenciados.** `logAudit` captura todo; no hay alerta si deja de funcionar.
- **Single-file pero usamos `React.useRef`/`React.useState`** en algunos sitios y `useRef`/`useState` (desestructurados) en otros. Inofensivo pero feo.
- **`window.__*` como bus global** es un anti-pattern. Refactor a un pub/sub local sería trivial y testeable.

---

## 11. Convenciones de código

- **Naming:** CamelCase para componentes, camelCase para funciones/variables. Algunos helpers SQL-adjacent usan snake_case. Sin ESLint configurado en la raíz (en `app/` sí lo hay).
- **Commits:** `vX.Y.Z: breve descripción`. Ejemplos reales (git log):
  - `v3.4: RRHH logic overhaul + Juan Carlos fix`
  - `v3.3: Login system, operator dashboard, profile + 3 critical bugfixes`
  - `v3.1: useRef + handleApprove - fix definitivo closures Babel`
- **Ramas:**
  - `main`: integración activa, dev stable.
  - `v2`: producción. Solo merges desde `main`.
  - `.claude/worktrees/*`: worktrees temporales del CLI Claude Code (no pushear).
- **Comentarios en español** y suelen explicar el "por qué" (ej. "Incremento relativo — evita race conditions entre aprobadores"). Mantener el estilo.

---

## 12. Troubleshooting común

### HTTP 401 al llamar a la Edge Function
Causa más frecuente: el `access_token` del cliente caducó (vida útil 1 h). `callManageAuth` ya llama `sb.auth.refreshSession()` antes, pero si el `refresh_token` también caducó (>7 días por defecto en Supabase) hay que relogarse.

También: si `verify_jwt` volviera accidentalmente a `true` en el gateway, un token ES256 daría 401. Comprobar en `Dashboard → Functions → manage-auth-user → Configuration`.

### Listado de empleados vacío en `AdminView`
Posible corrupción del `setEmpList`. El código protege contra esto: `if (!fetchErr && Array.isArray(fresh)) setEmpList(fresh);`. Si aun así está vacío: abrir dev tools → Network y mirar la respuesta de `select=*` sobre `employees`. Si es `[]`, no hay nada en BD (o RLS bloquea — improbable porque la policy de SELECT es `true`).

### Calendario no se refresca tras aprobar
El polling mira `window.__calendarVersion`. Comprobar en consola: `window.__calendarVersion`. Si no incrementa tras una aprobación, el handler no llamó a `window.__calendarVersion=(window.__calendarVersion||0)+1`. Otro caso: el cache `shiftsCache['2026-MM']` no se borró. Forzar `delete shiftsCache['2026-04']; window.__calendarVersion++` en consola para validar.

### Vacation balance negativo o inconsistente
`adjust_vacation_balance` usa `GREATEST(0, days_used + p_delta)` para que nunca vaya por debajo de cero, pero sí puede superar `days_total`. Si ocurre, es una aprobación sin validación previa. La UI comprueba el saldo en `deductVacationDays` (pero este helper no se usa en el flujo actual — es legacy). El flujo real solo valida desde el modal del operador (alert "Saldo insuficiente"). Puede saltarse si el admin crea manualmente las filas `V`. Fix directo en BD: `UPDATE vacation_balance SET days_used=<correcto> WHERE employee_id=... AND year=2026;`.

### Error "Invalid JWT algorithm ES256" al llamar a la Edge Function
Significa que el gateway volvió a `verify_jwt=true`. Solución: en el Dashboard poner la función a `verify_jwt=false` y volver a desplegar (la versión actual es la 4, con verify_jwt=false).

### Operador no ve sus solicitudes aprobadas actualizarse en tiempo real
Requiere que Realtime esté habilitado en `shift_requests`. En Supabase: Database → Replication → marca `shift_requests` como "Replica full". Si no está, los eventos `postgres_changes` nunca llegan. La vista sigue funcionando porque `myReqs` se refresca al montar, pero no hay notificación push.

### Empleado sin `auth_id` no puede entrar
El login hace `SELECT employees WHERE auth_id=user.id AND active=true`. Si alta manual en BD sin pasar por la EF, falta `auth_id`. Solución: AdminView → Editar empleado → "Nueva contraseña" (si no tiene auth_id, la EF hace `create` automáticamente y vincula).

### `shifts` devuelve menos filas de las que debería
Supabase limita a 1.000 filas por query. `TeamView` lo maneja paginando con `.range(from, from+999)`. Si añades una nueva vista con `SELECT * FROM shifts` sin paginar, obtendrás solo 1.000 filas. Usar siempre paginación cuando sea posible que haya más.

---

**Fin del manual.** Si algo falla o no se entiende, mira primero el código (`index.html` sigue siendo la fuente de verdad) y después `PREGUNTAS_INFRA.md`, `MANUAL_ADMIN.md` y `MANUAL_OPERADOR.md` en `docs/`. Si el error es de BD, el MCP de Supabase (`execute_sql`, `get_logs`, `list_migrations`) es la vía más rápida.
