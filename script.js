/* =========================================================
   Encuesta "Conociendo a Leo" - Tema Freddy Krueger
   Traducción del código Python original a JavaScript
   ========================================================= */

/* ---------- DATOS: preguntas del código Python original ---------- */
// tipo "texto": respuesta libre sin puntaje (¿Cómo te llamas?)
// tipo "opcion": opciones de respuesta; "correcta" es la respuesta correcta
const PREGUNTAS = [
  { texto: "¿Cómo te llamas?", tipo: "texto" },
  { texto: "¿Cuál es mi comida favorita?",  tipo: "opcion", opciones: ["Pizza", "Hamburguesa", "Pasta", "Lazaña"],        correcta: "Hamburguesa" },
  { texto: "¿Cuál es mi color favorito?",   tipo: "opcion", opciones: ["Azul", "Verde", "Rojo", "Amarillo"],              correcta: "Azul" },
  { texto: "¿Cuál es mi música favorita?",  tipo: "opcion", opciones: ["Rap", "Reggue", "Crosover", "Reggueton"],         correcta: "Rap" },
  { texto: "¿Cuál es mi mascota?",          tipo: "opcion", opciones: ["Gato", "Perro", "Pescado", "Loro"],               correcta: "Gato" },
  { texto: "¿Cuál es mi Video juego Favorito?", tipo: "opcion", opciones: ["Tetrix", "MatalGear", "MarioBros", "GTA6"],   correcta: "MatalGear" }
];

/* ---------- ESTADO ---------- */
let indice = 0;                                          // pregunta actual
const respuestas = new Array(PREGUNTAS.length).fill(""); // respuestas guardadas (persisten al navegar)

/* ---------- REFERENCIAS AL DOM ---------- */
const $ = (id) => document.getElementById(id);
const pantallas = { inicio: $("pantalla-inicio"), preguntas: $("pantalla-preguntas"), final: $("pantalla-final") };

/* Compara sin importar mayúsculas/espacios (corrige el error del .lower() original) */
const normalizar = (t) => String(t).trim().toLowerCase();

function mostrarPantalla(nombre) {
  Object.values(pantallas).forEach((p) => p.classList.remove("activa"));
  pantallas[nombre].classList.add("activa");
}

/* ---------- SONIDO (Web Audio API, sin archivos externos) ---------- */
let sonidoOn = false, audioCtx = null;

function tono(frec, dur, tipo = "sawtooth", vol = 0.08) {
  if (!sonidoOn) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator(), gan = audioCtx.createGain();
  osc.type = tipo; osc.frequency.value = frec;
  gan.gain.setValueAtTime(vol, audioCtx.currentTime);
  gan.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.connect(gan); gan.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}
const sonidoClick    = () => tono(180, 0.15, "square");
const sonidoCorrecto = () => { tono(520, 0.2, "sine"); setTimeout(() => tono(660, 0.25, "sine"), 120); };
const sonidoError    = () => { tono(90, 0.5, "sawtooth", 0.12); tono(95, 0.5, "sawtooth", 0.12); };
const sonidoGarra    = () => [900, 1100, 1300, 1500].forEach((f, i) => setTimeout(() => tono(f, 0.2, "triangle", 0.05), i * 70)); // "ras" de cuchillas

$("btn-sonido").addEventListener("click", (e) => {
  sonidoOn = !sonidoOn;
  e.currentTarget.textContent = sonidoOn ? "🔊 Sonido: ON" : "🔇 Sonido: OFF";
  e.currentTarget.classList.toggle("on", sonidoOn);
  sonidoClick();
});

/* ---------- RENDER DE PREGUNTA ---------- */
function mostrarPregunta(animar = true) {
  const p = PREGUNTAS[indice];
  const caja = $("contenedor-pregunta");
  $("texto-pregunta").textContent = p.texto;
  $("error").textContent = "";
  $("feedback").textContent = ""; $("feedback").className = "feedback";

  const cont = $("opciones");
  cont.innerHTML = "";

  if (p.tipo === "texto") {
    cont.style.display = "block";
    const inp = document.createElement("input");
    inp.type = "text"; inp.maxLength = 40; inp.className = "input-texto";
    inp.placeholder = "Escribe tu nombre…"; inp.value = respuestas[indice];
    inp.addEventListener("input", () => { respuestas[indice] = inp.value; $("error").textContent = ""; });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") siguiente(); });
    cont.appendChild(inp);
    setTimeout(() => inp.focus(), 100);
  } else {
    cont.style.display = "";
    p.opciones.forEach((op) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "opcion"; b.textContent = op;
      if (respuestas[indice] === op) b.classList.add("sel");   // conserva la selección previa
      b.addEventListener("click", () => elegir(op));
      cont.appendChild(b);
    });
    if (respuestas[indice]) mostrarFeedback();                  // reaparece el mensaje al volver
  }

  // Progreso
  const pct = Math.round((indice / PREGUNTAS.length) * 100);
  $("texto-progreso").textContent = `Pregunta ${indice + 1} de ${PREGUNTAS.length}`;
  $("porcentaje").textContent = pct + "%";
  $("barra-relleno").style.width = pct + "%";

  // Botones
  $("btn-atras").disabled = indice === 0;
  $("btn-siguiente").textContent = indice === PREGUNTAS.length - 1 ? "Terminar ☠" : "Siguiente →";

  if (animar) { caja.classList.remove("entrada"); void caja.offsetWidth; caja.classList.add("entrada"); }
}

