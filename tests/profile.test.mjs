import assert from 'node:assert/strict';
import test from 'node:test';
import { isProfileComplete, normalizeProfile } from '../src/utils/profile.js';

test('el perfil requiere nombre y apellido no vacíos', () => {
  assert.equal(isProfileComplete(null), false);
  assert.equal(isProfileComplete({ firstName: 'Ana', lastName: '' }), false);
  assert.equal(isProfileComplete({ firstName: ' ', lastName: 'Pérez' }), false);
  assert.equal(isProfileComplete({ firstName: 'Ana', lastName: 'Pérez' }), true);
});

test('normaliza espacios antes de evaluar o guardar el perfil', () => {
  assert.deepEqual(
    normalizeProfile({ firstName: '  Ana ', lastName: ' Pérez  ' }),
    { firstName: 'Ana', lastName: 'Pérez' }
  );
});
