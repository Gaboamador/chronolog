import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const theme = read('styles/theme.scss');
const surfaces = read('styles/patterns/_buttonSurfaces.scss');
const modal = read('componentes/ModalEditar/ModalEditar.module.scss');
const editor = read('componentes/EditorRegistro/EditorRegistro.module.scss');
const editorJsx = read('componentes/EditorRegistro/EditorRegistro.jsx');
const header = read('componentes/Header/Header.module.scss');

function tokens(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\s*;/gi)]
    .map(([, name, value]) => [name, value]));
}
const [light, dark] = theme.split(":root[data-theme='dark']");
const lightTokens = tokens(light);
const darkTokens = tokens(dark);
function luminance(hex) {
  const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  return rgb.map((x) => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
    .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const x = luminance(a); const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('modo oscuro usa #173e76 como azul de botones principales, con texto blanco legible', () => {
  for (const token of ['action-primary-bg', 'button-primary-bg', 'modal-control-primary-bg']) {
    assert.equal(darkTokens[token], '#173e76', token);
  }
  assert.ok(contrast(darkTokens['button-primary-bg'], darkTokens['button-primary-color']) >= 4.5);
  assert.equal(lightTokens['action-primary-bg'], '#0d77a6', 'no se cambia el acento principal claro');
});

test('los botones de modal consumen tokens del contenedor y no blancos fijos', () => {
  for (const token of ['primary-bg', 'primary-color', 'secondary-bg', 'secondary-color', 'tertiary-bg', 'tertiary-color']) {
    assert.match(surfaces, new RegExp(`--button-${token}: var\\(--modal-control-${token}\\)`));
  }
  assert.match(modal, /\.overlay:not\(\.sheet\) \.content/);
  assert.match(modal, /--modal-control-secondary-bg: var\(--color-secundario-fondo\)/);
  assert.match(modal, /--modal-control-secondary-color: var\(--text-main\)/);
  assert.match(modal, /--modal-control-secondary-bg: var\(--surface-elevated\)/);
  assert.ok(contrast(lightTokens['color-secundario-fondo'], lightTokens['text-main']) >= 4.5);
  assert.ok(contrast(darkTokens['surface-elevated'], darkTokens['text-main']) >= 4.5);
});

test('editor comparte colores de la superficie y muestra las tres acciones sin alterar handlers', () => {
  assert.match(editor, /color: var\(--modal-foreground, var\(--text-main\)\)/);
  assert.match(editor, /color: var\(--color-danger\)/);
  assert.match(modal, /grid-template-columns: 44px minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(editorJsx, /aria-label="Eliminar registro"/);
  assert.match(editorJsx, /<FiTrash2 aria-hidden="true"\s*\/>/);
  for (const callback of ['handleDeleteEdit', 'handleCancelEdit', 'handleSaveEdit']) {
    assert.match(editorJsx, new RegExp(`onClick={${callback}}`));
  }
});

test('se conserva el padding del isotipo que ajustó el usuario', () => {
  assert.match(header, /\.withMobileNavigation \.isologoContainer\s*\{[^}]*padding-left: 0;/);
});

test('resumen desktop conserva contraste en la cabecera y filas secundarias de ambos temas', () => {
  const summary = read('componentes/ResumenSemana/ResumenSemana.module.scss');
  for (const palette of [lightTokens, darkTokens]) {
    assert.ok(contrast(palette['table-header-bg'], palette['table-header-fg']) >= 4.5);
  }
  assert.match(summary, /background-color: var\(--table-header-bg\)/);
  assert.match(summary, /color: var\(--table-header-fg\)/);
  assert.match(summary, /background: var\(--color-secundario-fondo\)/);
});
