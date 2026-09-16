import {readdir,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
for(const name of ['maplibre-gl.mjs','maplibre-gl-shared.mjs','maplibre-gl-worker.mjs','maplibre-gl.css'])await copyFile('node_modules/maplibre-gl/dist/'+name,'dist/'+name);
await copyFile('node_modules/maplibre-gl/LICENSE.txt','dist/maplibre-license.txt');
const assets={};
for(const name of await readdir('dist')){
 if(!/\.(html|js|mjs|css|txt)$/.test(name))continue;
 assets['/'+name]={type:name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.txt')?'text/plain; charset=utf-8':'text/javascript; charset=utf-8',body:await readFile('dist/'+name,'utf8')};
}
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/assets.js','export default '+JSON.stringify(assets)+';\n');
await copyFile('server/worker.js','dist/server/index.js');await copyFile('server/transit.js','dist/server/transit.js');
try{await copyFile('.openai/hosting.json','dist/.openai/hosting.json');}catch(error){if(error.code!=='ENOENT')throw error;}
console.log('Worker and browser assets built');

await copyFile('server/nearby.js','dist/server/nearby.js');

await copyFile('server/nearby-stops.js','dist/server/nearby-stops.js');
