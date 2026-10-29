"""Prepare gallery-only 3:2 copies; never rewrite the chapter or uploaded originals."""
from pathlib import Path
from shutil import copyfile
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
UPLOAD = Path('/tmp/codex-remote-attachments/01a1736a-e0ff-7952-bdcc-173b640d4968/76F61618-6102-47D2-B610-232B162E32AD')
SOURCES = ROOT / 'work/gallery-sources'
OUT = ROOT / 'outputs/assets/images/gallery'
SOURCES.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
for number, name in [(1, 'home'), (2, 'description'), (3, 'reflection')]:
    original = SOURCES / f'{name}-original.jpg'
    if not original.exists():
        copyfile(UPLOAD / f'{number}-Photo-{number}.jpg', original)

def save(name, image):
    assert image.size == (720, 480)
    image.convert('RGB').save(OUT / f'gallery-{name}.jpg', quality=89, optimize=True, progressive=True)

home = ImageOps.exif_transpose(Image.open(SOURCES / 'home-original.jpg')).convert('RGB')
assert home.size == (1254, 1254)
# Keep the condiment bowl and all four yolks; trim outer plate/rice and blank background.
save('home', home.crop((0, 102, 1254, 938)).resize((720, 480), Image.Resampling.LANCZOS))

description = ImageOps.exif_transpose(Image.open(SOURCES / 'description-original.jpg')).convert('RGB')
assert description.size == (1280, 1169)
# An intentional light editorial field preserves every separated ingredient, without masking whites.
contained = ImageOps.contain(description, (720, 480), Image.Resampling.LANCZOS)
backing = Image.new('RGB', (720, 480), '#ffffff')
backing.paste(contained, ((720-contained.width)//2, (480-contained.height)//2))
save('description', backing)

reflection = ImageOps.exif_transpose(Image.open(SOURCES / 'reflection-original.jpg')).convert('RGB')
assert reflection.size == (1280, 720)
save('reflection', reflection.crop((110, 0, 1190, 720)).resize((720, 480), Image.Resampling.LANCZOS))

details = Image.open(ROOT / 'outputs/assets/images/details/details-exterior-concept.jpg').convert('RGB')
assert details.size == (1280, 720)
details_backing = Image.new('RGB', (720, 480), '#111514')
details_backing.paste(details.resize((720, 405), Image.Resampling.LANCZOS), (0, 37))
save('details', details_backing)

rules=[]
for i, length in enumerate([422, 385, 404, 438, 393, 418]):
    y=150+i*31
    rules.append(f'<path d="M141 {y}h{length}M156 {y+10}h{length-50}"/>')
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
<defs><radialGradient id="room"><stop stop-color="#242b29"/><stop offset="1" stop-color="#080d0c"/></radialGradient><linearGradient id="paper" x2=".2" y2="1"><stop stop-color="#f0eadf"/><stop offset="1" stop-color="#dfd7c8"/></linearGradient></defs>
<rect width="720" height="480" fill="url(#room)"/>
<path d="M96 77L620 76L626 369L94 371Z" fill="#000" opacity=".18" transform="translate(3 6)"/>
<path d="M96 77L620 76L626 369L94 371Z" fill="url(#paper)" stroke="#fff" stroke-opacity=".25"/>
<g fill="none" stroke-width="1"><path d="M96 77L359 226L626 369M620 76L359 226L94 371" stroke="#8e8069" opacity=".08"/><path d="M356 77L359 226L362 370" stroke="#fff" opacity=".32"/><path d="M96 225L359 226L623 223" stroke="#978b78" opacity=".1"/></g>
<text x="360" y="121" text-anchor="middle" font-family="Georgia,serif" font-size="27" font-weight="bold" fill="#343028">References</text>
<g fill="none" stroke="#4d473d" stroke-opacity=".38" stroke-width="2">{''.join(rules)}</g>
</svg>'''
(OUT / 'gallery-references.svg').write_text(svg)

photos = ['home', 'details', 'description', 'reflection']
proof = Image.new('RGB', (1440, 1010), '#0b0e0d')
draw = ImageDraw.Draw(proof)
for i, name in enumerate(photos):
    x=(i%2)*720; y=(i//2)*505
    proof.paste(Image.open(OUT / f'gallery-{name}.jpg'), (x, y+25))
    draw.text((x+15, y+7), name.upper(), fill='white')
proof.save(ROOT / 'outputs/gallery-photographic-thumbnails.jpg', quality=92)
print('Created four 720×480 photographic thumbnails and one lightweight paper SVG. Original files retained separately.')
