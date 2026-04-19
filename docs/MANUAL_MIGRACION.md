# Guía de migración — NOC Turnos Avatel

> **Versión:** 1.0
> **Fecha:** 2026-04-19
> **Autor:** Equipo NOC (ssantos@avatel.es)
> **Estado:** Borrador inicial — pendiente de detalles de infraestructura Avatel
> **Alcance:** Salida completa de Supabase hacia infraestructura corporativa Avatel Telecom

---

## 1. Resumen ejecutivo

### 1.1 Por qué migramos

La aplicación **NOC Turnos Avatel** se construyó sobre Supabase (BaaS basado en Postgres) como solución rápida para cubrir una necesidad operativa inmediata del equipo NOC. Ha demostrado su valor en producción, pero la organización necesita ahora:

- **Reducir la dependencia de un proveedor SaaS externo** con sede fuera de la UE.
- **Alinear la aplicación con la infraestructura corporativa de Avatel Telecom** (política de seguridad, cumplimiento, auditoría interna).
- **Integrar la autenticación con el directorio corporativo** (idealmente SSO — Azure AD / LDAP) para evitar credenciales duplicadas.
- **Controlar datos sensibles** (DNI, email, saldos de vacaciones, turnos) en servidores gestionados por Avatel.
- **Unificar logs, backups, secretos y pipelines** bajo las políticas ya vigentes del resto de aplicaciones internas.

### 1.2 Qué cambia

| Capa | Actual | Objetivo |
|------|--------|----------|
| Backend BD | Supabase (Postgres gestionado) | Postgres propio de Avatel (o equivalente) |
| Autenticación | Supabase Auth (GoTrue) | Auth propia + JWT (o SSO corporativo) |
| RPC / funciones SQL | Postgres functions via `sb.rpc` | Mismas funciones en Postgres propio + endpoint REST |
| Edge Functions | Deno / Supabase Functions | Endpoint Node/Express (o equivalente) |
| Realtime | Supabase Realtime (WebSockets) | WebSocket propio o polling (fallback ya presente) |
| Hosting frontend | GitHub Pages (CDN público) | Nginx interno Avatel |
| Secretos | Anon key hardcodeada en HTML | Variables de entorno + Vault corporativo |

### 1.3 Qué NO cambia

- **Lógica de negocio** (reglas de cobertura, cambios de turno, swap groups, vacaciones, N2, festivos, RRHH).
- **UI/UX**: tablas, calendarios, modales, aprobaciones, notificaciones — todo igual.
- **Experiencia del operador y del responsable NOC**: el equipo que usa la app hoy no debe notar diferencia salvo, potencialmente, el login si se integra SSO.
- **Modelo de datos**: las tablas siguen siendo las mismas (`employees`, `shifts`, `shift_requests`, etc.). El esquema Postgres es portable 1:1.

### 1.4 Estimación de esfuerzo

| Fase | Esfuerzo (horas desarrollador senior) | Dependencias |
|------|---------------------------------------|--------------|
| 1. Refactor a capa `api.*` + build Vite | 30–40 h | Ninguna (se puede empezar ya) |
| 2. Backend propio (Postgres + API Node + Auth) | 60–80 h | Infra Avatel definida |
| 3. Migración de datos y RPCs | 20–30 h | Postgres destino listo |
| 4. Edge Function → endpoint admin | 15–20 h | Backend Node listo |
| 5. Realtime (opcional) | 10–20 h | Decisión sobre WS vs polling |
| 6. Testing en staging + validación NOC | 20–30 h | Entorno staging |
| 7. Cutover y soporte post-migración | 10–15 h | Ventana de mantenimiento |
| **Total estimado** | **165–235 h (4–6 sprints de 2 semanas)** | |

---

## 2. Inventario de dependencias actuales

### 2.1 Llamadas Supabase en `index.html`

Extraído por análisis directo del fichero (4006 líneas, monolito React + Babel):

| Tipo de llamada | Ocurrencias | Superficie |
|-----------------|------------:|-----------|
| `sb.from(...)` — acceso a tablas | **~87** | Lecturas y escrituras directas de 9 tablas |
| `sb.rpc(...)` — funciones SQL | **9** | 5 RPCs distintas (ver §2.2) |
| `sb.auth.*` | **10** | `signInWithPassword`, `getSession`, `refreshSession`, `signOut`, `updateUser`, `onAuthStateChange` |
| `sb.functions.invoke(...)` | **3** (1 wrapper `callManageAuth` + 2 referencias) | Única Edge Function: `manage-auth-user` |
| `sb.channel(...)` | **1** | Notificaciones de cambios en `shift_requests` del operador logueado |
| `sb.removeChannel(...)` | **1** | Cleanup del listener Realtime |

### 2.2 Tablas accedidas por `sb.from`

