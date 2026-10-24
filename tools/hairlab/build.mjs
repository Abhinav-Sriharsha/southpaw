/* South Paw · tools/hairlab/build.mjs
   Builds the standalone fitting room (hair, face, body, kit): the fighter from game/assets/models plus template.html.
   Run:  node tools/hairlab/build.mjs   ->  tools/hairlab/barbershop.html, the fitting room (open it in a browser, or publish it). */
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
globalThis.window={};await import(path.join(here,'../../game/assets/models/fighter03.js'));const M=window.SP_MODELS.fighter03;
const raw=b=>Buffer.from(b,'base64');const si=raw(M.data[3]);const bone=Buffer.alloc(si.length/4);for(let i=0;i<bone.length;i++)bone[i]=si[i*4];
const D={pos:M.data[0],nor:M.data[1],part:M.data[2],bone:bone.toString('base64'),tri:M.data[5],head:M.rest[5].p};
fs.writeFileSync(path.join(here,'barbershop.html'),fs.readFileSync(path.join(here,'template.html'),'utf8').replace('/*DATA*/','const D='+JSON.stringify(D)+';'));
console.log('wrote tools/hairlab/barbershop.html');
