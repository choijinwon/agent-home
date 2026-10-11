import worker from '../../dist/server/index.js';

export default function handler(request){
 return worker.fetch(request,{GBIS_SERVICE_KEY:process.env.GBIS_SERVICE_KEY,KAKAO_JAVASCRIPT_KEY:process.env.KAKAO_JAVASCRIPT_KEY});
}

export const config={path:'/api/*'};
