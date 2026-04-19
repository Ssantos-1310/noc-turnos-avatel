# Reporte Ejecutivo — NOC Turnos Avatel

**Versión del documento:** 1.0
**Fecha:** 19 de abril de 2026
**Autor:** Sergio Santos — Responsable NOC
**Destinatario:** Dirección de Avatel Telecom
**Versión de la aplicación descrita:** v3.7 (abril 2026)
**Estado:** Producción estable

---

## 1. Resumen ejecutivo

**NOC Turnos Avatel** es la aplicación web interna que el Centro de Operaciones de Red (NOC) de Avatel Telecom utiliza para planificar, controlar y retribuir el trabajo por turnos de su plantilla operativa. Fue desarrollada internamente para sustituir el proceso manual basado en hojas de cálculo Excel compartidas, un modelo que venía generando errores de planificación, conflictos de cobertura, disputas sobre nómina variable y una carga de trabajo administrativa desproporcionada para el responsable del servicio.

La aplicación, operativa desde hace varios meses y actualmente en su versión **v3.7**, es utilizada a diario por los aproximadamente **25 operadores** del NOC, así como por el responsable del área. Cubre de extremo a extremo el ciclo mensual de trabajo del NOC: publicación del cuadrante, solicitudes de cambio, vacaciones y asuntos propios, gestión de guardias N2, cálculo automático de retribución variable y generación del informe mensual para RRHH.

En términos operativos, la herramienta ha conseguido:

- Eliminar el cuadrante compartido en Excel como única fuente de verdad.
- Centralizar el histórico de turnos, solicitudes y cambios en una base de datos auditable.
- Automatizar el cálculo de conceptos variables (guardias, festivos, plus de noche) que antes se revisaban a mano.
- Dar a cada operador visibilidad inmediata y autónoma sobre su planificación, vacaciones y asuntos propios.

El siguiente paso natural es la **migración a infraestructura propia de Avatel**. La aplicación corre hoy sobre servicios en la nube (Supabase + GitHub Pages) que en su fase inicial han permitido validar el producto con coste cero, pero que ya no encajan con la política interna de soberanía del dato y control de infraestructura. El plan de migración está redactado y pendiente únicamente de definir la infraestructura destino con los equipos de IT e Infraestructura.

**Recomendación:** consolidar la aplicación como herramienta oficial del NOC, aprobar la migración a infraestructura corporativa y dotar al proyecto de una bolsa de mantenimiento estable que permita el roadmap descrito en este documento.

---

## 2. Valor para el negocio

La justificación de la inversión en NOC Turnos no se apoya en un ahorro único ni en una métrica aislada, sino en una mejora estructural del proceso de gestión del servicio 24×7. A continuación se resumen los ejes de valor más relevantes.

### 2.1. Ahorro de tiempo del responsable NOC

Antes de la aplicación, la coordinación del cuadrante mensual implicaba:

- Actualizar un Excel compartido, con los problemas habituales de bloqueo, versiones en paralelo y celdas sobrescritas.
- Responder por correo, Teams o de viva voz a cada solicitud de cambio de turno.
- Recalcular manualmente coberturas cuando se aprobaba un cambio (comprobando que cada día quedase cubierto en mañana, tarde y noche).
- Preparar a fin de mes un resumen para RRHH sumando a mano guardias, festivos trabajados y pluses.

Con la aplicación, todo esto se ha convertido en:

- Aprobaciones de un clic desde el panel de administración, con validación automática de cobertura mínima.
- Cálculo automático de la nómina variable al cierre de mes, exportable directamente.
- Trazabilidad completa: queda registrado quién pidió qué, cuándo, quién lo aprobó y por qué motivo.

El ahorro estimado del responsable NOC se sitúa en el orden de **15–25 horas al mes**, tiempo que antes se dedicaba a tareas estrictamente administrativas y que hoy se reinvierte en supervisión técnica del servicio.

### 2.2. Trazabilidad y auditoría

Cada operación relevante (aprobación de un cambio, alta/baja de operador, modificación de un turno, cierre de un mes de nómina) queda registrada con autor, fecha y estado previo/posterior. Esto aporta tres ventajas:

- **Evita disputas** sobre quién pidió qué día libre, a quién se le aprobó un cambio y con qué compensación.
- **Soporta auditorías internas y externas** (control interno, inspección laboral, auditoría de RGPD).
- **Permite reconstruir el histórico** ante cualquier consulta retrospectiva (ya ha ocurrido con meses anteriores a la app: con la herramienta, ese escenario está resuelto para siempre).

