# Prompts — TP 1

El registro del proceso, en orden.

---

## 1 — Prompt inicial

```
Quiero un formulario web que corra en un navegador.

Constraints:
- Un solo archivo HTML, con el CSS en un <style> y el JS en un <script>.
- Vanilla JS, sin frameworks ni dependencias externas.
- Los elementos deben ser objetos de CSS/DOM. No usar <canvas>.

Estética:
- Página de estilo principios de los '90 (tipo GeoCities/Angelfire): fondo con
  patrón tileado llamativo, tipografía Times New Roman / Comic Sans, texto con
  colores muy saturados y distintos por palabra.
- Layout armado con una <table>, como se hacía en esa época.
- Texto parpadeante (clase "blink" simulando el <blink> de Netscape) y un
  <marquee> con una cinta de texto en movimiento.
- Bordes en relieve estilo Windows 95/98 (outset/inset) en cajas y botones.
- Cartel de "página en construcción" con rayas diagonales amarillas y negras.
- Contador de visitas estilo display LED y una insignia de "mejor visto en
  Netscape Navigator a 800x600".
- Un separador horizontal en degradé arcoíris.

Comportamiento:
- El formulario pide Nombre, Email y Fecha de nacimiento.
- La fecha de nacimiento se ingresa exclusivamente tocando las teclas de un
  piano de una octava completa (12 teclas: 7 blancas + 5 negras, C a B).
- Cada tecla suena su nota correspondiente (sintetizada con la Web Audio API,
  sin archivos de audio) y representa un valor:
  - C, C#, D, D#, E, F, F#, G, G#, A → dígitos 0 a 9, en ese orden cromático.
  - A# → Borrar el último dígito ingresado.
  - B → Confirmar / avanzar.
- Los dígitos tocados van completando un campo con formato DD/MM/AAAA, pasando
  automáticamente de día a mes y de mes a año.
- El botón "Enviar" queda deshabilitado hasta que la fecha ingresada sea válida
  (día acorde al mes, mes 1-12, año de cuatro dígitos plausible).
- Al enviar, se reemplaza el formulario por un mensaje de agradecimiento con
  los datos cargados, sin salir de la estética de la página.

Estructura:
- Todo en un único archivo. El layout principal usa una <table> centrada.
- El piano es una fila de 12 elementos posicionados con CSS (teclas blancas y
  negras superpuestas), no un <canvas>.
- Estado en JS: los dígitos ingresados, qué segmento de la fecha está activo
  (día/mes/año), y si el formulario ya fue enviado.
```

---

## 2 — Iterar sobre el envío: la fecha como partitura

```
Al hacer click en "Enviar", antes de mostrar el mensaje de agradecimiento,
reproducí en orden las mismas notas que se fueron tocando en el piano para
armar la fecha de nacimiento (solo las notas de los dígitos, no las teclas de
Borrar ni Confirmar) — como si la fecha fuera la partitura de una melodía.

Cada nota se toca con el mismo timbre sintetizado que ya se usa al presionar
las teclas, a un tempo fijo. Mientras suena la partitura el botón de enviar
queda deshabilitado y muestra que se está reproduciendo. Recién cuando termina
de sonar la última nota se revela el mensaje de agradecimiento con los datos
cargados.

Si el usuario borra un dígito con A#, la nota correspondiente también se saca
de la partitura: lo que se reproduce al final es exactamente la melodía de la
fecha final, no del historial completo de teclas tocadas.
```

---

## 3 — Validación sonora y piano que se toca solo

```
Seguimos iterando sobre el mismo formulario.

1. Validación con melodía: en el momento en que se completan los 8 dígitos de
   la fecha (día, mes y año llenos), ejecutá una melodía corta que indique si
   la fecha es válida o no — una progresión ascendente y agradable si es una
   fecha real, una descendente o disonante si no lo es (por ejemplo, un día
   que no existe para ese mes). Es una señal sonora aparte de la partitura de
   la fecha: solo avisa si lo que se cargó tiene sentido como fecha.

2. Piano que se toca solo al enviar: mientras se reproduce la partitura de la
   fecha (al hacer click en "Enviar", como se agregó en el prompt anterior),
   la tecla del piano correspondiente a cada nota se tiene que "presionar"
   visualmente en sincro con el sonido — la misma animación de tecla
   presionada que ya se ve al tocarlas con el mouse, pero disparada por el
   código en vez de por el click del usuario.
```

---
