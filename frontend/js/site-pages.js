export function sitePages(venue='yintai-demo') {
  const selected=encodeURIComponent(venue),publicVenue=venue==='xixi-demo'?'xixi-demo':'yintai-demo';
  return [
    {label:'主页面',href:`./?venue=${selected}#showcase`},
    {label:'逐层看图',href:venue==='yintai-demo'?'spatial-map.html?venue=yintai-demo':`reference-map.html?venue=${publicVenue}`},
    {label:'路线仿真',href:`demo.html?venue=${selected}`},
    {label:'演示数据',href:`data-console.html?venue=${selected}`},
    {label:'附近场馆',href:`nearby.html?venue=${selected}`},
    {label:'资料与反馈',href:`materials.html?venue=${selected}`}
  ];
}
