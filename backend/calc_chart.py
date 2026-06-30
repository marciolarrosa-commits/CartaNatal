#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Carta Natal Calculator - pyephem (puro Python, sin compilacion)
Llamado por Node.js: python calc_chart.py <jd_ut> <lat> <lon> <house_system>
"""
import sys, json, math
import ephem

# Force UTF-8 output on Windows (avoids cp1252 UnicodeEncodeError)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SIGNS = ['Aries','Tauro','Geminis','Cancer','Leo','Virgo',
         'Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis']
GLYPHS = ['\u2648','\u2649','\u264a','\u264b','\u264c','\u264d',
          '\u264e','\u264f','\u2650','\u2651','\u2652','\u2653']

PLANETS = [
    ('Sun',     'Sol',       '\u2609', ephem.Sun),
    ('Moon',    'Luna',      '\u263d', ephem.Moon),
    ('Mercury', 'Mercurio',  '\u263f', ephem.Mercury),
    ('Venus',   'Venus',     '\u2640', ephem.Venus),
    ('Mars',    'Marte',     '\u2642', ephem.Mars),
    ('Jupiter', 'Jupiter',   '\u2643', ephem.Jupiter),
    ('Saturn',  'Saturno',   '\u2644', ephem.Saturn),
    ('Uranus',  'Urano',     '\u2645', ephem.Uranus),
    ('Neptune', 'Neptuno',   '\u2646', ephem.Neptune),
    ('Pluto',   'Pluton',    '\u2647', ephem.Pluto),
]

def get_obliquity(jd):
    T = (jd - 2451545.0) / 36525.0
    return 23.439291111 - 0.013004167*T - 0.000000164*T*T + 0.000000504*T*T*T

def ecliptic_lon(body_obj, date_ephem):
    body_obj.compute(date_ephem, epoch=date_ephem)
    ecl = ephem.Ecliptic(body_obj, epoch=date_ephem)
    return math.degrees(ecl.lon) % 360

def get_speed(body_class, date_ephem):
    b1 = body_class(); b1.compute(date_ephem - 0.5, epoch=date_ephem)
    b2 = body_class(); b2.compute(date_ephem + 0.5, epoch=date_ephem)
    e1 = ephem.Ecliptic(b1, epoch=date_ephem)
    e2 = ephem.Ecliptic(b2, epoch=date_ephem)
    diff = (math.degrees(e2.lon) - math.degrees(e1.lon)) % 360
    if diff > 180: diff -= 360
    return diff

def fmt_dms(lon_deg):
    si = int(lon_deg / 30) % 12
    d_in = lon_deg % 30
    d = int(d_in); m = int((d_in - d) * 60); s = int(((d_in - d) * 60 - m) * 60)
    return {'lon': round(lon_deg, 6), 'sign_idx': si, 'sign': SIGNS[si],
            'glyph': GLYPHS[si], 'deg': d, 'min': m, 'sec': s,
            'deg_decimal': round(d_in, 6)}

def ra_to_ecl(ra_deg, eps_r):
    ra_r = math.radians(ra_deg)
    return math.degrees(math.atan2(math.sin(ra_r), math.cos(ra_r) * math.cos(eps_r))) % 360

def ecl_to_ra_dec(lon_deg, eps_r):
    lon_r = math.radians(lon_deg)
    ra = math.atan2(math.sin(lon_r) * math.cos(eps_r), math.cos(lon_r))
    dec = math.asin(math.sin(eps_r) * math.sin(lon_r))
    return math.degrees(ra) % 360, math.degrees(dec)

def calc_angles(ephem_date, lat_deg, lon_deg, eps_r):
    obs = ephem.Observer()
    obs.lat = str(lat_deg); obs.lon = str(lon_deg)
    obs.date = ephem_date; obs.pressure = 0
    ramc = math.degrees(obs.sidereal_time()) % 360
    lat_r = math.radians(lat_deg)
    L = math.radians(ramc)
    # MC
    mc = math.degrees(math.atan2(math.sin(L), math.cos(L) * math.cos(eps_r))) % 360
    # ASC
    ta = -math.cos(L) / (math.sin(eps_r) * math.tan(lat_r) + math.cos(eps_r) * math.sin(L))
    asc = math.degrees(math.atan(ta))
    if ramc < 90:   asc += 180
    elif ramc < 180: asc += 180
    elif ramc < 270: asc += 360
    asc = asc % 360
    return asc, mc, ramc, lat_r

def placidus_diurnal(frac, ramc, eps_r, lat_r, guess):
    """Houses 11 (1/3), 12 (2/3) — above horizon"""
    c = guess
    for _ in range(300):
        ra, dec = ecl_to_ra_dec(c, eps_r)
        try: ad = math.degrees(math.asin(math.tan(math.radians(dec)) * math.tan(lat_r)))
        except: ad = 0.0
        nr = (ramc + frac * (90 + ad)) % 360
        nc = ra_to_ecl(nr, eps_r)
        df = (nc - c + 180) % 360 - 180
        if abs(df) < 0.00001: break
        c = (c + df * 0.5) % 360
    return c

def placidus_nocturnal(frac, ramc_ic, eps_r, lat_r, guess):
    """Houses 2 (2/3), 3 (1/3) — below horizon"""
    c = guess
    for _ in range(300):
        ra, dec = ecl_to_ra_dec(c, eps_r)
        try: ad = math.degrees(math.asin(math.tan(math.radians(dec)) * math.tan(lat_r)))
        except: ad = 0.0
        nr = (ramc_ic - frac * (90 - ad)) % 360
        nc = ra_to_ecl(nr, eps_r)
        df = (nc - c + 180) % 360 - 180
        if abs(df) < 0.00001: break
        c = (c + df * 0.5) % 360
    return c

def calc_placidus_houses(asc, mc, ramc, lat_r, eps_r):
    ic = (mc + 180) % 360
    ramc_ic = ramc + 180
    h11 = placidus_diurnal(1/3, ramc, eps_r, lat_r, (mc + 22) % 360)
    h12 = placidus_diurnal(2/3, ramc, eps_r, lat_r, (mc + 44) % 360)
    h2  = placidus_nocturnal(2/3, ramc_ic, eps_r, lat_r, (ic + 22) % 360)
    h3  = placidus_nocturnal(1/3, ramc_ic, eps_r, lat_r, (ic + 44) % 360)
    cusps = {
        1: asc, 2: h2,  3: h3,  4: ic,
        5: (h11+180)%360, 6: (h12+180)%360, 7: (asc+180)%360,
        8: (h2+180)%360,  9: (h3+180)%360, 10: mc,
        11: h11, 12: h12
    }
    return cusps

def calc_equal_houses(asc):
    return {h: (asc + (h-1)*30) % 360 for h in range(1,13)}

def house_of(lon, cusps):
    for i in range(1, 13):
        c1 = cusps[i]; c2 = cusps[i % 12 + 1]
        if c2 < c1:
            if lon >= c1 or lon < c2: return i
        else:
            if c1 <= lon < c2: return i
    return 1

def calc_aspects(planets_data):
    ASPECTS = [
        {'name':'Conjuncion', 'angle':0,   'orb':10,'sym':'\u260c','color':'#b060c0'},
        {'name':'Sextil',     'angle':60,  'orb':6, 'sym':'\u26b9','color':'#5090d0'},
        {'name':'Cuadratura', 'angle':90,  'orb':8, 'sym':'\u25a1','color':'#d04040'},
        {'name':'Trigono',    'angle':120, 'orb':9, 'sym':'\u25b3','color':'#4070d0'},
        {'name':'Quincuncio', 'angle':150, 'orb':4, 'sym':'\u26bb','color':'#c09040'},
        {'name':'Oposicion',  'angle':180, 'orb':9, 'sym':'\u260d','color':'#d04040'},
    ]
    keys = list(planets_data.keys())
    aspects = []
    for i in range(len(keys)):
        for j in range(i+1, len(keys)):
            diff = abs(planets_data[keys[i]]['lon'] - planets_data[keys[j]]['lon'])
            if diff > 180: diff = 360 - diff
            for asp in ASPECTS:
                orb = abs(diff - asp['angle'])
                if orb <= asp['orb']:
                    aspects.append({'p1':keys[i],'p2':keys[j],'name':asp['name'],
                        'angle':asp['angle'],'orb':round(orb,2),'sym':asp['sym'],
                        'color':asp['color'],'applying':True})
                    break
    aspects.sort(key=lambda x: x['orb'])
    return aspects

def moon_phase(ephem_date, eps_r):
    sun = ephem.Sun(ephem_date); moon = ephem.Moon(ephem_date)
    ecl_s = ephem.Ecliptic(sun,  epoch=ephem_date)
    ecl_m = ephem.Ecliptic(moon, epoch=ephem_date)
    angle = (math.degrees(ecl_m.lon) - math.degrees(ecl_s.lon)) % 360
    illum = round((1 - math.cos(math.radians(angle))) / 2 * 100)
    age   = round(angle / 12.19, 1)
    if angle < 45:    phase = 'Luna Nueva'
    elif angle < 90:  phase = 'Cuarto Creciente'
    elif angle < 135: phase = 'Gibosa Creciente'
    elif angle < 180: phase = 'Luna Llena'
    elif angle < 225: phase = 'Gibosa Menguante'
    elif angle < 270: phase = 'Cuarto Menguante'
    else:             phase = 'Menguante Balsamica'
    return {'phase':phase,'illumination':illum,'age':age,'angle':round(angle,2)}

def summary(planets_data):
    ELEM = [0,1,2,3,0,1,2,3,0,1,2,3]; MOD = [0,1,2,0,1,2,0,1,2,0,1,2]
    elems=[0,0,0,0]; mods=[0,0,0]; masc=fem=0
    for v in planets_data.values():
        si=v['sign_idx']; elems[ELEM[si]]+=1; mods[MOD[si]]+=1
        if si in (0,2,4,6,8,10): masc+=1
        else: fem+=1
    return {'elements':{'fire':elems[0],'earth':elems[1],'air':elems[2],'water':elems[3]},
            'modalities':{'cardinal':mods[0],'fixed':mods[1],'mutable':mods[2]},
            'polarity':{'masculine':masc,'feminine':fem}}

def main():
    args = sys.argv[1:]
    if len(args) < 3:
        print(json.dumps({'error':'Need jd_ut lat lon'})); sys.exit(1)

    jd_ut = float(args[0]); lat = float(args[1]); lon = float(args[2])
    hsys  = args[3] if len(args) > 3 else 'P'

    # ephem Date from Julian Day
    ephem_date = ephem.Date(jd_ut - 2415020.0)
    jd = ephem.julian_date(ephem_date)
    eps_r = math.radians(get_obliquity(jd))

    # Planets
    planets_data = {}
    for key, name, sym, body_class in PLANETS:
        try:
            body_obj = body_class()
            lon_deg  = ecliptic_lon(body_obj, ephem_date)
            speed    = get_speed(body_class, ephem_date)
            info = fmt_dms(lon_deg)
            info.update({'key':key,'name':name,'symbol':sym,
                         'retrograde':speed<0,'speed':round(speed,6)})
            planets_data[key] = info
        except Exception:
            pass

    # Angles
    asc, mc, ramc, lat_r = calc_angles(ephem_date, lat, lon, eps_r)

    # Houses
    if hsys == 'E':
        cusps_dict = calc_equal_houses(asc)
    else:
        # Placidus for all other systems (P, K, etc.)
        cusps_dict = calc_placidus_houses(asc, mc, ramc, lat_r, eps_r)

    # Assign house to each planet
    for pdata in planets_data.values():
        pdata['house'] = house_of(pdata['lon'], cusps_dict)

    # Build house list
    houses = []
    for h in range(1, 13):
        info = fmt_dms(cusps_dict[h]); info['house'] = h
        houses.append(info)

    asc_fmt = fmt_dms(asc); asc_fmt['house'] = 1
    mc_fmt  = fmt_dms(mc);  mc_fmt['house']  = 10

    result = {
        'planets':    planets_data,
        'houses':     houses,
        'asc':        asc_fmt,
        'mc':         mc_fmt,
        'aspects':    calc_aspects(planets_data),
        'moon_phase': moon_phase(ephem_date, eps_r),
        'summary':    summary(planets_data),
        'jd_ut':      jd_ut,
        'house_system': hsys,
        'engine':     'pyephem 4.2 + Placidus'
    }
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
