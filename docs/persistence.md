# Persistencia y sincronización de entradas

## Modelo

Firestore es la fuente de verdad. Cada fecha ocupa un documento
`users/{uid}/entries/{yyyy-MM-dd}` y contiene una sola entrada dentro de
`entries[]`. Las jornadas abiertas, pausas abiertas, jornadas cerradas y
ausencias se escriben con el mismo formato.

La política para dos escrituras sobre el mismo día es **last write wins** sobre
la jornada completa. Las acciones de UI sólo escriben al confirmar; escribir en
un input modifica únicamente el borrador del formulario.

## Lecturas y cache

La pantalla mantiene un listener para el mes seleccionado. Si la semana visible
cruza un límite de mes, agrega exclusivamente el mes adyacente necesario.

El cache auxiliar usa:

`chronolog:entries-cache:v2:<uid>:<yyyy-MM>`

- Se lee al autenticar y antes de recibir el primer snapshot.
- Se actualiza tras snapshots y operaciones optimistas.
- Se reemplaza por el primer snapshot proveniente del servidor.
- Un snapshot vacío sólo de cache no destruye un cache local con datos.
- Nunca se comparte entre UID.
- No se borra al cerrar sesión: permite navegación rápida y arranque offline,
  pero se retira inmediatamente de React al cambiar de cuenta.

Firestore usa persistencia IndexedDB multi-tab. Si el navegador no la admite,
el SDK vuelve a su cache estándar y la UI informa el error/offline mediante la
metadata del snapshot.

## Migración heredada

`pendingTimeEntries` no tiene UID. Sólo se ofrece importarlo cuando existe
exactamente una key heredada `currentMonthTimeEntries:<uid>`, que se usa como
evidencia de propietario. La importación:

1. obtiene el historial remoto bajo demanda;
2. informa cuántas fechas difieren;
3. requiere confirmación explícita;
4. reemplaza únicamente las fechas heredadas, sin borrar fechas remotas ausentes
   del archivo local;
5. elimina las keys heredadas sólo después de una escritura exitosa.

El cache mensual heredado asociado al UID participa de esa misma confirmación y
nunca recrea por sí solo un documento remoto eliminado.

## Operaciones históricas

- Backup consulta explícitamente todo el historial.
- Restore valida el JSON, muestra impacto y reemplaza el historial completo.
- Borrado total requiere confirmación.
- Restore, borrado y rangos son atómicos hasta el límite Firestore de 500
  documentos. Si lo superan, la operación se rechaza antes de escribir para no
  dejar un resultado parcial.

## Validación manual previa a producción

Estas pruebas requieren un proyecto Firebase de prueba o dos sesiones reales:

1. Abrir la misma cuenta en dos dispositivos y verificar ingreso, pausa,
   reingreso, cierre, edición, reapertura y eliminación en ambos sentidos.
2. Cambiar de mes en uno de ellos y comprobar que el mes anterior deja de
   recibir cambios visibles hasta volver a seleccionarlo.
3. Desconectar un dispositivo con la app abierta, registrar una acción,
   reconectar y verificar que llegue al segundo dispositivo sin duplicados.
4. Probar dos cuentas en el mismo navegador y confirmar que nunca se muestra
   cache ni migración perteneciente a la otra.
5. Descargar backup con varios meses, cancelar un restore y luego confirmar un
   restore válido.
6. Cancelar y confirmar una carga de ausencias que reemplace días existentes.
7. Cancelar y confirmar el borrado total.

Las Security Rules versionadas deben desplegarse y probarse con un usuario que
intente acceder al UID de otra cuenta antes del deploy de aplicación.