| Tabla | Uso |
|-------|-----|
| `employees` | Plantilla: lectura masiva, alta/baja/modificación |
| `shifts` | Turnos por empleado-día (upsert con conflicto `employee_id,shift_date`) |
| `shift_requests` | Solicitudes (vacaciones, cambios, asuntos propios) + `swap_group_id` |
| `vacation_balance` | Saldo anual de vacaciones por empleado |
| `n2_assignments` | Asignaciones de N2 (segundo nivel) |
| `coverage_rules` | Reglas de cobertura por franja/día |
| `festivos` | Festivos nacionales/locales |
| `audit_log` | Log inmutable de acciones admin |
| `request_history` | Vista SQL (no tabla) del histórico de peticiones |

### 2.3 RPCs (funciones Postgres)

Las 5 RPCs a replicar **tal cual** en el nuevo Postgres:

| Función | Parámetros | Propósito |
|---------|-----------|-----------|
| `apply_swap_pair` | `p_req_emp, p_req_date, p_tgt_emp, p_tgt_date` | Intercambio atómico de turnos entre dos empleados |
| `revert_swap_pair` | `p_req_emp, p_req_date, p_tgt_emp, p_tgt_date` | Revertir un swap ya aplicado |
| `resolve_swap_group` | `p_group_id, p_new_status, p_resolver_id` | Resolver grupo de swaps multi-día atómicamente |
| `adjust_vacation_balance` | `p_employee_id, p_year, p_delta` | Sumar/restar días de vacaciones al saldo |
| `delete_employee_permanent` | `p_id` | Borrado con cascade controlado de empleado |

### 2.4 Funciones auth usadas

| Método | Ubicación aproximada | Reemplazo necesario |
|--------|----------------------|---------------------|
| `signInWithPassword({email, password})` | Login (`LoginView`) | `POST /auth/login` → JWT |
| `getSession()` | Bootstrap app + wrapper `callManageAuth` | `GET /auth/session` o leer JWT local |
| `refreshSession()` | Wrapper `callManageAuth` | `POST /auth/refresh` |
| `onAuthStateChange(cb)` | Bootstrap app (listener global) | EventEmitter en capa `api.auth` |
| `signOut()` | Logout + recovery en login | `POST /auth/logout` + clear local storage |
| `updateUser({password})` | Perfil operador (cambio de contraseña) | `POST /auth/update-password` |

### 2.5 Edge Function `manage-auth-user`

Acciones soportadas (invocadas desde el frontend vía `callManageAuth`):

| Acción | Body esperado | Equivalente en nuevo backend |
|--------|---------------|------------------------------|
| `create` | `{email, password, full_name, role}` | `POST /admin/users` |
| `update_password` | `{auth_id, password}` | `PATCH /admin/users/:id/password` |
| `delete` | `{auth_id}` | `DELETE /admin/users/:id` |

Requiere privilegio service-role (admin) — hoy la función se protege con el JWT del admin llamante.

### 2.6 Canales Realtime

Un único canal activo:

```js
sb.channel('op-reqs-' + user.id)
  .on('postgres_changes', {event:'UPDATE', schema:'public', table:'shift_requests',
       filter:`requester_id=eq.${user.id}`}, payload => { /* notificar */ })
  .subscribe();
```

Notifica al operador cuando su solicitud cambia de estado (`approved`/`rejected`/`cancelled`).

### 2.7 CDN scripts cargados

Todos desde `<script>` hardcodeados en `index.html` (líneas 7–11):

```html
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"></script>
```

**Problema de cumplimiento**: dependencia en tiempo real de 3 CDN externos (unpkg, jsdelivr, cdn.sheetjs.com) + fuentes de Google. En la nueva infraestructura **todo debe empaquetarse en el bundle servido por Nginx interno**.

### 2.8 Secretos en código

Localizados en `index.html` líneas 301–302:

```js
const SUPABASE_URL = 'https://naywdwsjwtbagbzrncke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJI...Jwxxxxx';  // anon key (JWT firmada con secreto Supabase)
```

- **SUPABASE_URL**: público, no sensible por sí mismo, pero identifica el proyecto.
- **SUPABASE_ANON_KEY**: teóricamente público (se usa en cliente), pero **su protección efectiva depende 100% de las políticas RLS** activas en el proyecto Supabase.
- **SUPABASE_SERVICE_ROLE_KEY**: NO aparece en el frontend (correcto). Vive solo dentro de la Edge Function `manage-auth-user` como secreto de Supabase. **Debe extraerse antes del corte y custodiarse en Vault hasta que deje de usarse.**

### 2.9 Políticas RLS (Row-Level Security)

Supabase protege el acceso directo del cliente al Postgres mediante políticas RLS por tabla y por rol (`authenticated`, `anon`, `service_role`). El nuevo backend **no debe replicar RLS si elige la arquitectura REST (Opción A)**: la autorización se implementa en la capa API. Sin embargo, la auditoría de las políticas actuales es obligatoria para no regresionar permisos.

