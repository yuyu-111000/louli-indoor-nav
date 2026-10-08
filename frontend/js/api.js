export class APIError extends Error {
  constructor(message,status=0){super(message);this.status=status;}
}
export async function request(path, options={}) {
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(6000)});
  const body=await response.json();
  if(!response.ok)throw new APIError(body.error?.message||'数据请求失败',response.status);
  return body;
}
export async function loadVenue(id='yintai-demo') {
  try {return {bundle:await request(`/api/v1/venues/${encodeURIComponent(id)}/bundle`),connected:true};}
  catch(error) {
    if(error.status===404)throw error;
    if(!['hosp','mall','yintai-demo','xixi-demo'].includes(id))throw new APIError('无法加载此导入场馆，请启动后端服务。');
    const response=await fetch(`data/${id}.json`);
    if(!response.ok)throw new APIError('本地演示数据不可用。');
    return {bundle:await response.json(),connected:false};
  }
}
export const listVenues=()=>request('/api/v1/venues');
export const importBundle=bundle=>request('/api/v1/imports',{method:'POST',body:JSON.stringify(bundle)});
export const readQueues=id=>request(`/api/v1/venues/${encodeURIComponent(id)}/queues`);
export const writeQueues=(id,queues)=>request(`/api/v1/venues/${encodeURIComponent(id)}/queues`,{method:'PUT',body:JSON.stringify({queues})});

export async function loadNearby(){try{return await request('/api/v1/nearby-venues');}catch{const r=await fetch('data/nearby-venues.json');if(!r.ok)throw new APIError('附近场馆资料不可用');return r.json();}}
