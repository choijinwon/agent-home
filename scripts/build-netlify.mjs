import './build.mjs';
import {mkdir,readdir,copyFile} from 'node:fs/promises';

// Publish browser assets only; never publish server code or local credentials.
await mkdir('.netlify-publish',{recursive:true});
for(const entry of await readdir('dist',{withFileTypes:true})){
 if(entry.isFile()&&/\.(html|js|mjs|css|txt)$/.test(entry.name)){
  await copyFile('dist/'+entry.name,'.netlify-publish/'+entry.name);
 }
}
console.log('Netlify browser assets ready');
