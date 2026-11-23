"""식물 종류별 일러스트 생성기.

Figma의 홈 식물(몬스테라 자리) 그림과 같은 스타일로 그린다.
- 잎 4톤: #3E6B34 · #5A8F4A · #7FB264 · #A6CF7E, 잎맥 #C9E2B0, 줄기 #557B3F
- 전체 drop shadow + 잎마다 위쪽 흰 하이라이트(inner shadow)
- 캔버스 197.8 × 206.4, 흙에 닿는 지점 (98.9, 204.7)

실행: python3 tools/gen_plants.py  →  assets/plant-<종류>.svg
"""
import math
import os
import random

W, H = 197.8, 206.4
BX, BY = 98.9, 204.7
DARK, MID, LIGHT, PALE = '#3E6B34', '#5A8F4A', '#7FB264', '#A6CF7E'
VEIN, STEM = '#C9E2B0', '#557B3F'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')


def f(v):
    return f'{v:.1f}'


def P(p):
    return f'{f(p[0])} {f(p[1])}'


def svg(body):
    return f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none" overflow="visible" xmlns="http://www.w3.org/2000/svg">
<defs>
<filter id="ds" filterUnits="userSpaceOnUse" x="-30" y="-30" width="{W + 60}" height="{H + 60}" color-interpolation-filters="sRGB">
<feDropShadow dx="0" dy="5.2" stdDeviation="4.3" flood-color="#2E4A26" flood-opacity="0.18"/>
</filter>
<filter id="hi" filterUnits="userSpaceOnUse" x="-20" y="-20" width="{W + 40}" height="{H + 40}" color-interpolation-filters="sRGB">
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="a"/>
<feOffset dy="1.7"/><feGaussianBlur stdDeviation="1.3"/>
<feComposite in2="a" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.22 0"/>
<feBlend mode="normal" in2="SourceGraphic"/>
</filter>
</defs>
<g filter="url(#ds)">
{body}
</g>
</svg>
'''


def frame(b, t):
    dx, dy = t[0] - b[0], t[1] - b[1]
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    return L, (ux, uy), (-uy, ux)


def leaf(b, t, w, color, curve=0.0, veins=True, side_veins=3):
    """기준점 b에서 끝점 t로 향하는 둥근 잎. curve로 옆으로 휨."""
    L, u, n = frame(b, t)

    def at(s, o):
        off = o + curve * math.sin(math.pi * s) * L
        return (b[0] + u[0] * L * s + n[0] * off, b[1] + u[1] * L * s + n[1] * off)

    tip = at(1, 0)
    d = (f'M{P(b)} C{P(at(0.04, w * 0.56))} {P(at(0.58, w * 0.64))} {P(tip)} '
         f'C{P(at(0.58, -w * 0.64))} {P(at(0.04, -w * 0.56))} {P(b)}Z')
    out = f'<path d="{d}" fill="{color}" filter="url(#hi)"/>'
    if veins:
        v = f'M{P(at(0.04, 0))} Q{P(at(0.5, 0))} {P(at(0.9, 0))}'
        for i in range(side_veins):
            s = 0.28 + i * (0.5 / max(1, side_veins - 1))
            v += f' M{P(at(s, 0))} L{P(at(s + 0.13, w * 0.3))} M{P(at(s, 0))} L{P(at(s + 0.13, -w * 0.3))}'
        out += f'<path d="{v}" stroke="{VEIN}" stroke-width="0.86" stroke-linecap="round"/>'
    return out


def bez(p0, p1, p2, p3, s):
    m = 1 - s
    return (m ** 3 * p0[0] + 3 * m * m * s * p1[0] + 3 * m * s * s * p2[0] + s ** 3 * p3[0],
            m ** 3 * p0[1] + 3 * m * m * s * p1[1] + 3 * m * s * s * p2[1] + s ** 3 * p3[1])


def bez_tan(p0, p1, p2, p3, s):
    a = bez(p0, p1, p2, p3, max(0, s - 0.01))
    c = bez(p0, p1, p2, p3, min(1, s + 0.01))
    L = math.hypot(c[0] - a[0], c[1] - a[1]) or 1
    return ((c[0] - a[0]) / L, (c[1] - a[1]) / L)


def rot(v, deg):
    r = math.radians(deg)
    return (v[0] * math.cos(r) - v[1] * math.sin(r), v[0] * math.sin(r) + v[1] * math.cos(r))


# ---------------- 스투키: 원통형 잎이 부채처럼 솟음 ----------------
def stuckyi():
    random.seed(3)
    spears = [(-34, 128, MID), (-20, 160, DARK), (-8, 176, LIGHT), (4, 182, MID), (15, 168, DARK), (27, 150, LIGHT), (40, 122, MID)]
    body = ''
    for ang, length, col in spears:
        a = math.radians(ang)
        b = (BX + ang * 0.22, BY)
        t = (b[0] + math.sin(a) * length, b[1] - math.cos(a) * length)
        L, u, n = frame(b, t)
        w0, w1 = 15, 7
        left, right = [], []
        for i in range(13):
            s = i / 12 * 0.94
            w = w0 + (w1 - w0) * s ** 1.4
            c = (b[0] + u[0] * L * s, b[1] + u[1] * L * s)
            left.append((c[0] + n[0] * w / 2, c[1] + n[1] * w / 2))
            right.append((c[0] - n[0] * w / 2, c[1] - n[1] * w / 2))
        d = 'M' + ' L'.join(P(p) for p in left)
        d += f' Q{P(t)} {P(right[-1])} L' + ' L'.join(P(p) for p in reversed(right)) + 'Z'
        body += f'<path d="{d}" fill="{col}" filter="url(#hi)"/>'
        # 가로 줄무늬
        bands = ''
        for k in range(2, 11, 2):
            s = k / 12 * 0.94
            w = (w0 + (w1 - w0) * s ** 1.4) * 0.42
            c = (b[0] + u[0] * L * s, b[1] + u[1] * L * s)
            p1 = (c[0] + n[0] * w, c[1] + n[1] * w)
            p2 = (c[0] - n[0] * w, c[1] - n[1] * w)
            q = (c[0] - u[0] * 2.4, c[1] - u[1] * 2.4)
            bands += f' M{P(p1)} Q{P(q)} {P(p2)}'
        body += f'<path d="{bands}" stroke="{PALE}" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round"/>'
        # 세로 하이라이트
        hl0 = (b[0] + u[0] * L * 0.08 + n[0] * w0 * 0.22, b[1] + u[1] * L * 0.08 + n[1] * w0 * 0.22)
        hl1 = (b[0] + u[0] * L * 0.86 + n[0] * w1 * 0.2, b[1] + u[1] * L * 0.86 + n[1] * w1 * 0.2)
        body += f'<path d="M{P(hl0)} L{P(hl1)}" stroke="{VEIN}" stroke-opacity="0.6" stroke-width="0.9" stroke-linecap="round"/>'
    return svg(body)


# ---------------- 금전수: 휘어진 줄기에 윤기 나는 작은 잎이 마주 남 ----------------
def zz():
    stems = [
        ((BX, BY), (70, 150), (34, 108), (22, 66)),
        ((BX, BY), (88, 140), (72, 84), (70, 30)),
        ((BX, BY), (104, 140), (122, 86), (128, 22)),
        ((BX, BY), (120, 156), (156, 116), (174, 74)),
        ((BX, BY), (96, 168), (98, 120), (100, 56)),
    ]
    body = ''
    leaves = ''
    cols = [DARK, MID, DARK, MID, DARK]
    for si, (p0, p1, p2, p3) in enumerate(stems):
        body += f'<path d="M{P(p0)} C{P(p1)} {P(p2)} {P(p3)}" stroke="{STEM}" stroke-width="2.75" stroke-linecap="round"/>'
        n = 6
        for i in range(n):
            s = 0.36 + i * (0.6 / (n - 1))
            c = bez(p0, p1, p2, p3, s)
            tg = bez_tan(p0, p1, p2, p3, s)
            ln = 20 - i * 1.4
            for side in (-1, 1):
                dvec = rot(tg, side * 48)
                tip = (c[0] + dvec[0] * ln, c[1] + dvec[1] * ln)
                col = cols[si] if (i + (side > 0)) % 2 else (MID if cols[si] == DARK else LIGHT)
                leaves += leaf(c, tip, 10.5 - i * 0.5, col, curve=side * 0.04, side_veins=0)
        tip = bez(p0, p1, p2, p3, 1)
        tg = bez_tan(p0, p1, p2, p3, 1)
        leaves += leaf(tip, (tip[0] + tg[0] * 15, tip[1] + tg[1] * 15), 9, LIGHT, side_veins=0)
    # 잎 위 반짝임(광택)
    return svg(body + leaves)


# ---------------- 테이블야자: 가는 줄기 끝에 아치형 깃털 잎 ----------------
def palm():
    fronds = [
        ((BX, BY), (92, 150), (60, 96), (14, 84), MID),
        ((BX, BY), (100, 140), (92, 70), (64, 28), LIGHT),
        ((BX, BY), (100, 140), (112, 66), (142, 30), MID),
        ((BX, BY), (106, 150), (140, 98), (186, 92), LIGHT),
        ((BX, BY), (96, 160), (88, 110), (40, 128), DARK),
        ((BX, BY), (102, 160), (114, 110), (160, 130), DARK),
    ]
    body = ''
    for p0, p1, p2, p3, col in fronds:
        body += f'<path d="M{P(p0)} C{P(p1)} {P(p2)} {P(p3)}" stroke="{STEM}" stroke-width="1.9" stroke-linecap="round"/>'
        n = 11
        for i in range(n):
            s = 0.38 + i * (0.6 / (n - 1))
            c = bez(p0, p1, p2, p3, s)
            tg = bez_tan(p0, p1, p2, p3, s)
            ln = 30 * (1 - 0.55 * (i / (n - 1)))
            for side in (-1, 1):
                dvec = rot(tg, side * 58)
                dvec = (dvec[0], dvec[1] + 0.45)  # 아래로 늘어짐
                Ld = math.hypot(*dvec)
                dvec = (dvec[0] / Ld, dvec[1] / Ld)
                tip = (c[0] + dvec[0] * ln, c[1] + dvec[1] * ln)
                body += leaf(c, tip, 4.6, col, curve=side * 0.06, veins=False)
    return svg(body)


# ---------------- 올리브나무: 가는 나무줄기와 은빛 도는 좁은 잎 ----------------
def olive():
    random.seed(7)
    bark = '#8A7B62'
    gray = ['#6F8C66', '#8FA87F', '#A9BE98', '#7D9871']
    branches = [
        ((BX, BY), (97, 170), (101, 140), (98, 104)),
        ((98, 118), (84, 100), (64, 84), (36, 70)),
        ((98, 110), (114, 92), (134, 80), (164, 66)),
        ((98, 104), (95, 80), (103, 52), (99, 18)),
        ((98, 136), (78, 128), (58, 120), (30, 116)),
        ((99, 130), (120, 124), (142, 114), (170, 108)),
        ((98, 106), (88, 86), (76, 62), (62, 36)),
        ((99, 106), (110, 86), (122, 62), (138, 38)),
    ]
    body = ''
    for bi, (p0, p1, p2, p3) in enumerate(branches):
        wdt = 5.2 if bi == 0 else 2.2
        body += f'<path d="M{P(p0)} C{P(p1)} {P(p2)} {P(p3)}" stroke="{bark}" stroke-width="{wdt}" stroke-linecap="round"/>'
    leaves = ''
    olives = ''
    for bi, (p0, p1, p2, p3) in enumerate(branches):
        if bi == 0:
            continue
        n = 13
        for i in range(n):
            s = 0.12 + i * (0.88 / (n - 1))
            c = bez(p0, p1, p2, p3, s)
            tg = bez_tan(p0, p1, p2, p3, s)
            for side in ((-1, 1) if i % 3 == 0 else ((-1,) if i % 2 else (1,))):
                dvec = rot(tg, side * (40 + random.uniform(-10, 10)))
                ln = 17 + random.uniform(-2.5, 2.5)
                tip = (c[0] + dvec[0] * ln, c[1] + dvec[1] * ln)
                leaves += leaf(c, tip, 5.2, gray[(i + bi + (side > 0)) % 4], curve=side * 0.05, veins=False)
            if i in (3, 6) and bi % 2:
                o = (c[0] - dvec[0] * 4, c[1] - dvec[1] * 4 + 3)
                olives += f'<ellipse cx="{f(o[0])}" cy="{f(o[1])}" rx="2.6" ry="3.3" fill="#5C4B66"/><ellipse cx="{f(o[0] - 0.8)}" cy="{f(o[1] - 1.1)}" rx="0.8" ry="1" fill="#FFFFFF" fill-opacity="0.5"/>'
        tip = bez(p0, p1, p2, p3, 1)
        tg = bez_tan(p0, p1, p2, p3, 1)
        leaves += leaf(tip, (tip[0] + tg[0] * 14, tip[1] + tg[1] * 14), 4.4, gray[bi % 4], veins=False)
    return svg(body + leaves + olives)


# ---------------- 선인장: 세로 골이 진 기둥형 + 꽃 ----------------
def cactus():
    green, dark, light = '#6FA060', '#4E7D44', '#9CC786'
    body = ''
    arms = [
        # (path, width)
        (f'M{P((BX, BY - 4))} L{P((BX, 74))}', 42),
        (f'M{P((BX - 14, 150))} L{P((62, 150))} Q{P((52, 150))} {P((52, 140))} L{P((52, 108))}', 22),
        (f'M{P((BX + 14, 128))} L{P((136, 128))} Q{P((146, 128))} {P((146, 118))} L{P((146, 92))}', 22),
    ]
    for d, w in arms:
        body += f'<path d="{d}" fill="none" stroke="{green}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" filter="url(#hi)"/>'
    # 골(리브)
    ribs = ''
    for dx in (-12, 0, 12):
        ribs += f' M{P((BX + dx, BY - 8))} L{P((BX + dx * 0.9, 70 + abs(dx) * 0.35))}'
    for dx in (-5, 5):
        ribs += f' M{P((52 + dx, 142))} L{P((52 + dx * 0.8, 104))} M{P((146 + dx, 120))} L{P((146 + dx * 0.8, 88))}'
    body += f'<path d="{ribs}" stroke="{dark}" stroke-opacity="0.55" stroke-width="1.3" stroke-linecap="round"/>'
    body += f'<path d="M{P((BX - 7, BY - 10))} L{P((BX - 7, 78))}" stroke="{light}" stroke-opacity="0.7" stroke-width="2.2" stroke-linecap="round"/>'
    # 가시
    spines = ''
    for dx in (-12, 0, 12):
        for y in range(84, 196, 13):
            x = BX + dx * (0.9 + 0.1 * (y - 70) / 130)
            spines += f' M{f(x - 2)} {f(y)} L{f(x + 2)} {f(y)} M{f(x)} {f(y - 2)} L{f(x)} {f(y + 2)}'
    for (ax, y0, y1) in ((52, 108, 142), (146, 92, 120)):
        for y in range(y0 + 4, y1, 11):
            spines += f' M{f(ax - 2)} {f(y)} L{f(ax + 2)} {f(y)} M{f(ax)} {f(y - 2)} L{f(ax)} {f(y + 2)}'
    body += f'<path d="{spines}" stroke="#F4F1E4" stroke-width="0.9" stroke-linecap="round"/>'
    # 꽃
    cx, cy = BX + 2, 58
    petals = ''
    for i in range(6):
        a = math.radians(i * 60 - 90)
        px, py = cx + math.cos(a) * 6.5, cy + math.sin(a) * 5
        petals += f'<ellipse cx="{f(px)}" cy="{f(py)}" rx="5.2" ry="3.4" transform="rotate({i * 60} {f(px)} {f(py)})" fill="#F2A7B8"/>'
    body += petals + f'<circle cx="{f(cx)}" cy="{f(cy)}" r="3.2" fill="#F6D27A"/>'
    return svg(body)


if __name__ == '__main__':
    for name, fn in [('stuckyi', stuckyi), ('zz', zz), ('palm', palm), ('olive', olive), ('cactus', cactus)]:
        path = os.path.join(OUT, f'plant-{name}.svg')
        with open(path, 'w') as fp:
            fp.write(fn())
        print('wrote', os.path.relpath(path))


# ---------------- 목록용 '사진' 카드: 다른 식물 사진과 같은 구도(세이지 배경 + 흰 화분) ----------------
def photo_card(name):
    import re
    src = open(os.path.join(OUT, f'plant-{name}.svg')).read()
    inner = re.search(r'<svg[^>]*>(.*)</svg>', src, re.S).group(1)
    k = 3.0
    tx, ty = 512 - BX * k, 706 - BY * k
    return f'''<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C5D3BC"/><stop offset="1" stop-color="#D3DECB"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6E0CF"/><stop offset="1" stop-color="#DFE7D9"/></linearGradient>
