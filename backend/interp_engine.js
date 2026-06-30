'use strict';

// ── Motor de interpretación astrológica local (sin API externa, sin costo) ──
// Combina frases por signo solar/lunar/ascendente + aspectos principales
// para generar un párrafo único y coherente en cada consulta.

const SOL = {
  Aries: 'una energía pionera, directa y con ganas de iniciar todo lo que se propone',
  Tauro: 'una base estable, perseverante y con gusto por construir cosas duraderas',
  Geminis: 'curiosidad constante, agilidad mental y facilidad para comunicar ideas',
  Cancer: 'sensibilidad profunda, fuerte conexión con lo familiar y memoria emocional',
  Leo: 'una identidad luminosa, creativa y con necesidad genuina de expresarse',
  Virgo: 'atención al detalle, sentido práctico y vocación de servicio',
  Libra: 'búsqueda de equilibrio, diplomacia y sensibilidad estética',
  Escorpio: 'intensidad emocional, profundidad y una mirada que va más allá de lo evidente',
  Sagitario: 'espíritu expansivo, optimismo y sed de aprendizaje y horizontes nuevos',
  Capricornio: 'disciplina, ambición serena y vocación de construir a largo plazo',
  Acuario: 'originalidad, independencia y una visión que mira hacia el futuro',
  Piscis: 'sensibilidad artística, empatía y una conexión fluida con lo intangible'
};

const LUNA = {
  Aries: 'reacciona con impulso y necesita libertad para procesar lo que siente',
  Tauro: 'necesita estabilidad y entornos seguros para sentirse en calma',
  Geminis: 'procesa las emociones hablando, pensando y buscando variedad constante',
  Cancer: 'tiene una vida emocional rica, protectora y profundamente ligada al hogar',
  Leo: 'necesita reconocimiento afectivo y brilla cuando se siente valorada',
  Virgo: 'ordena sus emociones a través de la rutina y el cuidado de los detalles',
  Libra: 'busca armonía en sus vínculos y se nutre del intercambio con otros',
  Escorpio: 'vive las emociones con intensidad y necesita vínculos genuinos y profundos',
  Sagitario: 'encuentra calma en la libertad, los viajes y la expansión de horizontes',
  Capricornio: 'gestiona sus emociones con responsabilidad y mucha contención interna',
  Acuario: 'necesita espacio propio y procesa lo emocional desde una mirada original',
  Piscis: 'es altamente receptiva, intuitiva y se conecta con lo emocional sin filtros'
};

const ASC = {
  Aries: 'se presenta ante el mundo con energía, iniciativa y un aire decidido',
  Tauro: 'transmite calma, solidez y una presencia tranquila que inspira confianza',
  Geminis: 'se muestra comunicativa, versátil y siempre con algo interesante para decir',
  Cancer: 'da una primera impresión cálida, protectora y cercana',
  Leo: 'irradia carisma natural y una presencia que capta la atención',
  Virgo: 'se presenta con discreción, orden y atención a cada detalle',
  Libra: 'transmite simpatía, equilibrio y un trato cordial casi instintivo',
  Escorpio: 'proyecta intensidad y un magnetismo difícil de ignorar',
  Sagitario: 'se muestra optimista, abierta y con ganas de explorar todo lo nuevo',
  Capricornio: 'transmite seriedad, responsabilidad y una autoridad natural',
  Acuario: 'se presenta como alguien original, independiente y poco convencional',
  Piscis: 'proyecta sensibilidad, dulzura y una conexión fácil con los demás'
};

const ASPECTOS = {
  Conjuncion: { plural: 'fusiona', texto: 'energías que actúan como una sola fuerza' },
  Sextil:     { plural: 'favorece', texto: 'una conexión fluida y de fácil aprovechamiento' },
  Cuadratura: { plural: 'tensiona', texto: 'una tensión productiva que empuja al crecimiento' },
  Trigono:    { plural: 'armoniza', texto: 'un talento natural que fluye sin esfuerzo' },
  Oposicion:  { plural: 'enfrenta', texto: 'una polaridad que pide equilibrio consciente' },
  Quincuncio: { plural: 'ajusta',   texto: 'un aprendizaje que requiere adaptación constante' }
};

const PLANETA_ES = {
  Sun: 'el Sol', Moon: 'la Luna', Mercury: 'Mercurio', Venus: 'Venus', Mars: 'Marte',
  Jupiter: 'Júpiter', Saturn: 'Saturno', Uranus: 'Urano', Neptune: 'Neptuno',
  Pluto: 'Plutón', NNode: 'el Nodo Norte', Chiron: 'Quirón'
};

function pickAspectSentence(chart) {
  // Elige el aspecto más relevante (menor orbe) entre planetas personales,
  // ignorando los que ya involucran Sol/Luna/Asc para no repetir lo dicho antes.
  const personales = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const candidatos = (chart.aspects || [])
    .filter(a => personales.includes(a.p1) && personales.includes(a.p2))
    .sort((a, b) => a.orb - b.orb);
  if (!candidatos.length) return '';
  const a = candidatos[0];
  const def = ASPECTOS[a.name] || { plural: 'conecta', texto: 'una dinámica particular' };
  const p1 = PLANETA_ES[a.p1] || a.p1;
  const p2 = PLANETA_ES[a.p2] || a.p2;
  return `En su carta, ${p1} ${def.plural} con ${p2}, mostrando ${def.texto}.`;
}

function buildInterpretation(nombre, chart) {
  const quien = nombre ? nombre : 'Esta persona';
  const p = chart.planets || {};
  const solSign = p.Sun?.sign;
  const lunaSign = p.Moon?.sign;
  const ascSign = chart.asc?.sign;

  const frases = [];

  if (solSign && SOL[solSign]) {
    frases.push(`${quien} nace con el Sol en ${solSign}, lo que le da ${SOL[solSign]}.`);
  }
  if (lunaSign && LUNA[lunaSign]) {
    const pron = nombre ? 'su Luna en ' + lunaSign : 'la Luna en ' + lunaSign;
    frases.push(`Con ${pron}, en el plano emocional ${LUNA[lunaSign]}.`);
  }
  if (ascSign && ASC[ascSign]) {
    frases.push(`Su Ascendente en ${ascSign} hace que ${ASC[ascSign]}.`);
  }

  return frases.join(' ');
}

module.exports = { buildInterpretation };
