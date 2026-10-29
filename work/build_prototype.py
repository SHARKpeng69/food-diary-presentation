"""Package the original film/fonts and neutral procedural surfaces into index.html."""
from pathlib import Path
from base64 import b64encode
import json
import math
import shutil

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / 'work/reference'

def embedded(path, mime):
    return f'data:{mime};base64,' + b64encode(path.read_bytes()).decode()


def surface(index):
    # Procedural grayscale surfaces only: no final photograph, food image, or text.
    tones = ['#868780', '#a5a198', '#65706d', '#b2aea7', '#797c78', '#c3c0b7', '#616660']
    color = tones[index % len(tones)]
    paths = []
    for line in range(22):
        coords = []
        for step in range(17):
            x = step * 44 - 28
            y = line * 26 - 64 + math.sin(step*.45 + index*.9 + line*.17)*42
            coords.append(f'{x:.1f},{y:.1f}')
        paths.append('<polyline points="'+' '.join(coords)+'"/>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="426" viewBox="0 0 640 426">
    <defs><linearGradient id="light" x1="{index%3*30}%" y1="0%" x2="{70+index%3*15}%" y2="100%"><stop stop-color="{color}"/><stop offset=".48" stop-color="#5f625e"/><stop offset="1" stop-color="#1e2220"/></linearGradient><radialGradient id="v"><stop stop-color="#eee9e0" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="{index+11}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".22"/></feComponentTransfer><feBlend in2="SourceGraphic" mode="soft-light"/></filter></defs>
    <g filter="url(#grain)"><rect width="640" height="426" fill="url(#light)"/><ellipse cx="{100+index*71%480}" cy="{40+index*47%300}" rx="450" ry="310" fill="url(#v)"/><g fill="none" stroke="#e7e4db" stroke-opacity=".13" stroke-width=".65" transform="rotate({index*17%80-40} 320 213)">{''.join(paths)}</g></g></svg>'''
    return 'data:image/svg+xml;base64,' + b64encode(svg.encode()).decode()


html = (ROOT / 'work/index.template.html').read_text()
extra_manifest=ROOT/'work/gallery-extra-manifest.json'
extra_photos=json.loads(extra_manifest.read_text())['photos'] if extra_manifest.exists() else []
html = html.replace('__EXTRA_GALLERY_PHOTOS_JSON__', json.dumps(extra_photos,ensure_ascii=False))
references = json.loads((ROOT / 'work/references.json').read_text())
html = html.replace('__REFERENCES_JSON__', json.dumps(references, ensure_ascii=False))
fonts = []
for item in json.loads((REF / 'font-manifest.json').read_text()):
    family = 'Inter' if item['family'] == 'inter' else 'Playfair Display'
    data = embedded(ROOT / item['path'], 'font/woff2')
    fonts.append(f"@font-face{{font-family:'{family}';font-style:{item['style']};font-weight:{item['weight']};font-display:swap;src:url('{data}') format('woff2')}}")
licenses = '\n\n'.join((REF/name).read_text() for name in ['inter-license.txt','playfair-license.txt'])
html = html.replace('__FONT_FACES__', '/* Embedded font licenses:\n'+licenses+'\n*/\n'+'\n'.join(fonts))
html = html.replace('__SURFACES_JSON__', json.dumps([surface(i) for i in range(21)], separators=(',', ':')))
html = html.replace('__FILM__', embedded(REF / 'eye-original.mp4', 'video/mp4'))
html = html.replace('__POSTER__', embedded(REF / 'eye-frame-0.jpg', 'image/jpeg'))
assert '__FONT_' not in html and '__SURFACES_' not in html and '__FILM__' not in html
assert html.count('<style>') == 1 and html.count('<script>') == 1
assert all(text not in html for text in ['I KNOW MY ORDER.', 'My favourite Thai lunch', 'images.unsplash.com'])
output = ROOT / 'outputs/index.html'
output.write_text(html)
for name in ['home-model.js', 'references-paper.js', 'paper-geometry.js']:
    shutil.copyfile(ROOT / 'work' / name, ROOT / 'outputs' / name)
entries=[]
for ref in references:
    author=ref['author']+('' if ref['author'].endswith('.') else '.')
    title=ref['title'] if ref['kind']=='article' else '*'+ref['title']+'*'
    if ref['translation']: title+=' ['+ref['translation']+']'
    if ref['kind']=='video': title+=' [Video]'
    site=('*'+ref['site']+'*' if ref['kind']=='article' else ref['site'])
    entries.append(author+' ('+ref['date']+'). '+title+'. '+(site+'. ' if site else '')+ref['url'])
bibliography='# References — APA working bibliography\n\nAll six sources are preserved. Original-script titles are retained under APA’s permitted exception while language review remains pending. Bracketed English translations are editorial, not official titles. The Thai PBS item uses the broadcaster-hosted online-video format; formal episode production credits remain unverified.\n\n'+'\n\n'.join(entries)+'\n'
(ROOT/'outputs/references-bibliography.md').write_text(bibliography)
(ROOT/'outputs/references-data.json').write_text(json.dumps(references,ensure_ascii=False,indent=2)+'\n')
print(f'{output.name}: {len(html.encode()):,} bytes; original eye film; embedded original font families; 21 procedural surfaces.')
