# Adaptador API corporativa (futuro)

Cuando la infraestructura propia de Avatel esté lista, implementar aquí
los mismos servicios que en `../supabase/` pero llamando a la REST API interna.

## Ficheros a crear

- `auth.ts`      — login/logout/session via API propia
- `shifts.ts`    — CRUD turnos
- `requests.ts`  — solicitudes
- `employees.ts` — empleados + avatar upload
- `vacation.ts`  — saldos vacaciones
- `coverage.ts`  — reglas cobertura
- `n2.ts`        — guardias N2

## Activar

En `src/services/index.ts`, cambiar las importaciones de `./supabase/*` a `./api/*`.
El resto de la app no necesita ningún cambio.
