import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const theme = read('styles/theme.scss');
const header = read('componentes/Header/Header.module.scss');
const headerJsx = read('componentes/Header/Header.jsx');
const editor = read('componentes/EditorRegistro/EditorRegistro.module.scss');


test('Header conserva el azul en modo claro y se integra al fondo en modo oscuro', () => {
  const [lightTheme, darkTheme] = theme.split(
    ":root[data-theme='dark'] {"
  );

  assert.ok(lightTheme);
  assert.ok(darkTheme);

  // Modo claro: mismo fondo y texto que la navbar.
  assert.match(lightTheme, /--header-bg:\s*var\(--nav-bg\)\s*;/);
  assert.match(lightTheme, /--header-fg:\s*var\(--nav-fg\)\s*;/);

  // Modo oscuro: integrado con el fondo de la página.
  assert.match(darkTheme, /--header-bg:\s*var\(--page-bg\)\s*;/);
  assert.match(darkTheme, /--header-fg:\s*var\(--text-main\)\s*;/);

  // El desplegable conserva su propio color de texto.
  assert.match(
    header,
    /\.menuDropdown\s*\{[^}]*color: var\(--dropdown-fg\)/s
  );
});

test('El borde del Header se activa por scroll de página o de Más', () => {
  assert.match(header, /\.headerContentScrolled\s*\{\s*border-bottom-color: var\(--border-strong\)/);
  assert.match(headerJsx, /pageScroll >= 1 \|\| menuScroll >= 1/);
  assert.match(headerJsx, /window\.addEventListener\('scroll', updateScrollBoundary, \{ passive: true \}\)/);
  assert.match(headerJsx, /onScroll=\{\(event\) =>/);
});

test('Más comparte la jerarquía del paneHeading y conserva un divisor entre grupos', () => {
  assert.match(headerJsx, /mobileMoreEyebrow}>Cuenta y herramientas<\/span>/);
  assert.match(header, /\.mobileMoreHeading[^}]*border-bottom: 1px solid var\(--border-strong\)/s);
  assert.match(header, /\.menuDropdown li\.bottomDivider\s*\{\s*border-bottom: 0;/);
  assert.match(header, /\.menuDropdown li\.dividerAbove\s*\{\s*border-radius: 0;/);
});

test('El botón de quitar salida mantiene el centrado en todos los anchos', () => {
  assert.match(editor, /\.removeBreakButton\s*\{\s*display: flex;\s*justify-content: center;\s*align-items: center;/);
});
