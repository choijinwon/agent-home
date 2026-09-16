import http from 'node:http';
import worker from '../dist/server/index.js';
http.createServer(async(req,res)=>{
 try{const response=await worker.fetch(new Request('http://localhost:4173'+req.url,{method:req.method}),{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Server error');}
}).listen(4173,'127.0.0.1',()=>console.log('http://localhost:4173'));
