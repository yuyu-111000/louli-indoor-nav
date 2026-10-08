# 紫金港附近商场/医院真实地图资料（可供 Demo 接入）

> 坐标来源：OpenStreetMap Nominatim（检索时间 2026-10-08）。室内楼层/走廊坐标多数未由公开来源提供，以下仅把公开 POI 坐标作为场馆入口/中心点；室内路径需在 Demo 中明确标注为模拟或后续测绘数据。

## 场馆清单

| ID | 场馆 | 类型 | 地址（公开地图） | WGS84 纬度, 经度 | OSM 查询/地图链接 |
|---|---|---|---|---|---|
| ZJU-ZJG | 浙江大学紫金港校区 | 起点 | 紫荆花北路，三墩镇，西湖区，杭州 310058 | 30.3061419, 120.0875012 | https://www.openstreetmap.org/?mlat=30.3061419&mlon=120.0875012#map=17/30.30614/120.08750 |
| MALL-XIXI | 西溪印象城 | 商场 | 访溪路，荆丰村，五常街道，余杭区，杭州 310023 | 30.2494914, 120.0445823 | https://www.openstreetmap.org/?mlat=30.2494914&mlon=120.0445823#map=18/30.24949/120.04458 |
| MALL-YINTAI | 杭州城西银泰城 | 商场 | 丰潭路 380 号，祥符街道，拱墅区，杭州 310011 | 30.3018106, 120.1028555 | https://www.openstreetmap.org/?mlat=30.3018106&mlon=120.10286 |
| HOSP-ZDE2-ZJU | 浙大二院浙大院区 | 医院 | 浙江省杭州市西湖区余杭塘路866号，浙江大学紫金港校区内（310058） | 30.3061419, 120.0875012（校园锚点，非建筑实测） | https://www.openstreetmap.org/?mlat=30.3061419&mlon=120.0875012#map=17/30.30614/120.08750 |
| HOSP-ZDE2-BOAO | 浙大二院博奥院区 | 医院 | 启迪路，信息港社区，北干街道，萧山区，杭州 310052 | 30.2055832, 120.2402873 | https://www.openstreetmap.org/?mlat=30.2055832&mlon=120.2402873#map=18/30.20558/120.24029 |
| HOSP-ZDE2-CITYEAST | 浙大二院城东院区（院区入口/公交站 POI） | 医院 | 源聚路，白石庙，笕桥街道，上城区，杭州 310017 | 30.3007556, 120.2235484 | https://www.openstreetmap.org/?mlat=30.3007556&mlon=120.22355 |
| HOSP-ZDE2-BINJIANG | 浙大二院滨江院区（院区入口/公交站 POI） | 医院 | 江虹路，中兴社区，长河街道，滨江区，杭州 310052 | 30.2050252, 120.1954991 | https://www.openstreetmap.org/?mlat=30.2050252&mlon=120.19550 |

## 给导航 Demo 的结构化建议

- 室外路线可调用高德/百度/OSRM；建议把上述坐标当作 POI 锚点。
- 室内导航数据模型：`venue -> floor -> node -> edge -> poi`。节点字段建议：`id,x,y,floor,type`；边字段：`from,to,length_m,accessible,stairs,elevator`。
- 公开资料没有给出室内节点时，使用 `data_status: "demo_simulated"`，不要声称为真实测绘。可先绘制 1F 平面示意图，标注入口、电梯、楼梯、服务台、目标店铺/科室；后续替换为官方楼层图或实测坐标。
- 地图底图可用 Leaflet + OpenStreetMap 瓦片（遵守 OSM attribution），室内图层用 SVG/Canvas；切换楼层时只显示对应 floor 的节点。

## 主要来源

0. 浙大二院官网（院区地址，页脚）：https://www.z2hospital.com/
1. OSM Nominatim 查询（可复核坐标）：https://nominatim.openstreetmap.org/search?format=jsonv2&q=浙大二院%20杭州
2. OSM Nominatim：紫金港校区：https://nominatim.openstreetmap.org/search?format=jsonv2&q=浙大紫金港校区
3. OSM Nominatim：西溪印象城：https://nominatim.openstreetmap.org/search?format=jsonv2&q=西溪印象城%20杭州
4. OSM Nominatim：杭州城西银泰城：https://nominatim.openstreetmap.org/search?format=jsonv2&q=杭州城西银泰城
5. OSM 地图版权与许可：https://www.openstreetmap.org/copyright

## 重要真实性说明

- “浙大二院”检索结果包含博奥院区（医院 polygon）以及城东/滨江院区的公交站 POI；城东、滨江坐标是院区附近入口参考点，不代表建筑中心或室内科室。
- 本表没有捏造楼层、店铺、科室坐标。若 Demo 需要可点击导航，请在数据中将室内节点标为 `demo_simulated`，并在界面显示“演示路径/非实时室内测绘”。




## 距离排序提示

按 WGS84 直线距离粗估（起点使用紫金港校区校园锚点，非道路距离）：城西银泰城约 1.55 km、西溪印象城约 7.53 km、浙大二院城东院区约 13.08 km、滨江院区约 15.30 km、博奥院区约 18.45 km。浙大二院浙大院区地址位于校园内，因此与校园锚点的计算距离显示为 0，仅代表同一校园范围，不能替代院区建筑入口距离。
