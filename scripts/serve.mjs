import http from 'node:http';
import worker from '../dist/server/index.js';
try{process.loadEnvFile('.env.local');}catch(error){if(error.code!=='ENOENT')throw new Error('로컬 환경설정 파일을 확인해 주세요.');}
http.createServer(async(req,res)=>{
 try{let body; if(!['GET','HEAD'].includes(req.method)){const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){res.writeHead(413);res.end();return;}parts.push(chunk);}body=Buffer.concat(parts);}
 const response=await worker.fetch(new Request('http://localhost:4173'+req.url,{method:req.method,body}),{GBIS_SERVICE_KEY:process.env.GBIS_SERVICE_KEY});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Server error');}
}).listen(4173,'127.0.0.1',()=>console.log('http://localhost:4173'));
