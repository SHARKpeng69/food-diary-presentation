Three.js 0.186.1 — official npm package `three@0.186.1`.
MIT license: THREE-LICENSE.txt.

Included: WebGL module/core, GLTFLoader, BufferGeometryUtils, SkeletonUtils,
and RoomEnvironment. Only import paths in the example helpers were changed
to use these sibling files. No CDN or package manager is needed at runtime.

HOME also uses DRACOLoader from the same Three.js release, with only its import
and decoder paths changed to local sibling files. The glTF Draco WASM/JS decoder
files are in draco/ with their Apache 2.0 license. They decode the compressed
HOME GLB using one temporary worker, disposed after loading. No CDN is used.
