// Run with an original GLB outside outputs/. Never overwrite the source.
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression,EXTTextureWebP} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const [input,output]=process.argv.slice(2);
assert(input&&output,'Usage: node work/optimize_home_model.mjs original.glb optimized.glb');
assert.notEqual(path.resolve(input),path.resolve(output),'Keep the original intact');
const original=await fs.readFile(input);
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression,EXTTextureWebP]).registerDependencies({
  'draco3d.encoder':await draco.createEncoderModule(),
  'draco3d.decoder':await draco.createDecoderModule()
});
const doc=await io.read(input);
const counts=document=>document.getRoot().listMeshes().flatMap(mesh=>mesh.listPrimitives().map(primitive=>({
  vertices:primitive.getAttribute('POSITION').getCount(),indices:primitive.getIndices().getCount()
})));
const before=counts(doc),textures=doc.getRoot().listTextures();
const dimensions=await Promise.all(textures.map(async texture=>{
  const info=await sharp(texture.getImage()).metadata();return [info.width,info.height];
}));
assert.equal(textures.length,3,'This recipe targets the supplied three-map HOME model');
for(const texture of textures){
  const image=texture.getImage();
  const color=texture.getName().startsWith('Color_');
  const compressed=await sharp(image).webp(color?{quality:96,effort:6}:{lossless:true,effort:6}).toBuffer();
  if(color||compressed.length<image.length){
    texture.setImage(compressed).setMimeType('image/webp');
    doc.createExtension(EXTTextureWebP).setRequired(true);
  }
}
doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
  method:KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,encodeSpeed:1,decodeSpeed:5,
  quantizationBits:{POSITION:16,NORMAL:14,TEX_COORD:16,GENERIC:16},quantizationVolume:'mesh'
});
const bytes=await io.writeBinary(doc);
assert(bytes.byteLength<25*1024**2,'The model exceeds the Workers static-asset limit');
const decoded=await io.readBinary(bytes);
assert.deepEqual(counts(decoded),before,'Do not simplify or remove triangles');
assert.equal(decoded.getRoot().listAnimations().length,doc.getRoot().listAnimations().length);
const afterTextures=decoded.getRoot().listTextures();
for(let i=0;i<textures.length;i++){
  const afterSize=await sharp(afterTextures[i].getImage()).metadata();
  assert.deepEqual([afterSize.width,afterSize.height],dimensions[i]);
}
assert((await fs.readFile(input)).equals(original),'The source must remain untouched');
await fs.writeFile(output,bytes);
console.log(JSON.stringify({originalBytes:original.length,optimizedBytes:bytes.byteLength,
  geometry:before,textureResolution:'unchanged',color:'WebP quality 96',
  otherTextures:'lossless WebP only where smaller; otherwise original bytes'},null,2));