Políticas a exportar y reimplementar como middleware de autorización (ejemplos típicos del proyecto):

- `employees`: SELECT abierto a autenticados; INSERT/UPDATE/DELETE solo `admin|manager`.
- `shifts`: SELECT abierto; UPDATE/DELETE solo admin o el propio empleado en casos definidos.
- `shift_requests`: cada usuario ve y edita solo las suyas; admin ve todas.
- `vacation_balance`: cada usuario ve el suyo; solo admin modifica.
- `audit_log`: INSERT abierto (log), SELECT solo admin.
- `coverage_rules`, `n2_assignments`, `festivos`: SELECT público, escritura solo admin.

> **Acción requerida**: exportar políticas reales con `pg_dump --schema-only` y revisar cada una con el jefe del NOC antes de la migración.

---

## 3. Arquitectura objetivo — 3 opciones

### Opción A — Postgres propio + API REST Node/Express (**RECOMENDADA**)

**Diagrama de bloques:**

```
[Navegador] --HTTPS--> [Nginx Avatel] --/api/*--> [Node API] --pg--> [Postgres Avatel]
                                \--/*------> [Static bundle]    |
                                                               \--> [Tablas + RPCs = copia 1:1]
```

**Ventajas:**

- **Mapeo 1:1 con la arquitectura actual**: mismo Postgres, mismas tablas, mismas RPCs. El coste de migración de BD es cercano a cero (solo `pg_dump | pg_restore`).
- Stack mainstream en Avatel (Node es probablemente ya parte del parque).
- Autorización centralizada en la API — más fácil de auditar que RLS.
- El frontend solo cambia la capa `api.*` (ver §4).

**Desventajas:**

- Hay que escribir endpoints genéricos o específicos (~20 endpoints aprox. para cubrir las 87 llamadas `sb.from`).
- Mantenimiento de la API Node (vs. el cero-mantenimiento de Supabase).

**Veredicto: ésta es la opción elegida por defecto. El resto del documento asume Opción A salvo mención explícita.**

### Opción B — Postgres propio + GraphQL (Hasura / PostGraphile / Apollo)

**Ventajas:**

- Hasura expone automáticamente tablas y RPCs con permisos por rol — muy similar al patrón Supabase.
- Menos código en el backend (schema auto-generado).

**Desventajas:**

- Introduce una pieza nueva (Hasura/PostGraphile) que el equipo Avatel tiene que aprender y operar.
- El frontend habría que reescribirlo sobre Apollo Client o `graphql-request`: mayor esfuerzo en el cliente.
- Realtime con GraphQL subscriptions requiere WebSocket dedicado igualmente.

**Veredicto**: buena opción si Avatel ya usa Hasura; si no, añade fricción.

### Opción C — Firebase / Firestore (o equivalente NoSQL gestionado)

**Ventajas:**

- Realtime nativo y más simple que Supabase Realtime.
- Sin servidor que mantener.

**Desventajas — prohibitivas en este proyecto:**

- **NoSQL** rompe el modelo relacional: swaps atómicos, joins a `employees`, RPCs transaccionales dejan de existir. Habría que rediseñar toda la persistencia.
- Supone subcontratar a Google/otro SaaS — exactamente el problema que estamos resolviendo al salir de Supabase.
- Coste en consultas de un calendario de 12 meses × 20 empleados puede dispararse.

**Veredicto**: no recomendada. Listada para cerrar el debate.

---

## 4. Estrategia recomendada — Capa de abstracción `api.*`

### 4.1 Patrón

La idea es **desacoplar el código React de Supabase** mediante un objeto `api` que exponga la misma forma que `sb` pero cuya implementación sea intercambiable.

```js
// ── capa actual (acoplada a Supabase) ─────────────────────────────
const { data, error } = await sb.from('employees').select('*');
const { data, error } = await sb.rpc('apply_swap_pair', {p_req_emp, ...});
const { data } = await sb.auth.getSession();

// ── capa objetivo (abstraída) ─────────────────────────────────────
const { data, error } = await api.from('employees').select('*');
const { data, error } = await api.rpc('apply_swap_pair', {p_req_emp, ...});
const { data } = await api.auth.getSession();

// ── implementación Día 1 (delega a Supabase — cero cambios funcionales) ────
// src/api.js
import { createClient } from '@supabase/supabase-js';
const sb = createClient(import.meta.env.VITE_SUPABASE_URL,
                        import.meta.env.VITE_SUPABASE_ANON_KEY);
export const api = {
  from: (t) => sb.from(t),
  rpc:  (fn, args) => sb.rpc(fn, args),
  auth: sb.auth,
  functions: { invoke: (name, opts) => sb.functions.invoke(name, opts) },
  channel: (name) => sb.channel(name),
  removeChannel: (ch) => sb.removeChannel(ch),
};
```

### 4.2 Plan de pasos

