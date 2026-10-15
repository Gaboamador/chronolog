# Tema y modales — ajuste visual

- El modo oscuro queda elegido de forma predeterminada; en **Más → Apariencia** se puede elegir **Oscuro**, **Claro** o **Automático**.
- La preferencia se guarda en el navegador (`chronolog:theme-preference`), no en Firebase. En otros dispositivos se elige por separado.
- Automático sigue la preferencia de esquema de color del sistema y responde a los cambios sin recargar.
- En móvil, los editores largos reutilizan las mismas acciones y validaciones, pero ocupan el viewport; **Marcar ausencia** aparece como panel inferior.
- Confirmaciones de eliminación siguen siendo diálogos centrados.
- Cambios solo en UI/SCSS, estado de presentación y selector; nada en los servicios o los cálculos.
- Revisión local recomendada: modo oscuro y claro en pantalla de login, ficha abierta, Jornada, Calendario, Resumen, Más, edición de registro, carga por rango, ajustes y confirmaciones; teclado y botón Atrás móvil.
