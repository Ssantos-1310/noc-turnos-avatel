# Manual del Administrador — NOC Turnos Avatel

Aplicación interna de planificación y gestión de turnos del NOC de Avatel Telecom. Este manual está dirigido al **responsable del NOC** (rol `admin`, `manager` o `coordinator`), con perfil funcional y no técnico, y cubre todas las funciones exclusivas del administrador así como los escenarios operativos más habituales.

---

## Índice

1. [Introducción y acceso](#1-introducción-y-acceso)
2. [Vista del día (TodayView)](#2-vista-del-día-todayview)
3. [Calendario (CalendarView)](#3-calendario-calendarview)
4. [Equipo (TeamView)](#4-equipo-teamview)
5. [Solicitudes (RequestsView)](#5-solicitudes-requestsview)
6. [Administración (AdminView)](#6-administración-adminview)
   - 6.1 Solicitudes pendientes
   - 6.2 Historial de solicitudes
   - 6.3 Gestión de operadores
   - 6.4 Reglas de cobertura
7. [Calendario N2 (CalN2View)](#7-calendario-n2-caln2view)
8. [Resumen RRHH (ResumenRRHH)](#8-resumen-rrhh-resumenrrhh)
9. [Mi Perfil](#9-mi-perfil)
10. [Escenarios frecuentes](#10-escenarios-frecuentes)
11. [Buenas prácticas](#11-buenas-prácticas)

---

## 1. Introducción y acceso

### Qué es la aplicación

**NOC Turnos Avatel** es la herramienta de planificación, supervisión y gestión administrativa de los turnos del equipo NOC. Centraliza:

- El cuadrante anual con la asignación de turnos (Mañana, Tarde, Noche, Descanso).
- Las solicitudes del personal (cambios de turno, vacaciones, asuntos propios).
- La cobertura diaria en tiempo real.
- La guardia N2 semanal.
- El resumen mensual de incidencias para RRHH.

### Roles

La aplicación distingue dos niveles de acceso:

- **Operador**: ve su propio turno, consulta el cuadrante, envía solicitudes.
- **Administrador** (`admin`, `manager` o `coordinator`): accede a todo lo anterior más las secciones de aprobación, gestión de personal, reglas de cobertura, N2 y RRHH.

Los tres roles administrativos tienen privilegios equivalentes dentro de la aplicación; la distinción es organizativa.

### Acceso

Se accede mediante el usuario y contraseña asignados por el administrador. Si has cambiado de rol recientemente y no ves las pestañas de Administración, Calendario N2 o Resumen RRHH, cierra sesión y vuelve a entrar para refrescar los permisos.

---

## 2. Vista del día (TodayView)

### Qué hace

Es el panel de inicio. Ofrece una fotografía en vivo del día actual: quién está cubriendo cada turno, quién está de descanso, alertas si algún turno está por debajo del mínimo de cobertura y las solicitudes pendientes que están a la espera de resolución.

### Cuándo usarla

- Al principio de cada jornada, para confirmar que la plantilla del día es la prevista.
- Como punto de comprobación rápida antes de aprobar una solicitud (permite saber si quitar a alguien de un turno dejará el turno descubierto).
- Cuando se notifica una baja imprevista, para ver al instante el impacto en la cobertura.

### Qué verás

- **Tarjetas de turno (M/T/N)** con los operadores asignados a ese turno hoy.
- **Indicador de cobertura**: verde si se cumple el mínimo, ámbar si está al límite, rojo si hay infra-cobertura.
- **Panel de solicitudes pendientes en vivo**: contador de peticiones que aún no se han resuelto, con acceso directo a la vista de Administración.
- **Operadores en descanso (D)** y, si procede, quienes están de vacaciones o asunto propio.

### Casos especiales

- Un día festivo se marca claramente y las reglas de cobertura aplicadas corresponden a la columna "fin de semana / festivo".
- Si un operador tiene una solicitud aprobada que cambia su turno de hoy, el cambio se refleja ya en esta vista (no en el turno original).

---

## 3. Calendario (CalendarView)

### Qué hace

Muestra el cuadrante completo (mes por mes y anual) con el turno asignado a cada operador día a día. Como administrador, dispone de un **modo edición** que permite modificar cualquier celda directamente, sin necesidad de solicitud previa.

### Cuándo usarla

- Para planificar el cuadrante a medio y largo plazo.
- Para aplicar cambios puntuales (por ejemplo, una baja o una reestructuración que no proviene de una solicitud formal).
- Para revisar el histórico del equipo.

### Pasos típicos

1. Entra en **Calendario** y sitúate en el mes que te interese.
2. Activa el **modo edición**.
3. Haz clic sobre la celda del operador y día que quieres cambiar.
4. Elige el nuevo turno en el desplegable: **M** (mañana), **T** (tarde), **N** (noche) o **D** (descanso).
5. Si seleccionas **D**, se desplegará un submenú con el rango horario concreto (por ejemplo, descanso del fin de semana, compensación, etc.). Elige la variante correcta.
6. Guarda.

### Casos especiales

- **Turno D con variantes horarias**: el submenú del turno D es importante porque algunas variantes cuentan como horas a compensar (aparecen luego en el Resumen RRHH) y otras son descanso estándar. Si dudas, consulta la política del NOC antes de asignar.
- **Cambios que rompen cobertura**: si al cambiar una celda el turno correspondiente queda por debajo del mínimo, el sistema permitirá el cambio pero lo destacará. Revisa la Vista del día después.
- **Conflicto con solicitudes**: si el operador tiene una solicitud pendiente sobre el mismo día, resuélvela antes de editar manualmente para evitar inconsistencias.

---

## 4. Equipo (TeamView)

### Qué hace

Es el panel de estadísticas por operador. Para cada miembro del equipo muestra, agregado sobre el período seleccionado:

- **Horas extra** acumuladas.
- **Plus NOC** (noches trabajadas).
- **Guardias N2** asumidas.
- Días festivos trabajados, días de vacaciones consumidos y asuntos propios utilizados.

### Cuándo usarla

- Al cierre de mes, para contrastar con el Resumen RRHH.
- Para repartir equitativamente la carga: ver quién acumula muchas noches o muchas guardias y quién va descargado.
- En evaluaciones individuales o revisiones trimestrales.
- Antes de aprobar una solicitud, para valorar si el operador ya arrastra mucha carga especial.

### Qué verás

- Tabla con una fila por operador y columnas por concepto.
- Filtros por período (mes actual, mes anterior, año en curso, rango personalizado).
- Totales por columna, útiles para comparar con los cierres de RRHH.

---

## 5. Solicitudes (RequestsView)

### Qué hace

Vista informativa y global de **todas las solicitudes** del equipo: pendientes, aprobadas y rechazadas, de cualquier tipo (cambio de turno, vacaciones, asuntos propios).

### Cuándo usarla

- Para una consulta rápida sin entrar a la gestión (aprobar/rechazar).
- Para filtrar por operador, tipo o estado y entender qué peticiones ha hecho alguien a lo largo del año.
- Como soporte en conversaciones con el equipo ("¿cuántas vacaciones has pedido ya este año?").

### Diferencia con la pestaña Administración

- **Solicitudes** es **solo lectura** y global.
- **Administración → Solicitudes pendientes** es el lugar desde donde **se aprueban o rechazan**.

---

## 6. Administración (AdminView)

Es la sección nuclear del rol administrativo. Se divide en cuatro bloques.

### 6.1 Solicitudes pendientes

#### Qué hace

Lista todas las peticiones del equipo que aún no se han resuelto, agrupadas por tipo: **cambios de turno**, **vacaciones** y **asuntos propios**. Desde aquí se aprueban o rechazan.

#### Pasos típicos

1. Entra en **Administración → Solicitudes pendientes**.
2. Revisa cada petición: tipo, operador, fechas afectadas, motivo y turnos implicados.
3. Contrasta con la Vista del día o el Calendario si el cambio puede afectar a la cobertura.
4. Pulsa **Aprobar** o **Rechazar**.

#### Cambios de turno multi-día

Cuando un operador solicita intercambiar varios días con un compañero (por ejemplo, "te cambio mi noche del martes por tu tarde del jueves"), la petición aparece **agrupada** como una única solicitud multi-día.

- Pulsa **Ver días** para expandir la solicitud. Verás los pares de días afectados.
- Cada tramo se etiqueta con **badges de color** por turno: **M** (mañana), **T** (tarde), **N** (noche) y **D** (descanso), de forma que se interprete de un vistazo.
- La aprobación es **atómica**: o se aplican todos los días del grupo o no se aplica ninguno. Esto evita inconsistencias (no puede quedar "medio cambio" aplicado).

#### Casos especiales

- **Cambio de turno que deja infra-cobertura**: revísalo con cuidado. El sistema te deja aprobar, pero la responsabilidad organizativa es del administrador.
- **Vacaciones en período sensible**: contrasta con el calendario del equipo; si ya hay otros operadores fuera en esas fechas, valora antes de aprobar.
- **Asunto propio con poca antelación**: la aprobación es discrecional; el sistema no bloquea por plazo.

### 6.2 Historial de solicitudes

#### Qué hace

Lista todas las solicitudes **resueltas** (aprobadas o rechazadas), con filtros por tipo, operador, estado y rango de fechas. Permite **cancelar una aprobación** previa, revirtiendo los turnos que se hubieran aplicado.

#### Pasos típicos

1. Entra en **Administración → Historial**.
2. Filtra por el criterio deseado.
3. Busca la solicitud que te interese.
4. Si necesitas deshacerla, pulsa **Cancelar aprobación**. El sistema revierte los turnos al estado anterior a la aprobación.

#### Multi-día en el historial

Las solicitudes multi-día aprobadas aparecen como **una sola entrada** (no una por cada día). Al cancelarlas, se revierten todos los días de golpe, manteniendo la atomicidad.

#### Casos especiales

- **Cancelar una aprobación vieja**: técnicamente el sistema lo permite, pero si han transcurrido muchos días y los turnos ya se han ejecutado, revertir en el calendario puede tener poco sentido operativo (aunque sí contable). Valóralo caso a caso.
- **Cancelar una aprobación que ya ha tenido cambios posteriores encima**: si otro admin ha editado manualmente alguno de los días afectados, la reversión puede pisar cambios legítimos. Revisa el calendario del operador antes y después.

### 6.3 Gestión de operadores

#### Qué hace

Tabla con todo el personal del NOC. Desde aquí puedes dar de alta, editar, eliminar o asignar contraseña a cualquier operador.

#### Alta de un nuevo operador

1. Pulsa **+ Alta usuario**.
2. Introduce nombre completo, email corporativo y rol (operador o administrador).
3. Confirma.
4. El sistema muestra un **modal con una contraseña temporal generada** automáticamente.
5. **Copia la contraseña** y comunícasela al empleado por un **canal seguro** (mensajería corporativa cifrada, entrega presencial, etc.). **No la envíes por email en claro.**
6. El empleado podrá iniciar sesión con esas credenciales y (si procede) cambiarlas desde Mi Perfil.

#### Edición de un operador

Pulsa el lápiz/editar sobre la fila del operador. Puedes cambiar:

- **Nombre**.
- **Email**.
- **Rol** (operador ↔ admin/manager/coordinator).
- **Estado** (activo / inactivo). Un operador inactivo no aparece en el cuadrante ni en las listas de asignación, pero se conserva su histórico.

##### Aviso ámbar: operador sin cuenta de acceso

Si al editar ves un **aviso ámbar** indicando que el operador no tiene cuenta de acceso (`auth_id` vacío), significa que el registro existe como ficha de operador (para figurar en el cuadrante) pero no tiene credenciales para entrar en la aplicación.

- En ese caso, al pulsar **Asignar contraseña** el sistema **crea automáticamente la cuenta de acceso** y le asocia la contraseña elegida.
- A partir de ese momento, el operador podrá iniciar sesión.

#### Asignar / resetear contraseña

Si un operador olvida su contraseña:

1. Entra en la fila del operador.
2. Pulsa **Asignar contraseña**.
3. El sistema genera una nueva contraseña temporal.
4. Comunícala por canal seguro.

#### Eliminación permanente

Pulsar **Eliminar** sobre un operador abre un diálogo de confirmación que exige **escribir su nombre completo** para continuar. Es una salvaguarda intencionada: la eliminación es definitiva y arrastra datos históricos.

- Si solo quieres que el operador deje de aparecer en el cuadrante actual pero conservar su histórico, **ponlo en estado inactivo** en lugar de eliminarlo.
- Reserva el borrado permanente para registros duplicados o altas erróneas recientes.

### 6.4 Reglas de cobertura

#### Qué hace

Define los **mínimos de operadores por turno**. Es lo que determina cuándo la Vista del día alerta por infra-cobertura.

#### Estructura

Dos columnas:

- **Día laboral** (lunes a viernes no festivos).
- **Fin de semana / festivo**.

Tres filas, una por turno: **M**, **T**, **N**.

#### Pasos típicos

1. Entra en **Administración → Reglas de cobertura**.
2. Edita los valores de cada casilla.
3. Guarda.

Los cambios se aplican de inmediato a la Vista del día y a las alertas.

#### Cuándo modificarlas

- Cambios estructurales en la operativa del NOC (nueva carga de trabajo, ampliación del servicio).
- Períodos de proyecto especial que requieran más dotación.
- Ajustes tras un análisis de carga real.

No se recomienda tocarlas sin una decisión organizativa detrás.

---

## 7. Calendario N2 (CalN2View)

### Qué hace

Gestiona la **guardia N2 semanal**, que rota entre los 3 responsables asignados. Para cada semana del año se especifica quién está de guardia, y al final de año el sistema resume los importes devengados por cada responsable.

### Cuándo usarla

- Al inicio del año, para configurar la rotación base.
- Cuando un responsable necesita cambiar una semana con otro.
- Al cierre de cada mes o trimestre, para contrastar los importes con nómina.

### Pasos típicos

1. Entra en **Calendario N2**.
2. Localiza la semana que quieras reasignar.
3. Haz **clic sobre el nombre** del responsable de esa semana.
4. Elige el nuevo responsable en el desplegable.
5. Guarda.

### Resumen anual e importes

La vista incluye un **resumen anual** por responsable con:

- **Base: 250 € por semana** sin festivo intersemanal.
- **Suplemento festivo: 290 € por semana** cuando la semana incluye algún día festivo.
- **Total anual** por responsable.

Este resumen alimenta la casilla correspondiente del Resumen RRHH mensual (ver siguiente sección).

### Casos especiales

- **Intercambio entre responsables**: basta con reasignar las dos semanas implicadas. El sistema recalcula los importes automáticamente.
- **Festivo que cae en la semana**: se detecta automáticamente a partir del calendario laboral. Si echas en falta un festivo, verifica que esté marcado como tal en el calendario general.
- **Semana entre años**: las semanas se tratan por el año al que pertenece la mayor parte de sus días naturales.

---

## 8. Resumen RRHH (ResumenRRHH)

### Qué hace

Genera automáticamente el **informe mensual de incidencias para nómina**. Es el entregable mensual clave del administrador: resume todo lo que Recursos Humanos necesita para calcular complementos y pluses.

### Cuándo usarla

Una vez al mes, tras el cierre del período, para enviarlo (típicamente exportado a Excel) a RRHH.

### Qué incluye automáticamente

A partir del cuadrante aprobado del mes:

1. **Horas extra** — turnos D (trabajo extra) que **no caen en festivo**.
2. **Horas festivos / noche** — turnos D que caen en festivo, en domingo o en tramo nocturno (reciben tarifa especial).
3. **Plus NOC** — noches (turno N) trabajadas.
4. **Guardia N2** — importe consolidado a partir del Calendario N2 (base 250 € / 290 € con festivo).
5. **Complemento festivo** — **40 € por cada día trabajado en festivo**. Se genera **una fila por día festivo trabajado**, de modo que RRHH vea exactamente qué días se están pagando.
6. **Entradas manuales adicionales** — kilometraje, comisiones, dietas u otros conceptos que el administrador añada manualmente.

### Pasos típicos

1. Entra en **Resumen RRHH**.
2. Selecciona el mes.
3. Revisa cada bloque generado automáticamente. Compara con la vista de Equipo para validar totales.
4. Añade, si procede, las **entradas manuales** (kilometraje, comisiones, etc.) pulsando el botón correspondiente.
5. Pulsa **Exportar a Excel** para obtener el fichero.
6. Envía el Excel a RRHH por el canal habitual.

### Casos especiales

- **Errores detectados tras exportar**: si tras enviar el Excel se detecta un fallo (por ejemplo, un cambio de turno aprobado con retraso), corrige el cuadrante, regenera el resumen y vuelve a exportar. Avisa a RRHH del reenvío.
- **Complemento festivo por día**: si un operador trabajó dos festivos en el mes, verás dos filas de complemento festivo. No las fusiones: RRHH lo prefiere desglosado.
- **Altas o bajas a mitad de mes**: el sistema solo computa los días en los que el operador estaba activo. Revísalo si ha habido incorporaciones o salidas.

---

## 9. Mi Perfil

### Qué hace

Tu perfil personal como usuario. Como administrador, dispones de las mismas opciones que un operador (cambio de contraseña, visualización de datos personales) **más la gestión del tema** de la aplicación (claro / oscuro).

### Notas

- El cambio de tema es **personal**: solo afecta a tu sesión, no al resto del equipo.
- Si necesitas que otro administrador te resetee la contraseña, pídeselo: cualquier admin puede hacerlo desde Gestión de operadores.

---

## 10. Escenarios frecuentes

### 10.1 Dar de alta a un nuevo operador

1. Administración → Gestión de operadores → **+ Alta usuario**.
2. Rellena nombre, email y rol (normalmente **operador**).
3. Copia la contraseña temporal que muestra el modal.
4. Envíala al nuevo miembro por canal seguro, junto con la URL de la aplicación.
5. Asegúrate de que el calendario del mes ya recoja sus turnos (edita el cuadrante si es necesario).

### 10.2 Un operador olvida su contraseña

1. Administración → Gestión de operadores → busca al operador.
2. Pulsa **Asignar contraseña**.
3. Comunícale la nueva contraseña por canal seguro.

### 10.3 Un operador pide cancelar unas vacaciones ya aprobadas

1. Administración → **Historial de solicitudes**.
2. Filtra por tipo "vacaciones" y por el operador.
3. Localiza la solicitud aprobada.
4. Pulsa **Cancelar aprobación**. El sistema revierte los turnos afectados a su estado previo.
5. Comprueba el calendario del operador para confirmar que los turnos son coherentes.

### 10.4 Cambiar el turno de un día puntual

Dos caminos válidos según el origen del cambio:

- **Si hay una solicitud formal**: apruébala desde Solicitudes pendientes.
- **Si es una decisión del administrador** (baja imprevista, ajuste operativo): Calendario → modo edición → clic en la celda → nuevo turno → guardar.

Si es un turno D con variante horaria, no olvides elegir la variante correcta en el submenú.

### 10.5 Aprobar un cambio de turno multi-día

1. Administración → Solicitudes pendientes.
2. Localiza la solicitud marcada como multi-día.
3. Pulsa **Ver días** para desplegar los pares.
4. Revisa los badges de color de cada tramo para confirmar que es el intercambio esperado.
5. Aprueba (o rechaza) **el conjunto**. La operación es atómica.

### 10.6 Un operador no aparece en el cuadrante aunque está de alta

Revisa en Gestión de operadores que su **estado sea "activo"**. Los inactivos se ocultan del cuadrante.

### 10.7 Reasignar una semana de guardia N2

1. Calendario N2 → localiza la semana.
2. Clic sobre el nombre actual.
3. Selecciona el nuevo responsable.
4. Confirma. El resumen anual se recalcula automáticamente.

### 10.8 Cambiar a un operador de rol (operador → admin)

1. Gestión de operadores → edita su ficha.
2. Cambia el rol a `admin`, `manager` o `coordinator`.
3. Pídele que cierre y vuelva a iniciar sesión para que el cambio tenga efecto.

### 10.9 Añadir kilometraje al cierre del mes

1. Resumen RRHH → mes en curso.
2. Bloque de **entradas manuales** → añade una entrada con el concepto "Kilometraje", operador, importe y observaciones.
3. Reexporta el Excel tras añadir todas las entradas manuales.

### 10.10 Corregir el Resumen RRHH después de enviarlo a nómina

1. Identifica y corrige el origen del error en el cuadrante, el N2 o las entradas manuales.
2. Vuelve a Resumen RRHH del mes afectado.
3. Verifica que la corrección se refleja.
4. Reexporta a Excel.
5. Envía la versión corregida a RRHH indicando claramente que sustituye a la anterior.

### 10.11 Eliminar un operador por error

Si has dado de alta un operador por error y aún no tiene histórico relevante, puedes eliminarlo permanentemente desde Gestión de operadores (tendrás que escribir su nombre completo para confirmar). Si ya lleva tiempo en el sistema y tiene histórico, **márcalo como inactivo** en lugar de eliminarlo.

### 10.12 Un turno queda por debajo del mínimo de cobertura

1. Vista del día o Calendario mostrarán la alerta.
2. Opciones:
   - Reasignar a un operador que esté de descanso (previa conversación con él).
   - Aceptar temporalmente la infra-cobertura y documentarlo.
   - Revisar si existen solicitudes pendientes cuya aprobación agravaría el problema y rechazarlas en consecuencia.

---

## 11. Buenas prácticas

### Antes de aprobar cualquier solicitud

- Echa un vistazo a la **Vista del día** correspondiente a las fechas afectadas.
- Si la solicitud implica varios días o el intercambio con otro operador, abre **Ver días** y revisa que los badges M/T/N/D coincidan con lo esperado.
- Revisa el panel de **Equipo** para valorar la carga que ya acumula el operador.

### Comunicación de credenciales

- **Nunca** envíes contraseñas por email sin cifrar.
- Usa canal corporativo seguro o entrega presencial.
- Pide al empleado que cambie la contraseña temporal en su primer acceso.

### Gestión de operadores

- Prefiere siempre **marcar como inactivo** antes que eliminar.
- Elimina permanentemente solo altas erróneas o duplicados sin histórico.
- Mantén el campo **email** actualizado: es el identificador de acceso.

### Edición del calendario

- Prioriza que los cambios lleguen como **solicitudes formales** (deja rastro y evita malentendidos).
- Recurre al modo edición para lo que no se puede tramitar de otro modo: bajas, ausencias imprevistas, ajustes operativos unilaterales.
- Documenta fuera de la aplicación el motivo de los cambios manuales significativos.

### Cierre mensual

- Fija un día concreto del mes para el cierre y respétalo.
- Antes de exportar el Resumen RRHH, revisa Equipo, Historial de solicitudes (por si hay aprobaciones tardías pendientes) y Calendario N2.
- Conserva copia del Excel exportado por si RRHH pide una comparativa.

### Reglas de cobertura

- Mantén estables los mínimos. Los cambios deben responder a decisiones organizativas, no a ajustes puntuales.
- Si bajas un mínimo temporalmente, anota la fecha prevista de vuelta al valor estándar.

### Revisión cruzada

- Siempre que sea posible, que dos administradores validen los Resúmenes RRHH antes de enviarlos.
- Ante dudas sobre una aprobación (solicitud solapada, cobertura justa), consulta con el otro responsable antes de confirmar.

### Atomicidad y reversibilidad

- Las aprobaciones multi-día son **todo o nada**: no intentes fraccionarlas manualmente.
- La cancelación de una aprobación en el Historial revierte el estado, pero no "borra" la trazabilidad: queda registrada.

### Uso de la Vista del día

- Úsala como cuadro de mando matinal. Tres minutos cada mañana ahorran sustos a media jornada.
- Si detectas una alerta roja, no la normalices: investiga el origen y resuelve (reasignación, llamada al operador, etc.).

---

Este manual cubre el uso funcional de la herramienta. Para incidencias técnicas (acceso caído, errores inesperados, integraciones externas), contacta con el equipo responsable del desarrollo y soporte interno de la aplicación.
