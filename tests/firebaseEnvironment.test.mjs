import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFirebaseEnvironment,
  DEV_FIREBASE_PROJECT_ID,
  PROD_FIREBASE_PROJECT_ID,
} from '../scripts/firebaseEnvironment.mjs';

function config(environment, projectId) {
  return {
    VITE_FIREBASE_ENV: environment,
    VITE_FIREBASE_API_KEY: 'test-key',
    VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.firebasestorage.app`,
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
    VITE_FIREBASE_APP_ID: 'test-app',
  };
}

test('npm run dev acepta únicamente el proyecto DEV', () => {
  const result = assertFirebaseEnvironment({
    command: 'serve',
    mode: 'development',
    lifecycleEvent: 'dev',
    env: config('development', DEV_FIREBASE_PROJECT_ID),
  });
  assert.equal(result.projectId, DEV_FIREBASE_PROJECT_ID);
});

test('npm run dev rechaza explícitamente producción', () => {
  assert.throws(() => assertFirebaseEnvironment({
    command: 'serve',
    mode: 'production',
    lifecycleEvent: 'dev',
    env: config('production', PROD_FIREBASE_PROJECT_ID),
  }), /esperaba development/);
});

test('el build acepta únicamente producción', () => {
  const result = assertFirebaseEnvironment({
    command: 'build',
    mode: 'production',
    lifecycleEvent: 'build',
    env: config('production', PROD_FIREBASE_PROJECT_ID),
  });
  assert.equal(result.projectId, PROD_FIREBASE_PROJECT_ID);
});

test('el build rechaza explícitamente DEV', () => {
  assert.throws(() => assertFirebaseEnvironment({
    command: 'build',
    mode: 'development',
    lifecycleEvent: 'build',
    env: config('development', DEV_FIREBASE_PROJECT_ID),
  }), /esperaba production/);
});

test('rechaza configuraciones incompletas antes de iniciar Vite', () => {
  assert.throws(() => assertFirebaseEnvironment({
    command: 'serve',
    mode: 'development',
    lifecycleEvent: 'dev',
    env: { VITE_FIREBASE_ENV: 'development' },
  }), /Configuración Firebase incompleta/);
});
