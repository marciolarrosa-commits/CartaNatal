'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { calcChart } = require('./backend/calc_chart');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

function localToUTC(year, month, day, hh, mm, tzOffset) {
  const offsetMs = tzOffset * 3600000;
  return new Date(Date.UTC(year, month - 1, day, hh, mm, 0) - offsetMs);
}

app.post('/api/chart', (req, res) => {
  try {
    const { nombre, fecha, hora, ciudad, pais,
            lat, lon, tzName, tzOffset, sistema } = req.body;

    if (!fecha || !hora || lat == null || lon == null)
      return res.status(400).json({ error: 'Faltan: fecha, hora, lat, lon' });

    const [year, month, day] = fecha.split('-').map(Number);
    const [hh, mm]           = hora.split(':').map(Number);
    const utcDate            = localToUTC(year, month, day, hh, mm, tzOffset || 0);
    const chart              = calcChart(utcDate, lat, lon, sistema || 'P');

    res.json({
      ok: true,
      meta: { nombre, fecha, hora, ciudad, pais, lat, lon, tzName, tzOffset,
              utcDate: utcDate.toISOString(), house_system: sistema || 'P' },
      chart
    });
  } catch (err) {
    console.error('[/api/chart]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, engine: 'ephemeris Moshier + Placidus (Pure Node.js)', node: process.version });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('[carta-natal] http://localhost:' + PORT + ' — Pure Node.js'));
