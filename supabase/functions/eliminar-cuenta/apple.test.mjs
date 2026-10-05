// Prueba local de apple.ts: node supabase/functions/eliminar-cuenta/apple.test.mjs (Node 22.6+; genera una clave de prueba, no usa Apple).
import {clientSecret,revocar} from './apple.ts';
import {generateKeyPairSync,createVerify,createPublicKey} from 'node:crypto';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const pem=privateKey.export({type:'pkcs8',format:'pem'});
const cfg={teamId:'TEAM123456',keyId:'KEY1234567',privateKey:pem.replace(/\n/g,'\n')};   // con \n literales, como en un secret de una línea
const jwt=await clientSecret(cfg,'com.ejemplo.web',1700000000000);
const [h,p,s]=jwt.split('.');
console.log(JSON.parse(Buffer.from(h,'base64url')),JSON.parse(Buffer.from(p,'base64url')));
const ok=createVerify('SHA256').update(h+'.'+p).verify({key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(s,'base64url'));
console.log('firma válida:',ok);
let llamada;
const f=async(u,o)=>{llamada={u,body:Object.fromEntries(new URLSearchParams(o.body)),m:o.method,ct:o.headers['Content-Type']};return new Response('',{status:200})};
console.log(await revocar(cfg,'com.ejemplo.web','rt_abc',f),llamada.u,llamada.m,llamada.ct,{...llamada.body,client_secret:llamada.body.client_secret.slice(0,10)+'…'});
console.log(await revocar(cfg,'x','rt',async()=>new Response('invalid_client',{status:400})));
console.log(await revocar(cfg,'x','rt',async()=>{throw new Error('sin red')}));
console.log(await revocar({...cfg,privateKey:'basura'},'x','rt',f));
