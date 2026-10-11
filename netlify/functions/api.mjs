import worker from '../../dist/server/index.js';

// Browser-public Kakao JavaScript key; restricted by Kakao SDK domain registration.
// Never put REST, admin, or transit service credentials in this fallback.
const publicMapKey='7d6dc80e6845ae77b6d169b2e8a2b5ef';

export default function handler(request){
 return worker.fetch(request,{GBIS_SERVICE_KEY:process.env.GBIS_SERVICE_KEY,KAKAO_REST_API_KEY:process.env.KAKAO_REST_API_KEY,KAKAO_JAVASCRIPT_KEY:process.env.KAKAO_JAVASCRIPT_KEY||publicMapKey});
}

export const config={path:'/api/*'};
