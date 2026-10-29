"""Check the staged static-site boundary and Workers per-file size budget."""
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
config = json.loads((ROOT / 'wrangler.jsonc').read_text())
assert config['name'] == 'food-diary-presentation'
assert config['assets']['directory'] == './outputs'
assert 'main' not in config and 'account_id' not in config
files = [p for p in subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0') if p]
runtime = [ROOT / p for p in files if p.startswith('outputs/') and not p.endswith('.assetsignore')]
assert runtime and all(p.stat().st_size < 25 * 1024**2 for p in runtime)
assert not any('pad-kra-pao-exploded.glb' in p or 'tripo_pbr_model_' in p for p in files)
ignore = (ROOT / 'outputs/.assetsignore').read_text()
for rule in ('/*', '!/assets/', '/assets/*', '!/assets/home-pad-kra-pao-optimized.glb', '!/assets/images/'):
    assert rule in ignore.splitlines()
assert 'models/' not in '\n'.join(line for line in ignore.splitlines() if line.startswith('!'))
viewer = (ROOT / 'work/home-model.js').read_text()
assert viewer == (ROOT / 'outputs/home-model.js').read_text()
assert "setDRACOLoader(draco)" in viewer and 'setWorkerLimit(1)' in viewer
model = ROOT / 'outputs/assets/home-pad-kra-pao-optimized.glb'
assert model in runtime
assert 'DRACOLoader.js' in viewer
for name in ('DRACOLoader.js', 'draco/draco_decoder.js', 'draco/draco_wasm_wrapper.js', 'draco/draco_decoder.wasm', 'draco/DRACO-LICENSE.txt'):
    assert ROOT / ('outputs/vendor/' + name) in runtime
for module in (ROOT / 'outputs/vendor').glob('*.js'):
    code = re.sub(r'/\*.*?\*/', '', module.read_text(), flags=re.S)
    for relative in re.findall(r"^(?:import|export)\s[^;]*?\sfrom\s*['\"]([^'\"]+)['\"]", code, re.M):
        assert relative.startswith('./') and (module.parent / relative).is_file(), (module.name, relative)
for forbidden in ('node_modules/', 'work/backups/', '.env', '.wrangler/'):
    assert not any(p.startswith(forbidden) for p in files)
print(f'PASS: {len(runtime)} staged runtime files below 25 MiB; local Draco dependencies; originals excluded; static-only Wrangler config.')