### 2.3. Cumplimiento normativo

La aplicación incorpora controles automáticos alineados con el convenio colectivo aplicable y con los requisitos de RGPD:

- Límite de turnos consecutivos por operador.
- Calendario de festivos nacionales y autonómicos aplicado de forma consistente a toda la plantilla.
- Retribución variable calculada con importes fijados por la empresa, evitando inconsistencias entre empleados.
- Datos personales mínimos (email corporativo, nombre, rol) almacenados bajo control de acceso por roles.
- Contraseñas cifradas y política de bloqueo por intentos fallidos.

### 2.4. Nómina sin errores

Uno de los problemas recurrentes del modelo anterior era la diferencia entre la nómina variable teórica y la efectivamente abonada: olvidos, dobles cómputos, o festivos no identificados. La aplicación genera automáticamente un **informe RRHH mensual** con los conceptos variables listos para cargar en la nómina, lo que:

- Reduce prácticamente a cero las incidencias de nómina derivadas del NOC.
- Libera al responsable de NOC y a RRHH de la conciliación manual.
- Genera confianza en la plantilla, que ve sus conceptos variables desglosados y consultables.

### 2.5. Experiencia del operador

Los operadores dejan de depender del Excel central y del correo para gestionar su día a día:

- Ven su turno en tiempo real en cualquier dispositivo (PC, móvil).
- Piden vacaciones, asuntos propios o cambios de turno desde la propia aplicación, sin fricción.
- Reciben notificaciones cuando sus solicitudes son aprobadas o rechazadas.
- Consultan su saldo de vacaciones y asuntos propios con total transparencia.

Esta autonomía reduce la carga mental y el ruido administrativo de un colectivo que ya opera bajo la presión de un servicio crítico 24×7.

---

## 3. Funcionalidades principales

A continuación se describe el alcance funcional sin entrar en detalles técnicos.

### 3.1. Dos paneles diferenciados por rol

- **Panel del operador:** vista personalizada con sus turnos del mes, próximos 7 días, saldo de vacaciones, historial de solicitudes y notificaciones.
- **Panel de administración (responsable NOC y RRHH):** calendario global, gestión de solicitudes pendientes, edición del cuadrante, informe RRHH, administración de operadores y guardias N2.

### 3.2. Solicitudes con aprobación atómica

Los operadores pueden solicitar:

- **Cambio de turno** con otro compañero.
- **Vacaciones** (contra saldo anual).
- **Asuntos propios** (contra saldo anual).

Cada aprobación es **atómica**: el sistema valida en el momento que la cobertura mínima del servicio no se rompe. Si la aprobación pusiera en riesgo la cobertura, queda bloqueada, evitando situaciones que antes solo se detectaban cuando ya era tarde.

### 3.3. Calendario visual con cobertura

Vista mensual del cuadrante de todo el equipo, con código de colores por tipo de turno y alerta visual cuando un día no alcanza la cobertura mínima en algún tramo horario.

### 3.4. Informe RRHH mensual autogenerado

Con un clic se genera el resumen mensual por operador con el desglose económico: guardias N2, días festivos trabajados, pluses de noche, asuntos propios consumidos, vacaciones disfrutadas. Exportable en formato tabular para su incorporación a la nómina.

### 3.5. Gestión de guardias N2

El módulo de guardias N2 rota automáticamente la responsabilidad entre los tres responsables de segundo nivel del servicio, aplicando los importes correspondientes según sea guardia base, guardia con festivo o día festivo efectivamente trabajado.

### 3.6. Notificaciones en tiempo real

Cuando un responsable aprueba o rechaza una solicitud, el operador recibe la notificación de forma inmediata en la aplicación, sin necesidad de refrescar manualmente.

---

## 4. Métricas y capacidades

| Indicador | Valor actual |
|---|---|
| Operadores activos gestionados | ~25 |
| Turnos planificados al mes | >500 |
| Festivos anuales contemplados | 14 (nacionales + autonómicos) |
| Días de vacaciones por empleado y año | 22 |
| Días de asuntos propios por empleado y año | Según convenio |
| Responsables rotando en guardia N2 | 3 |
| Roles del sistema | Operador, Responsable NOC, RRHH |
| Tipos de turno | M (Mañana), T (Tarde), N (Noche), D (Cobertura especial), P (Asuntos propios), V (Vacaciones) |

