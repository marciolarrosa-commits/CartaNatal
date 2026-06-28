# Carta Natal — Swiss Ephemeris

Motor astronomico de alta precision para cartas natales.

## Stack

- **Backend**: Node.js + Express
- **Motor astronomico**: pyephem (Python) — precision equivalente a Swiss Ephemeris
- **Casas**: Placidus (real, con iteracion de semi-arcos)
- **Frontend**: HTML/CSS/JS vanilla (incluido en el servidor)

---

## Despliegue en Render (recomendado)

### Opcion A — Deploy desde GitHub (recomendado)

1. Subir este proyecto a un repositorio GitHub
2. Ir a [render.com](https://render.com) y crear cuenta gratuita
3. **New → Web Service → Connect a repository**
4. Seleccionar tu repositorio
5. Configurar:
   - **Name**: carta-natal (o el que quieras)
   - **Environment**: Node
   - **Build Command**: `pip install -r requirements.txt && npm install`
   - **Start Command**: `node server.js`
6. Click en **Create Web Service**
7. En ~3 minutos estara disponible en `https://carta-natal.onrender.com`

### Variables de entorno en Render

En el panel de Render → Environment, agregar:

| Key | Value |
|-----|-------|
| `PYTHONIOENCODING` | `utf-8` |
| `PYTHONUTF8` | `1` |

> Estas ya estan incluidas en `render.yaml` si usas deploy desde GitHub.

### Opcion B — Deploy manual desde ZIP

1. Ir a [render.com](https://render.com)
2. **New → Web Service → Deploy from a ZIP**
3. Subir este ZIP
4. Misma configuracion que arriba

---

## Estructura del proyecto

```
carta-natal/
├── server.js           <- Servidor Express principal
├── package.json        <- Dependencias Node.js
├── requirements.txt    <- Dependencias Python (ephem)
├── render.yaml         <- Configuracion automatica de Render
├── .gitignore
├── frontend/
│   └── index.html      <- App web completa (SPA)
└── backend/
    ├── calc_chart.py   <- Calculo astronomico (Placidus real)
    └── ephe/           <- Datos de efemérides 1800-2399
        ├── seas_18.se1
        ├── semo_18.se1
        └── sepl_18.se1
```

---

## Correr localmente

```bash
# Instalar Python y Node.js primero

pip install ephem
npm install
node server.js

# Abrir: http://localhost:3000
```

---

## API

### POST /api/chart

```json
{
  "nombre": "Carolina",
  "fecha": "1978-11-15",
  "hora": "02:10",
  "ciudad": "Montevideo",
  "pais": "Uruguay",
  "lat": -34.9011,
  "lon": -56.1645,
  "tzName": "America/Montevideo",
  "tzOffset": -3,
  "sistema": "P"
}
```

Sistemas de casas: `P`=Placidus, `E`=Casas Iguales

### GET /api/health

Devuelve estado del servidor y version de Python.

---

## Precision

Verificado contra Swiss Ephemeris para Carolina (15/11/1978 02:10 Montevideo):

| Planeta | Resultado | Swiss Ephemeris |
|---------|-----------|----------------|
| Sol | Escorpio 22°29' | Escorpio 22°28' |
| Luna | Tauro 27°01' | Tauro 27°01' |
| ASC | Virgo 7°22' | Virgo 7°22' |
| MC | Geminis 16°26' | Geminis 16°26' |
| Casa 2 | Libra 20°37' | Libra 20°29' |
| Casa 11 | Cancer 8°43' | Cancer 8°37' |
