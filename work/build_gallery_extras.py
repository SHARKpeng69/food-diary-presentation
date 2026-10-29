"""Discover supplied originals and prepare compact, colour-managed gallery copies."""
from pathlib import Path
from hashlib import sha256
from PIL import Image, ImageOps, ImageDraw
import json

ROOT=Path(__file__).resolve().parent.parent
SOURCES=ROOT/'work/gallery-extra-sources'
OUT=ROOT/'outputs/assets/images/gallery/extra'
OUT.mkdir(parents=True,exist_ok=True)
# Subject-focused cover positions; newly added files default to the centre.
positions={'1-Photo-1.jpg':20,'2-Photo-7.jpg':80,'3-Photo-8.jpg':65,
           '4-Photo-9.jpg':58,'5-Photo-10.jpg':40,'6-Photo-7.jpg':55,
           '7-Photo-8.jpg':58,'8-Photo-9.jpg':58,'9-Photo-10.jpg':62}
records=[];seen=set();duplicates=[]
for path in sorted(SOURCES.iterdir()):
    if path.suffix.lower() not in {'.jpg','.jpeg','.png','.webp'}:continue
    digest=sha256(path.read_bytes()).hexdigest()
    if digest in seen:
        duplicates.append(path.name);continue
    seen.add(digest)
    source=Image.open(path);profile=source.info.get('icc_profile')
    image=ImageOps.exif_transpose(source).convert('RGB')
    thumbnail=ImageOps.contain(image,(800,800),Image.Resampling.LANCZOS)
    name='photo-'+digest[:12]+'.webp'
    thumbnail.save(OUT/name,format='WEBP',quality=88,method=6,**({'icc_profile':profile} if profile else {}))
    assert max(Image.open(OUT/name).size)<=800
    records.append({'src':'./assets/images/gallery/extra/'+name,'original':path.name,
                    'position':f"50% {positions.get(path.name,50)}%",'sha256':digest,
                    'originalSize':list(image.size),'thumbnailSize':list(thumbnail.size)})
manifest={'photos':records,'duplicateFilesSkipped':duplicates}
(ROOT/'work/gallery-extra-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(ROOT/'outputs/gallery-extra-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
if records:
    rows=(len(records)+2)//3
    proof=Image.new('RGB',(1200,rows*290),'#111514');draw=ImageDraw.Draw(proof)
    for i,record in enumerate(records):
        image=Image.open(OUT/Path(record['src']).name)
        crop=ImageOps.fit(image,(390,260),Image.Resampling.LANCZOS,centering=(.5,positions.get(record['original'],50)/100))
        x=(i%3)*400;y=(i//3)*290
        proof.paste(crop,(x+5,y+26));draw.text((x+12,y+8),record['original'],fill='white')
    proof.save(ROOT/'outputs/gallery-extra-crop-proof.jpg',quality=92)
print(f'{len(records)} distinct photos discovered; {len(duplicates)} byte-identical duplicates skipped; originals unchanged; thumbnails max 800 px.')
