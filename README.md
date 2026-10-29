# Food Diary — TCCU2500 Food and Culture

A desktop presentation with five chapters: HOME, DETAILS, DESCRIPTION,
REFLECTION and REFERENCES. The entrance uses an eye film, followed by a
21-card spherical gallery with mouse rotation and chapter navigation.

The completed presentation includes HOME's interactive food model, DETAILS'
two-scene restaurant visit, DESCRIPTION's six photographic 2.5D layers,
REFLECTION's photographic composition, and REFERENCES' procedural paper
unfolding with editable HTML bibliography text.

## Preview locally

From the repository root, with Python 3 installed:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory outputs
```

Open <http://127.0.0.1:8765/index.html>. Keep the terminal running. No frontend
framework, bundler, npm install or external asset host is required. Serve the
site over HTTP rather than opening the HTML through `file://`, because the
model and paper use JavaScript modules and local asset requests.

Designed for desktop presentation at 1920 × 1080 and 1440 × 900. Use the
on-screen fullscreen control, drag the gallery, select a chapter, use arrow
keys to change chapters, and Escape to return to the gallery.

## Files and editing

- `outputs/`: complete runnable website, local photographs, six transparent
  DESCRIPTION layers, HOME GLB, gallery thumbnails, and vendored libraries.
- `work/index.template.html`: editable presentation HTML, CSS and interactions.
- `work/home-model.js`: HOME viewer source.
- `work/references-paper.js` and `work/paper-geometry.js`: paper animation source.
- `work/references.json`: six complete bibliography records.
- `work/reference/`: eye film, poster, embedded fonts and font licenses.
- `work/gallery-sources/` and `work/gallery-extra-sources/`: preserved originals
  used to build the gallery thumbnails.

Rebuild the presentation after editing its template or bibliography:

```sh
python3 work/build_prototype.py
```

The committed `outputs/` is ready to serve without rebuilding. It also contains
the finished chapter images and image masks; no segmentation tools are needed.

To regenerate the gallery thumbnails, install Pillow in a local virtual
environment outside this repository or an ignored directory, then run:

```sh
python3 work/build_gallery_thumbnails.py
python3 work/build_gallery_extras.py
python3 work/build_prototype.py
```

The first thumbnail script uses the committed originals; its historical upload
path is only a fallback if those originals are absent. Each page load assigns
the nine decorative photographs to 16 decorative positions, using every image
before repeats. The five chapter thumbnails remain fixed.

Focused source checks require Node.js with ES-module syntax detection
(Node.js 22.7 or later):

```sh
node work/verify_gallery_assignment.mjs
node work/verify_paper.mjs
```

## Asset and bibliography notes

The deployed HOME GLB is `outputs/assets/home-pad-kra-pao-optimized.glb`,
18,316,776 bytes (17.47 MiB), reduced from the 69.26 MiB original. All
1,985,918 triangles remain. Geometry uses Draco compression at 16-bit position,
14-bit normal and 16-bit UV precision. Texture resolution remains 8192 × 8192
for colour and 4096 × 4096 for the two material maps. Colour uses quality-96
WebP, the normal map uses lossless WebP, and the roughness/metalness map is
unchanged. The local Draco decoder runs in one temporary worker and is disposed
after loading. The camera, lighting and interaction code retain their settings.

The original GLB backup stays outside Git in `work/backups/`; it is not required
to preview, build the HTML or deploy the committed website. To repeat the model
conversion, install the pinned development tools, then supply your original:

```sh
npm ci
node work/optimize_home_model.mjs /absolute/path/to/original.glb outputs/assets/home-pad-kra-pao-optimized.glb
```

The rejected DESCRIPTION GLB, uncompressed original model, downloaded development
packages, caches, backups, preview screenshots and local server logs are excluded
from version control. Supplied source photographs remain in the repository for
rebuilding thumbnails; they are not in the deployment directory.

## Cloudflare Workers preparation

`wrangler.jsonc` declares a static-only Worker named `food-diary-presentation`
with `outputs/` as its asset directory. `outputs/.assetsignore` permits the
runnable website and excludes local reports, screenshots, obsolete models and
diagnostics. Git ignores and asset-upload ignores are separate safeguards.

After `npm ci`, validate locally without uploading:

```sh
python3 work/verify_deployment.py
npx wrangler deploy --dry-run --outdir work/wrangler-dry-run
```

The size check reads the staged/tracked file list, so stage intended changes
before running it. A normal clone already has its tracked file list.
The dry run uses the same configuration as `npx wrangler deploy` but does not
upload a deployment. An eventual real deployment requires Cloudflare
authentication and explicit owner approval; none has been performed here.

The bibliography remains an APA working bibliography. All six supplied records
are preserved; language/episode metadata review and clarification of the
reference-slide word limit remain pending. See
`outputs/references-bibliography.md` and `work/references.json`.

Third-party notices are retained in `outputs/vendor/` and `work/reference/`.
This repository does not grant a new license to student photographs, the
reference film or supplied models. The public presentation includes its existing
student identity, student number and supplied photographs. No credentials or
Cloudflare account IDs are needed in tracked configuration.
