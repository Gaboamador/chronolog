export const DEV_FIREBASE_PROJECT_ID = 'chronolog-dev';
export const PROD_FIREBASE_PROJECT_ID = 'chronolog-f21f6';

const REQUIRED_FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

export function assertFirebaseEnvironment({
  command,
  mode,
  lifecycleEvent = '',
  env,
}) {
  const isPreview = lifecycleEvent === 'preview';
  const expectsDevelopment = command === 'serve' && !isPreview;
  const expectedEnvironment = expectsDevelopment ? 'development' : 'production';
  const expectedProjectId = expectsDevelopment
    ? DEV_FIREBASE_PROJECT_ID
    : PROD_FIREBASE_PROJECT_ID;

  const missing = REQUIRED_FIREBASE_KEYS.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(
      `Configuración Firebase incompleta para ${expectedEnvironment}: faltan ${missing.join(', ')}.`
    );
  }

  if (env.VITE_FIREBASE_ENV !== expectedEnvironment) {
    throw new Error(
      `Entorno Firebase bloqueado: ${command}/${mode} esperaba ${expectedEnvironment}, pero recibió ${env.VITE_FIREBASE_ENV || 'sin identificar'}.`
    );
  }

  if (env.VITE_FIREBASE_PROJECT_ID !== expectedProjectId) {
    throw new Error(
      `Proyecto Firebase bloqueado: ${expectedEnvironment} debe usar ${expectedProjectId}, no ${env.VITE_FIREBASE_PROJECT_ID}.`
    );
  }

  if (expectsDevelopment && env.VITE_FIREBASE_PROJECT_ID === PROD_FIREBASE_PROJECT_ID) {
    throw new Error('El servidor de desarrollo nunca puede conectarse a Firebase PROD.');
  }

  return { environment: expectedEnvironment, projectId: expectedProjectId };
}
