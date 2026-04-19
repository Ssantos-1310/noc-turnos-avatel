# Preguntas para definir la nueva infraestructura

**Contexto para quien las responda:** Actualmente la aplicación **NOC Turnos** corre sobre Supabase (BD PostgreSQL + Auth + Edge Functions) y se sirve desde GitHub Pages. Queremos migrarla a infraestructura propia de Avatel. Necesito información técnica concreta para diseñar el plan de migración.

Las preguntas están agrupadas por bloque. No hace falta responderlas todas hoy; marca las que puedas y las pendientes las vemos juntos.

---

## 🗄️ 1. Base de datos

1. **¿Qué motor de base de datos usaremos?** PostgreSQL sería ideal (lo usamos hoy y minimiza reescritura). Si es otro (MySQL, SQL Server, NoSQL), el alcance del trabajo aumenta mucho.
2. **¿Versión del motor?** Hoy usamos PostgreSQL 17. La aplicación usa funciones SQL (PL/pgSQL) y vistas que requieren versión moderna.
3. **¿Dónde corre?** ¿VM dedicada, contenedor, servicio gestionado, on-premise en CPD Avatel?
4. **¿Hay backups automáticos?** Frecuencia, política de retención, proceso de restore.
5. **¿Cómo se gestionan las credenciales y secretos?** ¿Vault, variables de entorno, fichero cifrado?
6. **¿Límite de conexiones concurrentes** desde la aplicación?
7. **¿Tienes pool de conexiones** ya montado (PgBouncer o similar) o lo gestionamos a nivel aplicación?

---

## 🔐 2. Autenticación

8. **¿Existe SSO corporativo** disponible? (Azure AD / Entra ID, LDAP, SAML, OAuth). Si existe, **es con mucho la mejor opción**: elimina la gestión de contraseñas y usa las credenciales corporativas que los empleados ya conocen.
9. Si no hay SSO: **¿qué proveedor de identidad usamos?** Opciones:
    - Keycloak on-premise (open source, maduro)
    - Auth propio con JWT + bcrypt (implementación custom, más mantenimiento)
    - Otro gestor que tengas recomendado
10. **¿Podemos forzar un reset de contraseña global** a todos los usuarios el día de la migración? Es lo más limpio para no arrastrar hashes del proveedor anterior.
11. **¿Política de contraseñas** corporativa (longitud mínima, caducidad, complejidad)?
12. **¿MFA / 2FA obligatorio** para algún rol? (p.ej. admins NOC)

---

## 🌐 3. Hosting y red

13. **¿Dónde se aloja el frontend web?** Opciones típicas:
    - nginx interno con VirtualHost
    - CDN corporativa
    - Docker en Kubernetes
    - Servidor de aplicaciones (Apache, Tomcat)
14. **¿URL final esperada?** p.ej. `turnos.noc.avatel.es`
15. **¿Certificados SSL/TLS gestionados** por ti o por equipo de infra?
16. **¿El servicio solo será accesible desde red interna** (VPN, intranet) o también internet?
17. **¿Hay una API gateway / reverse proxy corporativo** que debamos atravesar?
18. **¿Qué puertos / protocolos están permitidos** entre frontend → backend → BD?

---

## ⚙️ 4. Backend (API)

19. **¿Lenguaje/framework preferido** para el backend API?
    - Node.js + Express/Fastify (más similar a lo actual, curva baja)
    - Python + FastAPI / Django
    - Java + Spring
    - Otro estándar corporativo
20. **¿Dónde correrá el backend?** VM, Docker/Kubernetes, Azure App Service, serverless (Lambda/Azure Functions)...
21. **¿Política de logs?** ¿Hay stack centralizado (ELK, Graylog, Datadog, Splunk)?
22. **¿Métricas y monitorización?** (Prometheus/Grafana, New Relic, APM corporativo...)
23. **¿Qué recursos estimas para el backend?** CPU/RAM/almacenamiento (la app es pequeña: ~25 empleados).

---

## 🔄 5. Integración y despliegue

24. **¿Hay pipelines CI/CD corporativas** que debamos usar? (Jenkins, GitHub Actions, Azure DevOps, GitLab CI...)
25. **¿Qué entornos existirán?** ¿Dev + Staging + Prod, o solo Prod?
26. **¿Cómo se hace el deploy** habitualmente? ¿Manual, automatizado por merge, approval humano?
27. **¿Gestor de secretos / config para distintos entornos?** (HashiCorp Vault, AWS Secrets Manager, Azure KeyVault, archivos .env cifrados...)
28. **¿Repositorio Git corporativo** disponible (GitLab, Azure Repos, Bitbucket)? Hoy está en GitHub personal.

---

## 📧 6. Servicios adicionales

29. **¿Hay servicio SMTP** corporativo para envío de emails? (Útil para notificaciones, recuperación contraseña si usamos auth propio).
30. **¿Almacenamiento de archivos** (fotos de perfil de empleados)? Opciones:
    - Filesystem del servidor
    - Object storage corporativo (MinIO, Ceph, S3 compatible)
    - Intranet compartida
31. **¿Integración con sistemas existentes?** ¿Conviene conectar con:
    - Directorio corporativo (LDAP/AD) para sincronizar altas/bajas
    - Sistema RRHH / nómina (para el Resumen RRHH mensual)
    - Outlook / calendar corporativo (para exportar turnos)

---

## 📜 7. Requisitos no técnicos

32. **¿Tenemos SLA comprometidos** (uptime, tiempo de respuesta, ventana de mantenimiento)?
33. **¿Requisitos de auditoría / compliance** específicos? (RGPD ya se aplica; ¿LOPD adicional, ISO 27001, retención de logs X años?)
34. **¿Hay proceso de aprobación** para subir el servicio a prod? ¿Comité, revisión de seguridad, pentest?
35. **¿Ventana de corte aceptable** para el cambio? (Preferible fin de semana, nocturno, sin turno activo.)
36. **¿Documentación / handoff que te vendría bien** de mi parte además de la guía de migración que estoy preparando?

---

## 🧭 8. Decisiones rápidas (si puedes responder hoy)

Tres preguntas que desbloquearán el 80% del plan:

- [ ] **Postgres propio, ¿sí o no?** (Sí = el 70% del trabajo de BD desaparece).
- [ ] **SSO corporativo disponible, ¿sí o no?** (Sí = eliminamos toda la gestión de contraseñas).
- [ ] **Lenguaje del backend API, ¿cuál?** (Determina qué stack reutilizo).

---

## Mi propuesta preliminar (por si ayuda a orientar)

Como referencia, la opción que minimiza riesgo y esfuerzo de mi parte sería:

- **BD:** PostgreSQL 15+ en VM dedicada con backups diarios
- **Backend:** Node.js + Fastify + JWT (si no hay SSO) ó Passport-SAML (si sí)
- **Frontend:** build Vite, servido por nginx en misma VM o VM separada
- **Despliegue:** pipeline con commits a `main` → deploy a staging, tag `vX.Y.Z` → deploy a prod
- **Monitorización:** logs a stack corporativo + healthcheck endpoint

No hace falta que te comprometas con esta propuesta — solo es para que tengas una referencia si alguna pregunta no te dice nada.

---

## Adjuntos que te paso junto con esto

- `MANUAL_TECNICO.md` — documentación técnica completa de la app actual (esquema BD, RPCs, flujos)
- `MANUAL_MIGRACION.md` — plan de migración detallado con estrategia de capa de abstracción

Con lo que me respondas afino el plan y te mando propuesta concreta de esfuerzo/calendario.

Gracias,

*Sergio Santos — NOC*
