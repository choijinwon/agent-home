import worker from '../../dist/server/index.js';

export default function handler(request){
 return worker.fetch(request,{GBIS_SERVICE_KEY:process.env.GBIS_SERVICE_KEY});
}

export const config={path:'/api/*'};