<linearGradient id="pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F4F1EA"/><stop offset="0.55" stop-color="#ECE8DF"/><stop offset="1" stop-color="#DAD5CA"/></linearGradient>
<radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7E8F74" stop-opacity="0.35"/><stop offset="1" stop-color="#7E8F74" stop-opacity="0"/></radialGradient>
<linearGradient id="light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
</defs>
<rect width="1024" height="850" fill="url(#wall)"/>
<rect y="850" width="1024" height="174" fill="url(#floor)"/>
<rect width="1024" height="1024" fill="url(#light)"/>
<ellipse cx="560" cy="958" rx="230" ry="26" fill="url(#shadow)"/>
<ellipse cx="510" cy="700" rx="140" ry="20" fill="#E3DED4"/>
<ellipse cx="510" cy="704" rx="124" ry="14" fill="#4A3B2E"/>
<g fill="none" transform="translate({tx:.1f} {ty:.1f}) scale({k})">{inner}</g>
<path d="M370 700 C370 712 650 712 650 700 L644 860 C636 930 590 962 510 962 C430 962 384 930 376 860 Z" fill="url(#pot)"/>
<path d="M370 700 C370 716 650 716 650 700" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="3" fill="none"/>
</svg>
'''


if __name__ == '__main__':
    with open(os.path.join(OUT, 'plant-cactus-photo.svg'), 'w') as fp:
        fp.write(photo_card('cactus'))
    print('wrote assets/plant-cactus-photo.svg')
