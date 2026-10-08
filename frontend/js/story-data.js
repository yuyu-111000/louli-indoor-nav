export function buildStory(bundle) {
  const c=bundle.catalog, hospital=bundle.venue.type==='hospital';
  const ids=Object.keys(c.poi);
  const route=hospital&&c.flow?c.flow.phases.flat():c.favs.length?c.favs:ids.slice(0,3);
  const queue=bundle.queues.find(q=>c.poi[q.poiId])?.poiId||ids[0];
  const chapters = [
    {action:'overview',title:hospital?'看懂今天的就诊安排':'先取号，再安心逛店',caption:hospital?'把初诊、检查、复诊和取药放进一张清晰的任务清单。':'把想去的店放进清单，路线同时考虑步行与等待。',ids:route},
    {action:'navigate',title:hospital?'下一站，怎么走':'把想去的地方串起来',caption:'路线就在眼前。用科室、店名和路口作地标，逐步走向下一站。',ids:route},
    {action:'queue',title:hospital?'快轮到时，再返回候诊':'快叫号时，提醒返回',caption:'模拟队列变化，展示返回提醒。接口可替换为合作方提供的队列数据。',ids:[queue]},
    {action:'hardware',title:'楼里信标，补充室内位置参考',caption:'信标分布在入口、路口和服务点附近。手机结合地图与运动信息估计位置。',ids:route.slice(0,1)}
  ];
  if(bundle.venue.location){
    chapters[0].title='从场馆信息，走向室内服务';
    chapters[0].caption='已接入真实室外地点；下面的布局与商户为示意，可用场馆提供的楼层图替换。';
    chapters[1].caption='演示入口、服务台与目标点的指引方式。路线和距离依据示意图计算。';
    chapters[2].caption='用模拟排队说明返回提醒；没有连接本商场的真实商户或叫号系统。';
  }
  return chapters;
}
