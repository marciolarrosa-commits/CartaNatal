/**
 * calc_chart.js
 * Motor de calculo astronomico en Node.js puro
 * Usa el paquete 'ephemeris' (Moshier) - sin Python, sin compilacion
 */

'use strict';

const eph = require('ephemeris');

// ── Constants ─────────────────────────────────────────────────────────────────
const SIGNS  = ['Aries','Tauro','Geminis','Cancer','Leo','Virgo',
                'Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];
const GLYPHS = ['\u2648','\u2649','\u264a','\u264b','\u264c','\u264d',
                '\u264e','\u264f','\u2650','\u2651','\u2652','\u2653'];

const PLANET_MAP = [
  { key: 'Sun',     name: 'Sol',      sym: '\u2609', body: 'sun'     },
  { key: 'Moon',    name: 'Luna',     sym: '\u263d', body: 'moon'    },
  { key: 'Mercury', name: 'Mercurio', sym: '\u263f', body: 'mercury' },
  { key: 'Venus',   name: 'Venus',    sym: '\u2640', body: 'venus'   },
  { key: 'Mars',    name: 'Marte',    sym: '\u2642', body: 'mars'    },
  { key: 'Jupiter', name: 'Jupiter',  sym: '\u2643', body: 'jupiter' },
  { key: 'Saturn',  name: 'Saturno',  sym: '\u2644', body: 'saturn'  },
  { key: 'Uranus',  name: 'Urano',    sym: '\u2645', body: 'uranus'  },
  { key: 'Neptune', name: 'Neptuno',  sym: '\u2646', body: 'neptune' },
  { key: 'Pluto',   name: 'Pluton',   sym: '\u2647', body: 'pluto'   },
  { key: 'NNode',   name: 'Nodo Norte', sym: '\u260a', body: 'nnode'  },
  { key: 'Chiron',  name: 'Quiron',   sym: '\u26b7', body: 'chiron'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDms(lonDeg) {
  const si   = Math.floor(lonDeg / 30) % 12;
  const din  = lonDeg % 30;
  const d    = Math.floor(din);
  const m    = Math.floor((din - d) * 60);
  const s    = Math.floor(((din - d) * 60 - m) * 60);
  return {
    lon: Math.round(lonDeg * 1e6) / 1e6,
    sign_idx: si,
    sign: SIGNS[si],
    glyph: GLYPHS[si],
    deg: d, min: m, sec: s,
    deg_decimal: Math.round(din * 1e6) / 1e6
  };
}

function getObliquity(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.439291111 - 0.013004167*T - 0.000000164*T*T + 0.000000504*T*T*T;
}

// ── North Node (True Node) ───────────────────────────────────────────────────
function calcNNode(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  // Mean node
  let omega = 125.04452 - 1934.136261*T + 0.0020708*T*T + T*T*T/450000;
  // True node corrections
  const M  = (357.52911 + 35999.05029*T) * Math.PI/180;
  const Mp = (134.96298 + 477198.867398*T) * Math.PI/180;
  const D  = (297.85036 + 445267.111480*T) * Math.PI/180;
  const F  = (93.27191  + 483202.017538*T) * Math.PI/180;
  omega += -1.4979*Math.sin(2*(F - omega*Math.PI/180))
           - 0.1500*Math.sin(M) - 0.1226*Math.sin(2*F)
           + 0.1176*Math.sin(2*(F - Mp));
  return ((omega % 360) + 360) % 360;
}

// ── ASC / MC ──────────────────────────────────────────────────────────────────
function calcAngles(utcDate, latDeg, lonDeg) {
  // Local Sidereal Time via GAST approximation
  const jd = julianDay(
    utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours() + utcDate.getUTCMinutes()/60 + utcDate.getUTCSeconds()/3600
  );

  // GAST (Greenwich Apparent Sidereal Time) in degrees
  const T   = (jd - 2451545.0) / 36525.0;
  let gast  = 280.46061837 + 360.98564736629*(jd - 2451545.0) +
               0.000387933*T*T - T*T*T/38710000;
  gast      = ((gast % 360) + 360) % 360;
  const lst = ((gast + lonDeg) % 360 + 360) % 360; // Local Sidereal Time

  const eps    = getObliquity(jd);
  const epsR   = eps * Math.PI / 180;
  const latR   = latDeg * Math.PI / 180;
  const ramcR  = lst * Math.PI / 180;

  // MC
  let mc = Math.atan2(Math.sin(ramcR), Math.cos(ramcR) * Math.cos(epsR)) * 180/Math.PI;
  mc     = ((mc % 360) + 360) % 360;

  // ASC
  const ta  = -Math.cos(ramcR) / (Math.sin(epsR)*Math.tan(latR) + Math.cos(epsR)*Math.sin(ramcR));
  let asc   = Math.atan(ta) * 180/Math.PI;
  if      (lst <  90) asc += 180;
  else if (lst < 180) asc += 180;
  else if (lst < 270) asc += 360;
  asc = ((asc % 360) + 360) % 360;

  return { asc, mc, lst, jd, epsR, latR };
}

// ── Julian Day ────────────────────────────────────────────────────────────────
function julianDay(year, month, day, hourUT) {
  if (month <= 2) { year--; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25*(year+4716)) + Math.floor(30.6001*(month+1)) +
         day + hourUT/24 + B - 1524.5;
}

// ── Placidus house cusps ───────────────────────────────────────────────────────
function raToEcl(raDeg, epsR) {
  const r = raDeg * Math.PI/180;
  return ((Math.atan2(Math.sin(r), Math.cos(r)*Math.cos(epsR)) * 180/Math.PI) + 360) % 360;
}

function eclToRaDec(lonDeg, epsR) {
  const r   = lonDeg * Math.PI/180;
  const ra  = Math.atan2(Math.sin(r)*Math.cos(epsR), Math.cos(r)) * 180/Math.PI;
  const dec = Math.asin(Math.sin(epsR)*Math.sin(r)) * 180/Math.PI;
  return { ra: ((ra % 360)+360) % 360, dec };
}

function placidus(frac, ramcBase, epsR, latR, guess, subtract) {
  let c = guess;
  for (let i = 0; i < 300; i++) {
    const { ra, dec } = eclToRaDec(c, epsR);
    let ad = 0;
    const tanD = Math.tan(dec * Math.PI/180) * Math.tan(latR);
    if (Math.abs(tanD) <= 1) ad = Math.asin(tanD) * 180/Math.PI;
    const semiArc = 90 + (subtract ? -ad : ad); // NSA vs DSA
    const nr = subtract
      ? ((ramcBase - frac * semiArc) % 360 + 360) % 360
      : ((ramcBase + frac * semiArc) % 360 + 360) % 360;
    const nc   = raToEcl(nr, epsR);
    let diff   = ((nc - c + 180) % 360) - 180;
    if (Math.abs(diff) < 0.00001) break;
    c = ((c + diff * 0.5) % 360 + 360) % 360;
  }
  return c;
}

function calcPlacidus(asc, mc, lst, epsR, latR) {
  const ic     = (mc + 180) % 360;
  const lstIC  = lst + 180;
  const h11    = placidus(1/3, lst,  epsR, latR, (mc+22)%360,  false);
  const h12    = placidus(2/3, lst,  epsR, latR, (mc+44)%360,  false);
  const h2     = placidus(2/3, lstIC, epsR, latR, (ic+22)%360, true);
  const h3     = placidus(1/3, lstIC, epsR, latR, (ic+44)%360, true);
  return {
    1: asc, 2: h2,  3: h3,  4: ic,
    5: (h11+180)%360, 6: (h12+180)%360, 7: (asc+180)%360,
    8: (h2+180)%360,  9: (h3+180)%360,  10: mc,
    11: h11, 12: h12
  };
}

function calcEqualHouses(asc) {
  const c = {};
  for (let h = 1; h <= 12; h++) c[h] = (asc + (h-1)*30) % 360;
  return c;
}

function houseOf(lon, cusps) {
  for (let i = 1; i <= 12; i++) {
    const c1 = cusps[i];
    const c2 = cusps[i === 12 ? 1 : i+1];
    if (c2 < c1) { if (lon >= c1 || lon < c2) return i; }
    else          { if (lon >= c1 && lon < c2) return i; }
  }
  return 1;
}

// ── Aspects ───────────────────────────────────────────────────────────────────
const ASPECT_DEFS = [
  { name:'Conjuncion', angle:0,   orb:10, sym:'\u260c', color:'#b060c0' },
  { name:'Sextil',     angle:60,  orb:6,  sym:'\u26b9', color:'#5090d0' },
  { name:'Cuadratura', angle:90,  orb:8,  sym:'\u25a1', color:'#d04040' },
  { name:'Trigono',    angle:120, orb:9,  sym:'\u25b3', color:'#4070d0' },
  { name:'Quincuncio', angle:150, orb:4,  sym:'\u26bb', color:'#c09040' },
  { name:'Oposicion',  angle:180, orb:9,  sym:'\u260d', color:'#d04040' },
];

function calcAspects(planets) {
  const keys    = Object.keys(planets);
  const aspects = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i+1; j < keys.length; j++) {
      let diff = Math.abs(planets[keys[i]].lon - planets[keys[j]].lon);
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECT_DEFS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({ p1:keys[i], p2:keys[j], name:asp.name,
            angle:asp.angle, orb:Math.round(orb*100)/100,
            sym:asp.sym, color:asp.color, applying:true });
          break;
        }
      }
    }
  }
  return aspects.sort((a,b) => a.orb - b.orb);
}