**Importes retributivos automatizados (ejemplos representativos):**

| Concepto | Importe |
|---|---|
| Guardia N2 base (semana) | 250 € |
| Guardia N2 con festivo incluido | 290 € |
| Día festivo efectivamente trabajado | 40 € / día |
| Plus de noche | Según convenio |

*Los importes se configuran en la aplicación y pueden ajustarse si cambia la política retributiva, sin necesidad de intervención del desarrollo.*

**Cumplimiento operativo observado:**

- Tiempo medio de resolución de una solicitud: inmediato tras revisión (frente a días en el modelo Excel).
- Incidencias de nómina variable imputables al NOC desde el despliegue: prácticamente cero.
- Cobertura mínima incumplida sin detectar: cero (se bloquea al aprobar).

---

## 5. Arquitectura a alto nivel

Explicación no técnica de cómo está montada la herramienta:

- **Frontend (la pantalla que ven los usuarios):** aplicación web responsive, accesible desde cualquier navegador moderno en PC o móvil. No requiere instalación.
- **Backend (la lógica y los datos):** base de datos relacional PostgreSQL, un estándar de mercado usado por banca, administración y grandes empresas. Acompañada de servicios en la nube que gestionan la autenticación y las comunicaciones en tiempo real.
- **Autenticación:** acceso exclusivamente con email corporativo **@avatel.es**. Contraseñas cifradas, bloqueo automático tras varios intentos fallidos.
- **Seguridad y control de acceso:** cada usuario ve solo lo que le corresponde a su rol. Los operadores nunca acceden al panel de administración, ni ven datos personales de sus compañeros más allá del turno público.
- **Auditoría:** cada acción sensible queda registrada con autor, fecha y detalle.

En la jerga técnica, este modelo se conoce como **arquitectura web cliente-servidor con base de datos gestionada**. Es el patrón de referencia para aplicaciones internas corporativas.

---

## 6. Roadmap

### 6.1. Corto plazo (próximos 1–3 meses)

- **Migración a infraestructura propia de Avatel.** Traslado del frontend y la base de datos desde los servicios actuales (GitHub Pages + Supabase) a servidores e infraestructura gestionados por el equipo de IT de Avatel. Reduce dependencias externas, alinea la herramienta con la política corporativa de datos y abre la puerta al resto del roadmap.
- **Integración con SSO corporativo**, si está disponible, para eliminar la gestión de contraseñas propia y unificar el acceso con el resto de aplicaciones internas.

### 6.2. Medio plazo (3–9 meses)

- **Notificaciones push y/o por correo**, para que los operadores sean avisados de la aprobación de sus solicitudes sin necesidad de tener la aplicación abierta.
- **Aplicación móvil ligera** (o vista web optimizada) que mejore la experiencia del operador fuera del puesto.
- **Integración con Outlook / Calendar corporativo**: volcado automático del turno de cada operador en su calendario personal, para recordatorios y coordinación con el resto de equipos.

### 6.3. Largo plazo (9–18 meses)

- **Previsión automática de cobertura:** el sistema sugiere cuadrantes optimizados para el mes siguiente a partir del histórico y de las preferencias de la plantilla.
- **Integración con sistemas corporativos de RRHH** para enviar directamente los conceptos variables a la plataforma oficial de nómina, eliminando la exportación manual.
- **Dashboard de dirección** con KPIs del servicio (horas de cobertura, absentismo, rotación de guardias, pluses pagados) con vista ejecutiva agregada.

---

## 7. Inversión y costes

| Partida | Estimación | Observaciones |
|---|---|---|
| **Desarrollo inicial** | 150–250 horas | Diseño, implementación, pruebas y despliegue de las versiones v1.0 a v3.7, incluyendo refactors mayores y corrección de bugs críticos. |
| **Mantenimiento estable estimado** | 20–30 horas/mes | Evolutivos menores, resolución de incidencias, atención a solicitudes de cambio funcional de la plantilla. |
| **Infraestructura actual** | 0 € / mes | Plan gratuito de Supabase y GitHub Pages. Viable mientras la herramienta está en validación, no apropiado como estado definitivo. |
| **Infraestructura post-migración** | Coste marginal | Una vez integrada en infraestructura Avatel, reutiliza recursos (VM, BD, red) ya presupuestados a nivel corporativo. |
| **Coste de migración puntual** | A presupuestar | Horas de traslado + soporte del equipo de IT. Estimación a definir cuando se respondan las preguntas de infraestructura pendientes (documento `PREGUNTAS_INFRA.md`). |

