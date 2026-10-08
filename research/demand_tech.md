# 室内定位导航：需求证据与技术可行性调研

> 调研日期：2026-10-07。规则：每个数字都附来源链接和年份；没有找到可靠来源的数字标“未核实”；作者自己的推断标“推断”。

---

## 1. 用户痛点证据

**医院**
- 一项代表性调查（1,041 人）显示，**47%** 的受访者在医院里找路有小困难或大困难，老年人和学历较低的人更明显。Suchá 等，*Design for Health*，2025：[muni.cz](https://www.phil.muni.cz/en/research/publishing-and-editorial-activities-of-the-faculty/overview-of-publishing-and-scientific-activities/2557139)
- 一家三级医院调查了 336 名首次就诊的门诊患者：**69.6%** 依靠别人指路；走到目的地超过 10 分钟的人更容易求助。印度，IJCMPH，2026：[ijcmph](https://www.ijcmph.com/index.php/ijcmph/article/view/15904)
- 员工成本：美国 Emory 大学医院（300 床）的员工每年花约 **4,500 小时**回答问路，折合约 **22 万美元**/年。Zimring，1990，转引：[bdcnetwork](https://www.bdcnetwork.com/building-sector-reports/healthcare-facilities/blog/55368528/4500-hours-a-year-the-hidden-cost-of-poor-wayfinding-in-healthcare)
- 国内老年人：广州 3 家三级医院调查了 762 名老年人对导视系统的评价。Heliyon，2024：[doaj](https://doaj.org/article/0dd2d8101c604c85bbdaee62a4ec885e)。江西 3 家三甲医院的研究指出，现有标识和语音提示无法有效引导老年患者，老人也难以使用 AI 自助设备（Wang 等，*J. Geriatric Medicine*，2020）：[doi](https://doi.org/10.30564/jgm.v2i1.2233)
- 网传“国内患者平均找路 8.6 分钟”“挂错号率超过 23%”，出处是 B 站文章，**未核实**，不建议引用。

**GPS 室内失效**
- 开阔天空下，手机 GPS 的误差约为 **4.9 m**，靠近建筑后会变差：[gps.gov 存档](https://archive.gps.gov/systems/gps/performance/accuracy/)。卫星信号会被建筑墙体遮挡（《5G室内融合定位白皮书》，2020：[tmtpost](https://www.tmtpost.com/4817417.html)）。“室内误差达到数十米”这一具体数字**未核实**。

**地图 App 室内体验**
- 华为（HarmonyOS 2.0 及以上）和高德合作，已支持 **1 万+** 商场、88 个机场、65 个火车站的室内定位和自动切换楼层（2024-05）：[凤凰科技](https://tech.ifeng.com/c/8ZvTlpFA0Na)。**这意味着商场场景的头部竞品已经存在**，但这项能力目前只在华为机型上可用。
- 开发者社区有人认为“商场室内导航是伪需求”：顾客要么熟悉商场，要么直接问工作人员；商场会调整铺位，地图很难维护；部署信标成本高（V2EX，2020）：[v2ex](https://v2ex.com/t/690914)

**停车场反向寻车**
- 一项 2,000 名司机的调查（爱尔兰，2020）：**52%** 每年至少找不到车一次；找车平均要 5.6 分钟（女性）和 6.4 分钟（男性）；在“找不到车”的地点中，购物中心占 **58%**：[autobiz](https://www.autobiz.ie/all/skoda-survey-reveals-car-park-confusion)
- 杭州东站约 4,000 个车位接入了百度地图，提供车位级导航和反向寻车功能。报道直接写出了原来“人找不到车”的痛点（潮新闻，2026-01）：[tidenews](https://tidenews.com.cn/news.html?id=3342441)

---

## 2. 技术可行性与精度对比表

| 技术 | 典型精度 | 来源（年份） | 需要的基础设施 | 手机端可用性 |
|---|---|---|---|---|
| WiFi RSSI 指纹 | 实验室环境下 90% 的定位误差在 3.2–5.3 m；在大型商场里平均误差约 **7 m** | Nguyen 等的综述，2020：[arXiv](https://arxiv.org/pdf/2006.02251) | 复用现有 AP，但需要人工采集指纹并持续维护 | 仅 Android（见第 3 节） |
| WiFi vs BLE（同一场地） | 95% 情况下：WiFi < **8.5 m**，BLE < **2.6 m**（约每 30 m² 一个信标） | Faragher & Harle，IEEE JSAC，2015：[cam.ac.uk](https://www.cl.cam.ac.uk/~rkh23/site/publication/pub42) | 信标需要较密的部署 | — |
| WiFi RTT（802.11mc FTM） | 测 3 个及以上 AP 时通常 **1–2 m** | [Android 官方文档](https://developer.android.com/develop/connectivity/wifi/wifi-rtt)（Android 9 引入，Android 15 加入 802.11az） | **AP 必须支持 FTM**，目前大量已装 AP 不支持；部分情况下有 6–8 m 的系统偏差 | Android 原生 App 可用；**iOS 没有 API**（[MIT bkph](https://people.csail.mit.edu/bkph/FTMRTT_issues)）；小程序/H5 无法使用 |
| BLE 信标 | 90% 情况下 1.3–1.8 m（指纹法，密集部署） | 同上综述，2020 | 信标需要电池和日常运维 | iOS 和 Android 都可以，包括小程序 |
| PDR（惯导） | 短距离平均误差约 1.2–1.8 m；**只靠惯导时，走 172 m 后误差超过 40 m**，550 步后可达 17 m | 同上综述，2020 | 无需基础设施 | 各平台都可以 |
| UWB | 10–30 cm（厂商说法） | [airpinpoint](https://airpinpoint.com/en/glossary/uwb) | 需要部署 UWB 锚点 | 只有部分旗舰手机支持；iPhone 需要原生 App 调用 [Nearby Interaction](https://developer.apple.com/tutorials/data/documentation/nearbyinteraction.md)；小程序/H5 不可用 |
| 国内商用（中国移动 i-Location） | 3–4 m | 中国移动研究院，2021：[c114](https://m.c114.com.cn/w118-1178103.html) | — | — |

**结论（推断）**：融合 WiFi、BLE、PDR 和地图约束，在文献中可以做到约 1–3 m。但只要传感器只剩 PDR，误差会随步数持续增长，所以必须有一个**在 iOS 上也能使用的绝对定位源**来校正，这个源只能是 BLE 信标。

---

## 3. 平台能力边界（关键）

| 能力 | Android 原生 App | iOS 原生 App | 微信小程序（Android） | 微信小程序（iOS） | H5（浏览器 / 微信内置浏览器） |
|---|---|---|---|---|---|
| 扫描周边 WiFi 并取得 RSSI | 可以，但前台**每 2 分钟最多 4 次**扫描（Android 9 起）[文档](https://developer.android.com/develop/connectivity/wifi/wifi-scan) | **不可以**，没有公开 API（[Apple 论坛](https://developer.apple.com/forums/thread/788783)） | `getWifiList` 可以用，需要定位授权，信号强度为 0–100 | **实际上不可用**：调用后跳到系统设置，用户要手动进入 WLAN 页面才会返回结果 | 不可以 |
| WiFi RTT | Android 9 及以上，并且 AP 要支持 | 不可以 | 没有 API | 没有 API | 不可以 |
| iBeacon 扫描 | 可以 | 可以（CoreLocation，**1 Hz**，[来源](https://forums.estimote.com/t/decrease-ranging-interval/2349)） | `startBeaconDiscovery` 可以 | 可以，**必须预先指定 UUID**，并返回 rssi 和 accuracy | 不可以（Safari 不支持 Web Bluetooth；Android Chrome 的扫描接口还是实验性的）[来源](https://notificare.com/blog/2021/09/24/Quick-peek-into-the-Web-Bluetooth-API/) |
| 加速度计 / 陀螺仪 / 罗盘 | 可以 | 可以 | 可以，`game` 档位约 **20 ms/次**（约 50 Hz） | 同左 | Android 可直接监听；**iOS 13 起必须在 HTTPS 页面上，由用户点击触发 `requestPermission()`** 弹窗授权（[MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static)） |
| 当前所连 WiFi 的 BSSID | 可以 | 需要 entitlement | `getConnectedWifi` | 开启定位后可以拿到 SSID 和 BSSID | 不可以 |

来源：微信官方文档 [getWifiList](https://developers.weixin.qq.com/miniprogram/dev/api/device/wifi/wx.getWifiList.html)、[WifiInfo](https://developers.weixin.qq.com/miniprogram/dev/api/device/wifi/WifiInfo.html)、[BeaconInfo](https://developers.weixin.qq.com/miniprogram/dev/api/device/ibeacon/BeaconInfo.html)、[startBeaconDiscovery](https://developers.weixin.qq.com/miniprogram/dev/api/device/ibeacon/wx.startBeaconDiscovery.html)、[startAccelerometer](https://developers.weixin.qq.com/miniprogram/dev/api/device/accelerometer/wx.startAccelerometer.html)（以上于 2026-10 查阅）。

**重要风险**：微信的 [Wi-Fi 开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/device/wifi.html) 目前写着“**该系列接口已下架**”，但 API 参考页还在。到底是否还能用、对哪些账号开放，需要用真机实测；在此之前，不应把产品的主方案建立在这组接口上。另外，Beacon 功能要求微信拥有系统定位权限（[Beacon 指南](https://developers.weixin.qq.com/miniprogram/dev/framework/device/beacon.html)）；四类传感器接口必须在《用户隐私保护指引》里声明（[隐私指引](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/miniprogram-intro.html)）。

**可行架构（推断）**：
- **两端统一**：BLE 信标 + PDR + 地图约束 + EKF，载体是小程序。iOS 和 Android 都能拿到信标 RSSI 和 IMU 数据。
- **Android 增强**：小程序里的 WiFi 列表（如果还能用）只作为低频（每 30 s 一次级别）的粗略校正；原生 App 或合作方的 SDK 再加上 RTT。
- **iOS 的 WiFi 只能用“当前连接 AP 的 BSSID”**，做区域级的粗定位。
- **H5 不适合作为定位载体**，只适合承载地图和路线展示；纯 PDR 还要用户手动选起点。

---

## 4. 商业化关键因素（白皮书 / 报告提炼）

| 因素 | 证据 |
|---|---|
| 部署和运维成本高，要与多方物业协调 | 《5G室内融合定位白皮书》，中国移动、中兴，2020：[腾讯云](https://cloud.tencent.com/developer/news/715499) |
| 没有统一的评价标准，单一技术无法满足所有场景 | 同上 |
| 成本和精度难以兼顾；缺统一标准；室内地图数据不足；商业模式不成熟；隐私和安全 | 智研咨询，2023：[chyxx](https://www.chyxx.com/industry/1150560.html)（报告称 2022 年市场规模为 646 亿元，口径较宽，包含安防等，约 60% 用于安防监控） |
| 消费者对室内定位认知度低；担心数据安全 | 市场报告摘要：[gii](https://cn.gii.tw/report/ires1592017-indoor-location-based-services-market-by.html) |
| 地图更新难，商铺经常变动；用户不愿装 App | V2EX 讨论，2020（见上文） |
| 隐私合规：**行踪轨迹属于敏感个人信息**，处理需要**单独同意** | 《个人信息保护法》第 28、29 条：[网信办](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm) |
| 平台竞争：高德和华为已覆盖 1 万+ 商场 | 凤凰科技，2024 |
| B 端付费意愿和价格 | 未找到公开的院内导航中标金额，**未核实**。邵逸夫医院 2019 年招标了“智能导航系统”，但预算没有公开 |
| 广告 / 营销变现 | 2014 年阿里在杭州银泰门店部署了数百个 iBeacon 用于推送促销（[technode](https://technode.com/2014/09/05/alibaba-partners-department-store-chain-yintai-testing-ibeacon/)），后续效果数据**未核实** |

另：没有检索到中国卫星导航定位协会或信通院以“室内定位白皮书”为题的公开文本。卫星导航协会的年度《产业发展白皮书》只把“北斗+室内定位”作为融合方向提到（[新华网 2026](https://www.news.cn/tech/20260519/e3093035cd43432f9bf08ce6927fae51/c.html)），没有单列商业化因素。艾瑞的相关报告**未检索到**。

---

## 5. 医院与杭州本地案例

**政策抓手：医院智慧服务分级评估（国家卫健委，2019 年试行；5 类 17 项，分 0–5 级）**，其中“标识与导航”一项的要求是（[原文转载](https://www.karrytech.com/industry_detail/287.html)）：
- **3 级**：提供“静态室内地图查询服务，支持患者在线查询各科室位置”；
- **4 级**：“为患者提供与个人诊疗活动相关的**院内定位与导航**服务”，并能实时查询排队情况；
- **5 级**：规划最佳诊疗路径，并根据队列的实时变化引导患者。

**这对产品的含义（推断）**：医院想从 3 级升到 4 级，就需要“定位 + 导航 + 与 HIS 排队数据打通”。高等级的医院很少：截至 2024 年 10 月，全国通过 3 级及以上的医院共 89 家（[搜狐](https://www.sohu.com/a/823202795_100039018)）。2023 年底统计，“543”医院有 71 家，浙江占 14 家，智慧服务达到 4 级的只有 3 家（[惠每](https://www.huimei.com/news/1701742839215.html)）。2024 年度新增的 4 级医院中有**浙江省人民医院**（2025-07 公示，[HIT180](https://www.hit180.com/74111.html)）。浙大一院、浙大二院、邵逸夫医院的智慧服务等级在一些行业汇总中写的是 3 级，但没有找到官方逐院名单，**未核实**。

**杭州医院案例**
- **邵逸夫医院**：2017 年的移动就医平台已包含“院内导航”（[srrsh](https://www.srrsh.com/articleInfo/3059)）。2019-05 公开招标“智能导航系统”，要求室内 3D 地图、最优路径、室内外切换、**车位定位**等，招标文件没有指定定位技术（[srrsh](https://www.srrsh.com/articleInfo/3682)）。
- **浙大一院总部一期（余杭）**：用地 202 亩，开放 1,500 张床位，设计门诊量 **8,000 人次/日**（[杭州网 2020](https://hznews.hangzhou.com.cn/xinzheng/quxian/content/2020-10/20/content_7835334.htm)）。新院区面积大、门诊量高，导航需求明确（推断）。院内导航的具体上线情况**未检索到**。
- **浙大二院**：总部一期规划约 2,635 张床位（[澎湃](https://m.thepaper.cn/newsDetail_forward_17390407)）。院内导航的上线情况**未检索到**。

**杭州商场案例**
- **银泰 / 喵街**：喵街 App（银泰电商）提供商场楼层导航、品牌指南和停车缴费（[App Store](https://apps.apple.com/cn/app/id976048109)）。2014 年阿里在杭州银泰门店部署了数百个 iBeacon，室内图由高德提供（[technode](https://technode.com/2014/09/05/alibaba-partners-department-store-chain-yintai-testing-ibeacon/)）。
- **湖滨银泰 in77、万象城、来福士**：没有检索到这几家自建室内导航的公开报道（**未核实**）。它们大概率被高德或华为的室内图覆盖（推断）。

---

## 6. 对产品的建议

1. **先做医院，商场放后面**。商场已有高德和华为覆盖 1 万+ 家，而且被质疑是伪需求。医院有两个明确的付费理由：智慧服务 4 级的硬指标，以及节省导诊人力。第一个落点可以选浙大附属医院中的新院区（余杭、博奥等）。
2. **定位方案以 BLE 信标为主，不以 WiFi 为主**。iOS 小程序拿不到 WiFi 扫描结果，Wi-Fi 接口本身也有“已下架”的提示。“复用现有 WiFi”只能作为 Android 上的加分项，或者作为院方后台（AP 侧）的定位数据来源。信标密度可以低于学术实验里每 30 m² 一个的水平：依靠 PDR 加地图约束，只在路口、电梯、扶梯、科室门口布置信标做校正（推断，需要实测）。
3. **小程序优先，H5 只做展示**。iOS 上的 H5 需要用户点击授权 IMU，而且拿不到信标数据。
4. **与 HIS 的挂号、排队数据打通**，做“我的就诊路线”。这正是 4 到 5 级的评分点，也是对手比较难复制的地方。
5. **停车场反向寻车**可以作为第二个场景（医院和商场都适用）。地下车库没有 GPS，用信标加 PDR 记录停车位置。
6. **隐私合规**：轨迹只在端侧计算，或者匿名化处理。单独弹窗征得同意。按小程序隐私指引声明传感器和定位用途。
7. **待验证清单**：在真机上测 `getWifiList` 现在是否可用；测 iOS 微信里信标的刷新率和 RSSI 噪声；测 PDR 在“手机拿在手上 / 放在口袋里”两种状态下的误差；拿到 2–3 家医院院内导航的采购价格。
