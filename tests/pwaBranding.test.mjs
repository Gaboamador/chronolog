import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const readProjectFile = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('el manifest estático usa fondo y tema negro sin alterar el resto de la PWA', () => {
  const manifest = JSON.parse(readProjectFile('public/manifest.json'));
  assert.equal(manifest.theme_color, '#000000');
  assert.equal(manifest.background_color, '#000000');
  assert.equal(manifest.start_url, '.');
  assert.equal(manifest.display, 'standalone');
});

test('las referencias del manifest y los íconos permanecen como en producción', () => {
  const html = readProjectFile('index.html');
  for (const resource of ['favicon.ico', 'isotipo_circular_192.png', 'manifest.json']) {
    assert.ok(html.includes(`href="/${resource}"`), resource);
  }
  assert.doesNotMatch(html, /%BASE_URL%/);
});

test('la barra del navegador usa negro en oscuro y conserva azul en claro', () => {
  const html = readProjectFile('index.html');
  const provider = readProjectFile('src/context/ThemeContext.jsx');
  assert.match(html, /name="theme-color" content="#000000"/);
  assert.match(provider, /nextTheme === 'dark' \? '#000000' : '#0b2233'/);
});