**Retorno esperado:** considerando solo el ahorro del responsable NOC (15–25 horas/mes, cifra conservadora), más la eliminación de incidencias de nómina, más la carga evitada en RRHH, el retorno ya ha superado la inversión inicial de desarrollo. Cualquier evolución razonable del mantenimiento se amortiza ampliamente con la utilidad operativa.

---

## 8. Riesgos y mitigación

| Riesgo | Nivel | Mitigación prevista |
|---|---|---|
| **Dependencia de un único desarrollador interno.** El conocimiento del producto reside hoy, de forma principal, en una sola persona. | Alto | Se está redactando documentación técnica completa (`MANUAL_TECNICO.md`, `MANUAL_MIGRACION.md`) orientada a traspaso. Tras la migración, el código se alojará en repositorio corporativo y cualquier desarrollador con stack web estándar podrá continuar el mantenimiento. |
| **Infraestructura externa (Supabase, GitHub).** Los datos viven hoy en proveedores cloud fuera del perímetro corporativo. | Medio | Migración a infraestructura propia Avatel ya planificada (ver sección 6.1). El plan de migración está redactado y solo depende de definir la infraestructura destino con IT. |
| **Ausencia de tests automatizados.** Hoy la validación es manual, lo que ralentiza la introducción de cambios mayores con garantías. | Medio | Incluir una fase de cobertura de tests (unitarios y de integración) en el roadmap post-migración. |
| **Código concentrado en un único fichero monolítico.** Es un lastre técnico: dificulta la colaboración de más de una persona en paralelo. | Medio | Plan de modularización ya iniciado (scaffold Vite en carpeta `app/`). Se consolidará en paralelo a la migración de infraestructura. |
| **Riesgo regulatorio (RGPD).** Datos personales en proveedor externo. | Bajo–Medio | Los datos personales tratados son mínimos (email, nombre, rol). La migración elimina el riesgo y alinea el tratamiento con el resto de sistemas corporativos. |
| **Interrupción del servicio en la migración.** | Bajo | Migración planificada en ventana de fin de semana, con plan de rollback y backup previo. |

---

## 9. Conclusión y recomendaciones

NOC Turnos Avatel ha dejado de ser un experimento interno para convertirse en una **herramienta operativa crítica del servicio NOC**. La plantilla la usa a diario, el responsable la utiliza para gestionar el cuadrante y la retribución variable, y RRHH confía en su informe mensual. Retirarla supondría volver a un modelo menos eficiente, más propenso a errores y sin trazabilidad, lo que no es deseable.

En ese contexto, las recomendaciones a dirección son:

1. **Consolidar formalmente la aplicación como herramienta oficial del NOC**, con patrocinio a nivel dirección y presupuesto asignado para su mantenimiento estable.
2. **Autorizar y priorizar la migración a infraestructura propia Avatel**, coordinando con los equipos de IT e Infraestructura la definición de la plataforma destino. El coste puntual de la migración se compensa con la eliminación de dependencias externas y el alineamiento con la política corporativa de datos.
3. **Dotar al proyecto de una bolsa de mantenimiento estable** (estimación 20–30 horas/mes) para cubrir evolutivos, resolución de incidencias y ejecución del roadmap de medio plazo.
4. **Iniciar el proceso de traspaso de conocimiento** con documentación técnica completa y, a medio plazo, incorporar a una segunda persona al mantenimiento para eliminar la dependencia de un único desarrollador.
5. **Aprovechar la migración para abrir dos integraciones de alto valor**: SSO corporativo (simplifica accesos) y Outlook/Calendar (simplifica la vida al operador).

La aplicación funciona, aporta valor medible, tiene plantilla satisfecha y un roadmap realista. El momento oportuno para consolidarla dentro de la infraestructura y los procesos corporativos de Avatel es **ahora**, mientras el producto es todavía manejable, está bien documentado y su autor está disponible para liderar el traspaso.

---

*Documento elaborado por el área NOC para Dirección. Para cualquier consulta técnica adicional, los documentos `MANUAL_TECNICO.md`, `MANUAL_MIGRACION.md`, `MANUAL_OPERADOR.md` y `PREGUNTAS_INFRA.md` amplían respectivamente el detalle de arquitectura, el plan de migración, el uso por parte de los operadores y los requisitos pendientes con el equipo de Infraestructura.*