1. **Paso 1** (sin riesgo): crear `src/api.js` que **delega** a Supabase. El código sigue funcionando idéntico.
2. **Paso 2** (mecánico): buscar-reemplazar **`sb.`** → **`api.`** en el bundle. ~110 ocurrencias totales. Trivial con un `rg` + `sed` controlado, o manual por tramos.
3. **Paso 3** (cuando haya backend Avatel): reescribir `src/api.js` para que `api.from`, `api.rpc`, etc. hablen con el backend Node vía `fetch`. **El componente React no se toca.**
4. **Paso 4**: tests de regresión en staging. Si todo funciona, retirar `@supabase/supabase-js` del bundle.

### 4.3 Forma mínima del `api.from` nuevo (ejemplo)

El objetivo es imitar el **query builder fluido** de Supabase. Para minimizar fricción se puede implementar una versión "suficiente" del subconjunto usado (no hay que clonar toda la librería):

```js
// src/api-native.js (implementación para backend Node propio)
function query(table) {
  const q = { table, filters: [], selectCols: '*', order: [], limit: null, single: false };
  const chain = {
    select(cols='*') { q.selectCols = cols; return chain; },
    eq(col, val)     { q.filters.push(['eq', col, val]); return chain; },
    in(col, vals)    { q.filters.push(['in', col, vals]); return chain; },
    order(col, opts) { q.order.push([col, opts?.ascending===false?'desc':'asc']); return chain; },
    limit(n)         { q.limit = n; return chain; },
    single()         { q.single = true; return chain; },
    maybeSingle()    { q.single = 'maybe'; return chain; },
    insert(rows)     { return send('POST', q, rows); },
    update(patch)    { return send('PATCH', q, patch); },
    upsert(rows, o)  { return send('PUT',  {...q, onConflict: o?.onConflict}, rows); },
    delete()         { return send('DELETE', q); },
    then(resolve, reject) { return send('GET', q).then(resolve, reject); }, // thenable para awaits sin builder final
  };
  return chain;
}

async function send(method, q, body) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: {'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`},
    body: JSON.stringify({ method, query: q, body }),
  });
  const json = await res.json();
  return { data: json.data, error: json.error || null };
}