// ── Moon phase ────────────────────────────────────────────────────────────────
function moonPhase(sunLon, moonLon) {
  const angle = ((moonLon - sunLon) % 360 + 360) % 360;
  const illum = Math.round((1 - Math.cos(angle * Math.PI/180)) / 2 * 100);
  const age   = Math.round(angle / 12.19 * 10) / 10;
  let phase;
  if      (angle <  45) phase = 'Luna Nueva';
  else if (angle <  90) phase = 'Cuarto Creciente';
  else if (angle < 135) phase = 'Gibosa Creciente';
  else if (angle < 180) phase = 'Luna Llena';
  else if (angle < 225) phase = 'Gibosa Menguante';
  else if (angle < 270) phase = 'Cuarto Menguante';
  else                  phase = 'Menguante Balsamica';
  return { phase, illumination: illum, age, angle: Math.round(angle*100)/100 };
}

// ── Summary ───────────────────────────────────────────────────────────────────
function calcSummary(planets) {
  const ELEM = [0,1,2,3,0,1,2,3,0,1,2,3];
  const MOD  = [0,1,2,0,1,2,0,1,2,0,1,2];
  const elems = [0,0,0,0]; const mods = [0,0,0];
  let masc = 0; let fem = 0;
  Object.values(planets).forEach(p => {
    const si = p.sign_idx;
    elems[ELEM[si]]++; mods[MOD[si]]++;
    [0,2,4,6,8,10].includes(si) ? masc++ : fem++;
  });
  return {
    elements:   { fire:elems[0], earth:elems[1], air:elems[2], water:elems[3] },
    modalities: { cardinal:mods[0], fixed:mods[1], mutable:mods[2] },
    polarity:   { masculine:masc, feminine:fem }
  };
}