/* Selección de una opción */
function elegir(op) {
  respuestas[indice] = op;
  document.querySelectorAll(".opcion").forEach((b) => b.classList.toggle("sel", b.textContent === op));
  $("error").textContent = "";
  mostrarFeedback(true);
}

/* "Respuesta correcta / incorrecta" como en el Python original */
function mostrarFeedback(conSonido = false) {
  const p = PREGUNTAS[indice], fb = $("feedback");
  const ok = normalizar(respuestas[indice]) === normalizar(p.correcta);
  fb.textContent = ok ? "Respuesta correcta" : "Respuesta incorrecta";
  fb.className = "feedback " + (ok ? "ok" : "mal");
  if (conSonido) ok ? sonidoCorrecto() : sonidoError();
}

/* ---------- NAVEGACIÓN Y VALIDACIÓN ---------- */
function transicion(fn) {
  const caja = $("contenedor-pregunta");
  caja.classList.add("salida");
  setTimeout(() => { caja.classList.remove("salida"); fn(); }, 300);
}

function siguiente() {
  // Validación: todas las preguntas son obligatorias
  if (!String(respuestas[indice]).trim()) {
    const err = $("error");
    err.textContent = PREGUNTAS[indice].tipo === "texto"
      ? "Dime tu nombre… Freddy ya lo sabe."
      : "Debes elegir una respuesta para continuar.";
    err.classList.remove("sacudir"); void err.offsetWidth; err.classList.add("sacudir");
    sonidoError();
    return;
  }
  sonidoClick();
  if (indice < PREGUNTAS.length - 1) { transicion(() => { indice++; mostrarPregunta(); }); }
  else { transicion(mostrarFinal); }
}

function atras() {
  if (indice === 0) return;
  sonidoClick();
  transicion(() => { indice--; mostrarPregunta(); });
}

/* ---------- PANTALLA FINAL ---------- */
function mostrarFinal() {
  let correctas = 0, incorrectas = 0;
  const lista = $("detalle"); lista.innerHTML = "";

  PREGUNTAS.forEach((p, i) => {
    if (p.tipo !== "opcion") return;                // el nombre no puntúa
    const ok = normalizar(respuestas[i]) === normalizar(p.correcta);
    ok ? correctas++ : incorrectas++;
    const li = document.createElement("li");
    li.className = ok ? "ok" : "mal";
    li.textContent = `${p.texto} → Tu respuesta: ${respuestas[i]}` + (ok ? " ✔" : ` ✘ (correcta: ${p.correcta})`);
    lista.appendChild(li);
  });

  const nombre = respuestas[0].trim();
  const total = correctas + incorrectas;
  let msg = `${nombre}, `;
  if (correctas === total) msg += "me conoces demasiado bien… ni en sueños podría esconderte nada.";
  else if (correctas >= Math.ceil(total / 2)) msg += "me conoces bastante, pero aún queda algo por descubrir.";
  else msg += "casi no me conoces… la pesadilla apenas comienza.";

  $("mensaje-final").textContent = msg;
  $("num-correctas").textContent = correctas;      // "tu respuesta correctas fueron"
  $("num-incorrectas").textContent = incorrectas;  // "tu respuestas incorrectas fueron"
  $("barra-relleno").style.width = "100%";
  mostrarPantalla("final");
  sonidoGarra();
}

/* ---------- EVENTOS ---------- */
$("btn-comenzar").addEventListener("click", () => {
  sonidoGarra();
  indice = 0;
  mostrarPantalla("preguntas");
  mostrarPregunta();
});
$("btn-siguiente").addEventListener("click", siguiente);
$("btn-atras").addEventListener("click", atras);
$("btn-reiniciar").addEventListener("click", () => {
  respuestas.fill(""); indice = 0;                 // reinicia contadores y respuestas
  sonidoClick();
  mostrarPantalla("inicio");
});
