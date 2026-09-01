# Entorno Firebase DEV y validación manual

## Separación garantizada

- `npm run dev` y `npm start` exigen `development/chronolog-dev`.
- `npm run build` exige `production/chronolog-f21f6`.
- Vite aborta antes de iniciar si falta una variable, el entorno no coincide o
  se intenta usar el proyecto contrario.
- `src/firebase.js` repite la comprobación antes de inicializar el SDK.
- `.firebaserc` sólo contiene el alias `dev`; no existe un alias default ni
  un alias de producción.
- Las credenciales DEV reales están en `.env.development.local`, ignorado por
  Git. Los archivos `.example` no contienen credenciales.

Ejecutar antes de probar:

```powershell
npm run test:firebase-env
npm test
npm run build
npm run dev
```

En la consola del navegador de `npm run dev` debe verse:

```text
[Chronolog DEV] Firebase project: chronolog-dev
```

## Preparación en Firebase Console DEV

1. Authentication / Sign-in method: Email/Password habilitado.
2. Authentication / Settings / Authorized domains: `localhost`.
3. Verificar el correo de los dos usuarios DEV. Chronolog no permite ingresar a
   la aplicación mientras `emailVerified` sea falso.
4. Firestore creado y con las rules de `firestore.rules`.
5. No hacen falta índices compuestos: las consultas mensuales ordenan y limitan
   por ID documental `yyyy-MM-dd`.

Para probar desde un teléfono en la misma red:

1. Ejecutar `npm run dev:lan`.
2. Abrir la URL LAN que informa Vite.
3. Agregar temporalmente la IP/nombre del equipo como Authorized domain del
   proyecto DEV si Firebase Auth lo solicita.
4. Nunca agregar esa URL a la configuración PROD.

## Matriz manual

### Dos sesiones, misma cuenta

Usar una ventana normal y una ventana incógnita, o PC y teléfono.

1. Iniciar sesión con el mismo usuario DEV en ambas.
2. Marcar ingreso en A; verificar jornada abierta en B sin recargar.
3. Marcar salida transitoria en B; verificar pausa abierta y cronómetro en A.
4. Marcar reingreso en A; verificarlo en B.
5. Finalizar jornada en B; verificar cierre y cálculos en A.
6. Editar horarios y pausas; comprobar propagación.
7. Vaciar únicamente la salida desde el editor; comprobar reapertura en ambos.
8. Volver a finalizar y eliminar la jornada.

### Meses y listeners

1. Dejar A en un mes y B en otro.
2. Modificar en A: B no debe alterar su mes visible.
3. Navegar B al mes de A: debe recibir el snapshot actualizado.
4. Probar una semana que cruce fin de mes.
5. Volver a un mes cacheado y confirmar render inmediato seguido de
   reconciliación.

### Offline

1. Con ambas sesiones abiertas, DevTools de A / Network / Offline.
2. Registrar una acción válida en A.
3. Confirmar UI optimista y estado “Sin conexión · cambios en espera”.
4. Volver a Online.
5. Confirmar “Sincronizado” y recepción en B, sin duplicados.
6. Repetir con jornada abierta, pausa abierta y cierre.

### Aislamiento

1. Cerrar sesión en A e ingresar con el segundo usuario DEV.
2. Confirmar que no aparece ninguna entrada del primero.
3. Provocar una escritura offline del primero, cambiar de cuenta y reconectar.
4. Confirmar que la reconciliación no introduce datos del primer UID.
5. Comprobar en Firestore que cada dato está bajo su propio `users/{uid}`.

### Bulk y backup

1. Cargar ausencias por rango sin reemplazos.
2. Repetir sobre días existentes, cancelar y luego confirmar.
3. Descargar backup y verificar que contiene varios meses.
4. Seleccionar un JSON inválido: debe rechazarse sin escribir.
5. Seleccionar uno válido, cancelar: Firestore no debe cambiar.
6. Confirmar restore y verificar ambos dispositivos.
7. Cancelar y confirmar borrado total.

Las operaciones que afectarían más de 500 documentos se bloquean antes de
escribir para evitar resultados parciales.

## Rules DEV

Para desplegar rules exclusivamente a DEV con Firebase CLI:

```powershell
npx firebase-tools deploy --only firestore:rules --project chronolog-dev
```

Este comando no debe ejecutarse desde automatizaciones ni sustituirse por un
project ID de producción durante estas validaciones.