// ── Main export ───────────────────────────────────────────────────────────────
function calcChart(utcDate, latDeg, lonDeg, hsys = 'P') {
  // 1. Ephemeris planets
  const raw     = eph.getAllPlanets(utcDate, 0, 0, 0);
  const obs     = raw.observed;
  const planets = {};

  // Add North Node (compute JD from utcDate first)
  const _jdForNode = julianDay(utcDate.getUTCFullYear(), utcDate.getUTCMonth()+1, utcDate.getUTCDate(),
    utcDate.getUTCHours() + utcDate.getUTCMinutes()/60 + utcDate.getUTCSeconds()/3600);
  const nnodeLon = calcNNode(_jdForNode);
  const nnodeInfo = fmtDms(nnodeLon);
  nnodeInfo.key = 'NNode'; nnodeInfo.name = 'Nodo Norte';
  nnodeInfo.symbol = '☊'; nnodeInfo.retrograde = true; // Nodes are always retrograde
  planets['NNode'] = nnodeInfo;

  PLANET_MAP.forEach(({ key, name, sym, body }) => {
    if (key === 'NNode') return; // already added
    const p = obs[body];
    if (!p || p.apparentLongitudeDd == null) return;
    const lon  = ((p.apparentLongitudeDd % 360) + 360) % 360;
    const info = fmtDms(lon);
    info.key         = key;
    info.name        = name;
    info.symbol      = sym;
    info.retrograde  = !!p.is_retrograde;
    planets[key]     = info;
  });

  // 2. Angles (ASC, MC)
  const { asc, mc, lst, jd, epsR, latR } = calcAngles(utcDate, latDeg, lonDeg);

  // 3. House cusps
  const cusps  = hsys === 'E'
    ? calcEqualHouses(asc)
    : calcPlacidus(asc, mc, lst, epsR, latR);

  // 4. Assign house to each planet
  Object.values(planets).forEach(p => { p.house = houseOf(p.lon, cusps); });

  // 5. House list
  const houses = [];
  for (let h = 1; h <= 12; h++) {
    const info = fmtDms(cusps[h]); info.house = h; houses.push(info);
  }

  const ascFmt = fmtDms(asc); ascFmt.house = 1;
  const mcFmt  = fmtDms(mc);  mcFmt.house  = 10;

  // 6. Aspects, moon phase, summary
  const aspects   = calcAspects(planets);
  const mp        = moonPhase(planets.Sun?.lon ?? 0, planets.Moon?.lon ?? 0);
  const summary   = calcSummary(planets);

  return {
    planets,
    houses,
    asc:        ascFmt,
    mc:         mcFmt,
    aspects,
    moon_phase: mp,
    summary,
    house_system: hsys,
    engine:     'ephemeris (Moshier) + Placidus'
  };
}

module.exports = { calcChart };