export const api = {
  from: query,
  rpc: async (fn, args) => {
    const r = await fetch(`/api/rpc/${fn}`, {
      method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(args),
    });
    return r.json();
  },
  auth: { /* login, getSession, refreshSession, signOut, updateUser, onAuthStateChange */ },
  functions: { invoke: async (name, {body}) => {
    const r = await fetch(`/api/fn/${name}`, {
      method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(body),
    });
    return { data: await r.json(), error: null };
  }},
  channel: /* ver §5.5 */,
};
```

> **Nota**: una alternativa más limpia es **no imitar el builder** y escribir endpoints específicos (`GET /api/employees`, `POST /api/shifts/upsert`, etc.). Decisión a tomar con el equipo Avatel según gustos de API design. El builder genérico minimiza cambios en el frontend; endpoints REST específicos son más claros pero requieren tocar cada sitio de llamada.

---

## 5. Plan de migración detallado por bloques

### Bloque 1 — Frontend

- **Sustituir CDN por build Vite**: ya existe scaffold (ver `app/` si procede). Instalar `react`, `react-dom`, `xlsx`, `@supabase/supabase-js` como dependencias locales. Quitar los `<script>` CDN de `index.html`.
- **Crear `src/api.js`** (ver §4).
- **Variables de entorno**: `.env.production` con `VITE_API_BASE_URL`, `VITE_AUTH_MODE` (sso|password), etc. **Ya no debe haber claves hardcodeadas.**
- **Hosting**: Nginx interno Avatel sirviendo el bundle estático + proxy-pass a la API Node (`location /api/ { proxy_pass http://api:3000; }`).
- **CSP headers**: tras empaquetar todo localmente, la Content-Security-Policy puede ser muy restrictiva (`default-src 'self'`).

### Bloque 2 — Base de datos

1. **Exportar el esquema Supabase**:

   ```bash
   pg_dump --schema-only --no-owner --no-privileges \
     "postgres://postgres:<pwd>@db.naywdwsjwtbagbzrncke.supabase.co:5432/postgres" \
     > schema.sql
   ```

2. **Extraer datos** por tabla (sin tocar `auth.*`):

   ```bash
   pg_dump --data-only --table=public.employees --table=public.shifts \
           --table=public.shift_requests --table=public.vacation_balance \
           --table=public.n2_assignments --table=public.coverage_rules \
           --table=public.festivos --table=public.audit_log \
           ... > data.sql
   ```

3. **Restaurar en Postgres Avatel**:

   ```bash
   psql "postgres://app:<pwd>@db.avatel.interno:5432/turnos" < schema.sql
   psql "..." < data.sql
   ```

4. **Migrar las 5 RPCs**: copia 1:1 del fichero `schema.sql` (las funciones `apply_swap_pair`, etc. son PL/pgSQL estándar y portables). **Verificar permisos `GRANT EXECUTE` al rol de aplicación.**
5. **Políticas RLS**: dos estrategias:
   - **A (recomendada)**: desactivar RLS en el nuevo Postgres (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`) y controlar todo desde la API. El rol que usa Node conecta como usuario con permisos completos; el middleware REST filtra por rol del JWT.
   - **B (más conservadora)**: mantener RLS y hacer que Node conecte con `SET LOCAL role = 'authenticated_<employee_id>'` por request. Más complejo pero cero cambios en políticas.

### Bloque 3 — Autenticación

**Opciones, por orden de preferencia corporativa:**

#### 3.1 SSO corporativo (óptimo)

- Si Avatel tiene Azure AD / Entra ID → OIDC con `passport-azure-ad` o `openid-client`.
- Si Avatel tiene LDAP → `ldapjs` en la API + sesión JWT firmada por la API.
- **Ventaja clave**: eliminamos la tabla `auth.users` por completo. El `employees.username` mapea al `sAMAccountName` / `userPrincipalName`.

#### 3.2 Auth propia con JWT (plan B)

Si no hay SSO disponible en plazo:

- Tabla `auth_users(id uuid, email, password_hash bcrypt, created_at, last_login)`.
- Endpoints:
  - `POST /auth/login` → valida bcrypt, devuelve `{access_token, refresh_token, user}`.
  - `POST /auth/refresh` → refresh flow.
  - `POST /auth/logout` → invalida refresh token (tabla `refresh_tokens` con `revoked_at`).
  - `POST /auth/update-password` → valida old + cambia hash.
- Libs: `jsonwebtoken`, `bcrypt`, `zod` para validación.

#### 3.3 Migración de hashes desde Supabase

Supabase usa bcrypt. En teoría los hashes son portables:

```sql
-- en Supabase:
SELECT id, email, encrypted_password FROM auth.users;
-- encrypted_password ya está en formato $2a$10$... → compatible con bcryptjs/bcrypt
```

**Pero**: por seguridad corporativa se recomienda **forzar reset global** en el cutover:
- Enviar a todos los operadores un email con link de "establecer nueva contraseña".
- O generar contraseñas temporales (ya existe `genTempPassword()` en el código, línea 342 de `index.html`) y entregarlas presencialmente al responsable NOC.

Ventaja del reset global: evita arrastrar deuda técnica de hashes antiguos y deja limpia la auditoría de primeros accesos.

### Bloque 4 — Edge Function `manage-auth-user` → endpoint admin

Reescribir como endpoint Node. **Mantener exactamente la misma firma para el frontend**:

```js
// backend/routes/admin-users.js
router.post('/admin/users', requireAdmin, async (req, res) => {
  const { action, email, password, full_name, role, auth_id } = req.body;
  switch (action) {
    case 'create':         return createUser({email, password, full_name, role});
    case 'update_password':return updatePwd(auth_id, password);
    case 'delete':         return deleteUser(auth_id);
    default: return res.status(400).json({error:'Acción desconocida'});
  }
});

// en el frontend, la capa api.functions.invoke traduce:
api.functions.invoke = async (name, { body }) => {
  if (name === 'manage-auth-user') {
    const r = await fetch('/api/admin/users', {
      method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return { data, error: r.ok ? null : { message: data.error } };
  }
};
```

El middleware `requireAdmin` debe validar el JWT del llamante y comprobar `role in (admin, manager)`.

### Bloque 5 — Realtime

**Análisis**: Hoy solo se usa para un caso — notificar al operador cuando el admin aprueba/rechaza su petición. No es imprescindible: el operador puede refrescar manualmente, y el código ya hace polling secundario en varios puntos.

**Opciones:**

1. **Eliminar Realtime**: añadir botón "Refrescar" en el dashboard operador + polling cada 30–60 s con `setInterval` sobre `api.from('shift_requests').select(...)`. **Cero infra nueva.**
2. **WebSocket propio en Node**: `socket.io` o `ws` nativo. Al aprobar/rechazar en admin, emitir `emit('req-updated', {requester_id, request_id})`. El cliente del operador filtra por su `user.id`. ~1 día de trabajo.
3. **Server-Sent Events (SSE)**: más simple que WS porque es HTTP unidireccional. `GET /api/stream?user_id=X` con `Content-Type: text/event-stream`. Encaja perfectamente con este caso de uso (push solo del servidor al cliente).

**Recomendación**: empezar con **polling** (opción 1) para el corte. Si los operadores se quejan, añadir SSE (opción 3) en la siguiente iteración.

### Bloque 6 — Storage (fotos de perfil)

El campo `employees.photo_url` hoy apunta a URLs externas (probablemente Supabase Storage o URLs públicas). Para la nueva infra:

- **Si el NOC no usa fotos en producción** (auditar en BD: `SELECT count(*) FROM employees WHERE photo_url IS NOT NULL`) → eliminar el campo y el input del formulario. Simplificación inmediata.
- **Si se usan**: migrar a un bucket S3-compatible interno (MinIO en infra Avatel) o un directorio servido por Nginx con rutas firmadas.

---

## 6. Datos críticos a preservar

| Tabla origen | Tabla destino | Volumen típico | Notas |
|--------------|---------------|----------------|-------|
| `employees` | `employees` | ~20–40 filas | Campo `auth_id` se reescribe al recrear usuarios en el nuevo Auth |
| `shifts` | `shifts` | ~10k filas/año | Clave `(employee_id, shift_date)` — preservar constraint UNIQUE |
| `shift_requests` | `shift_requests` | ~500–2000/año | Preservar `swap_group_id` (agrupa swaps multi-día) |
| `vacation_balance` | `vacation_balance` | `n_empleados × n_años` | Validar que `days_remaining` cuadra tras migración |
| `n2_assignments` | `n2_assignments` | ~100/año | |
| `festivos` | `festivos` | ~15/año × n años | Preservar fechas históricas |
| `coverage_rules` | `coverage_rules` | <50 filas | Configuración estática |
| `audit_log` | `audit_log_legacy` | Crece sin límite | **Archivar histórico en tabla separada, arrancar `audit_log` limpio** |
| `auth.users` | `auth_users` (o reset) | = n empleados | Ver §5.3 (migrar hashes o reset global) |
| `request_history` (vista) | (vista) | N/A | Recrear la vista con el mismo `SELECT` sobre el nuevo Postgres |

### 6.1 Orden de migración

1. Crear schema vacío en Postgres Avatel.
2. Migrar tablas sin FK primero: `festivos`, `coverage_rules`, `audit_log_legacy`.
3. Migrar `employees` (sin `auth_id`).
4. Crear usuarios en el nuevo Auth, rellenar `employees.auth_id`.
5. Migrar tablas con FK a `employees`: `shifts`, `shift_requests`, `vacation_balance`, `n2_assignments`.
6. Recrear vistas (`request_history`) y RPCs.
7. Reindexar (`REINDEX DATABASE turnos`) y `ANALYZE`.

### 6.2 Validación post-migración

Consultas de sanidad que deben devolver el mismo resultado en origen y destino:

```sql
SELECT COUNT(*) FROM employees WHERE active=true;
SELECT shift_date, COUNT(*) FROM shifts GROUP BY shift_date ORDER BY shift_date DESC LIMIT 30;
SELECT status, COUNT(*) FROM shift_requests GROUP BY status;
SELECT year, SUM(days_remaining) FROM vacation_balance GROUP BY year;
```

---

## 7. Testing y validación

### 7.1 Entorno staging

Antes del cutover debe existir un **staging completo** con:

- BD Postgres Avatel (copia de datos reales anonimizados o snapshot de un día).
- API Node corriendo con el mismo código que irá a producción.
- Frontend apuntando a `staging-turnos.avatel.interno`.
- Al menos 2 cuentas de prueba: 1 admin, 1 operador.

### 7.2 Checklist funcional (manual, a ejecutar antes del corte)

- [ ] Login con usuario/contraseña (o SSO si aplica).
- [ ] Login con credenciales incorrectas bloquea tras 5 intentos (tolerancia existente).
- [ ] Dashboard operador carga turnos, saldo vacaciones y próximos 7 días.
- [ ] Solicitar día de asuntos propios → aparece en "pendientes".
- [ ] Solicitar rango de vacaciones → impacta saldo cuando se apruebe.
- [ ] Solicitar cambio de turno multi-día → `swap_group_id` agrupa las peticiones.
- [ ] Admin aprueba cambio de turno → `apply_swap_pair` se ejecuta correctamente.
- [ ] Admin rechaza petición → operador recibe notificación (o, si polling, la ve tras refrescar).
- [ ] RRHH export a Excel funciona (`xlsx` bundled local).
- [ ] Alta de empleado crea usuario en Auth + `vacation_balance` automático.
- [ ] Reset de contraseña desde admin actualiza el hash.
- [ ] Borrado lógico y `delete_employee_permanent` funcionan.
- [ ] Logout invalida la sesión y al refrescar pide login otra vez.

### 7.3 Estrategia de rollback

Durante la ventana de corte (ver §8), mantener **Supabase en modo lectura** durante 7 días:

- DNS sigue apuntable al frontend viejo cambiando solo un registro.
- Si se detecta un bug crítico en la nueva infra, revertir DNS → el sistema vuelve a Supabase como si nada pasara (siempre que no hayamos hecho cambios destructivos de datos).
- Tras 7 días sin incidencias, **desactivar proyecto Supabase** (freeze, no borrar) y tras 30 días más, solicitar borrado definitivo.

---

## 8. Cronograma propuesto (4 sprints × 2 semanas)

| Sprint | Semanas | Entregables |
|--------|---------|-------------|
| **Sprint 1 — Refactor** | 1–2 | Build Vite reemplaza CDN. Capa `api.*` creada y delega a Supabase. `sb.` → `api.` mecánico hecho. App funcionando idéntica sobre Supabase pero desacoplada. |
| **Sprint 2 — Backend nuevo** | 3–4 | API Node con endpoints CRUD + RPC bridge + Auth (propia o SSO). Postgres Avatel con schema migrado (sin datos reales todavía). Tests unitarios de endpoints. |
| **Sprint 3 — Datos + staging** | 5–6 | Migración de datos reales a staging. Frontend apunta a staging. Checklist §7.2 ejecutado con el equipo NOC. Correcciones. |
| **Sprint 4 — Cutover** | 7–8 | Ventana de mantenimiento (fin de semana sábado madrugada): segundo `pg_dump` de Supabase, restore a prod, switch DNS, smoke test, guardia de 48 h. Supabase en modo read-only durante 7 días como colchón. |

### 8.1 Ventana de corte recomendada

**Sábado 02:00–06:00** — el NOC tiene mínima actividad de cambios de turno (los turnos del fin de semana ya están cerrados el viernes). Equipo de 2 personas (desarrollador + responsable NOC) disponibles.

---

## 9. Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:------------:|:-------:|-----------|
| Pérdida de datos durante el `pg_dump/restore` | Baja | Alto | Doble backup: dump en Supabase + snapshot volcado a S3 interno antes del restore |
| Downtime excede la ventana | Media | Medio | Ensayar el cutover completo en staging el sprint anterior; cronometrar |
| Hashes de contraseña incompatibles | Media | Medio | Reset global forzado vía email con link temporal |
| RLS no replicada correctamente → fuga de datos | Media | Alto | Auditoría exhaustiva de políticas antes de abrir el endpoint; tests con usuario operador tratando de leer datos de otro |
| Realtime roto → operadores no ven aprobaciones | Alta | Bajo | Ya hay polling secundario; añadir botón "Refrescar" explícito |
| CDN scripts no empaquetados → app rota offline/sin internet externo | Media | Alto | Build Vite auto-bundlea todo; verificar con `npm run build && npm run preview` sin acceso externo |
| Edge Function `manage-auth-user` con lógica no replicada exactamente | Baja | Medio | Leer el código Deno actual y replicar casos de error uno a uno (HTTP 401, email duplicado, recovery, etc.) |
| Equipo NOC resiste el cambio de flujo de login (si pasa a SSO) | Baja | Bajo | Formación de 30 min + guía rápida; el cambio es para mejor |

---

## 10. Checklist pre-cutover

Revisado por Responsable NOC (ssantos) + Admin Infra Avatel antes de iniciar el corte:

- [ ] Backup completo de Supabase (`pg_dump` + `auth.users` si se migran hashes) guardado en S3 interno con cifrado at-rest
- [ ] Todas las 5 RPCs replicadas en nuevo Postgres y probadas (`SELECT apply_swap_pair(...)` devuelve resultado esperado)
- [ ] Vista `request_history` recreada
- [ ] Políticas RLS auditadas y traducidas a middleware de API, con tests de autorización (operador no puede ver/editar datos de otro)
- [ ] Endpoint `POST /api/admin/users` probado con las 3 acciones (`create`, `update_password`, `delete`)
- [ ] Tests manuales §7.2 ejecutados en staging sin incidencias
- [ ] Equipo NOC notificado por email/Teams del corte y la duración esperada
- [ ] Contraseñas temporales generadas (si se opta por reset global) y comunicadas a cada empleado por canal seguro
- [ ] DNS preparado para apuntar a `turnos.avatel.interno` — TTL bajado a 60 s el día anterior
- [ ] Plan de rollback documentado y probado en staging (reversión de DNS en <5 min)
- [ ] Servidor de logs recibiendo eventos del nuevo backend antes del corte (Graylog/ELK)
- [ ] Certificado SSL válido en el nuevo host
- [ ] Monitorización (uptime, latencia API, errores 5xx) dashboards listos
- [ ] Supabase anon key y service-role key **guardadas en Vault** (no borradas todavía — rollback)
- [ ] README del proyecto actualizado con nueva URL y proceso de contribución

---

## 11. Cosas SIN DEFINIR que dependen de la nueva infraestructura

**Esta sección es la más importante de este documento**: son las preguntas que el jefe / sysadmin de Avatel debe responder antes de poder planificar fechas concretas. Ordenadas por urgencia de respuesta.

### 11.1 Decisiones bloqueantes (sprint 2 no puede arrancar sin estas)

1. **¿Dónde corre el backend API?** VM Linux, contenedor en Kubernetes, serverless (AWS Lambda interno)?
2. **¿Qué Postgres se usa?** Versión (¿PG 14? ¿PG 16?), host, credenciales, si hay réplica, si hay pooling (PgBouncer).
3. **¿Dónde vive el frontend estático?** ¿Un Nginx compartido de Avatel? ¿Un bucket S3 interno con CDN? ¿La misma VM que la API?
4. **¿SSO corporativo disponible?** Azure AD / Entra ID / LDAP / SAML. Si está disponible, deja de tener sentido reimplementar auth propia.
5. **¿Cómo se gestionan los secretos?** HashiCorp Vault, AWS Secrets Manager, variables Kubernetes, fichero `.env` con permisos restrictivos.

### 11.2 Decisiones que afectan al diseño pero no bloquean el arranque

6. **¿Certificados SSL los gestiona la infra centralmente** (Let's Encrypt interno, Certbot, ACM) o los gestiona la aplicación?
7. **¿Hay límites de conexiones al Postgres?** Impacta si hace falta pooling.
8. **¿Existe API gateway corporativa** que todas las apps internas deban atravesar? (Kong, Tyk, nginx-gateway)
9. **¿Política de backups de BD?** Frecuencia, retención, si ya cubre bases de datos nuevas automáticamente.
10. **¿Logs centralizados disponibles?** ELK, Graylog, Datadog, Splunk. Formato esperado (JSON, plain).
11. **¿Entornos disponibles?** ¿Hay dev / staging / prod separados con redes independientes? ¿O solo prod y localhost?
12. **¿Pipelines CI/CD?** GitLab CI, Jenkins, GitHub Actions self-hosted. Cómo se despliega hoy una app en Avatel.
13. **¿Política de contraseñas corporativa?** Complejidad mínima, rotación, historial.
14. **¿Política de retención de datos y GDPR?** ¿Cuánto tiempo se conserva el `audit_log`? ¿Derecho al olvido en `employees`?
15. **¿Monitorización y alerting?** Prometheus, Zabbix, Nagios. Canal de alertas (email, Teams, PagerDuty).

### 11.3 Decisiones de operación (pueden cerrarse más adelante)

16. **¿Quién asume el mantenimiento post-cutover?** Desarrollo interno NOC o un equipo de plataforma común.
17. **¿Horario y canal de soporte** para usuarios del NOC cuando algo falla?
18. **¿Onboarding de nuevos empleados?** Si se integra SSO, el alta debe dispararse desde el proceso RRHH corporativo.

---

## Anexo A — Mapa de ficheros de salida (una vez hecha la migración)

```
noc-turnos-avatel/
├── app/                              ← proyecto Vite
│   ├── src/
│   │   ├── main.jsx                  ← entry
│   │   ├── App.jsx                   ← extraído de index.html
│   │   ├── api.js                    ← capa de abstracción (hoy delega a Supabase, mañana al backend propio)
│   │   ├── components/               ← calendario, login, etc. (sprint 1+)
│   │   └── styles.css
│   ├── index.html                    ← <div id="root"></div> únicamente
│   ├── package.json                  ← react, xlsx, (supabase-js solo hasta sprint 3)
│   └── vite.config.js
├── backend/                          ← API Node nueva
│   ├── src/
│   │   ├── index.js                  ← Express bootstrap
│   │   ├── auth/                     ← login, refresh, logout, SSO
│   │   ├── routes/
│   │   │   ├── db.js                 ← bridge genérico (o endpoints específicos)
│   │   │   ├── rpc.js                ← 5 RPCs
│   │   │   └── admin-users.js        ← reemplazo manage-auth-user
│   │   ├── middleware/authz.js       ← RLS → lógica aquí
│   │   └── db.js                     ← pool pg
│   ├── package.json
│   └── Dockerfile
├── db/                               ← migraciones SQL
│   ├── schema.sql
│   ├── rpcs.sql                      ← las 5 funciones
│   └── seed.sql
└── docs/
    ├── MANUAL_MIGRACION.md           ← este documento
    ├── MANUAL_OPERADOR.md
    └── API_REFERENCE.md              ← (futuro) contrato de la API
```

---

## Anexo B — Glosario

- **RLS** — Row-Level Security de Postgres. Políticas por fila que Supabase usa para controlar qué puede leer/escribir cada usuario sin necesidad de backend.
- **Anon key / Service-role key** — JWT firmadas por Supabase. La primera es pública y asume rol `anon`/`authenticated`; la segunda es secreta y salta RLS.
- **Edge Function** — función Deno desplegada en la infra de Supabase (actualmente solo `manage-auth-user`).
- **RPC** — función SQL expuesta vía HTTP por PostgREST, invocable desde el cliente con `sb.rpc(nombre, args)`.
- **Cutover** — corte real en el que la aplicación pasa del backend viejo al nuevo.
- **SSO** — Single Sign-On corporativo (Azure AD / LDAP / SAML).
- **Swap group** — conjunto de `shift_requests` ligadas por `swap_group_id` para cambios de turno multi-día que deben aprobarse o rechazarse atómicamente.

---

**Fin del documento.** Para dudas o iteraciones, contactar con ssantos@avatel.es.
