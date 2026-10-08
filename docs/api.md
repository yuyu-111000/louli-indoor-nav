# 楼里本地数据接口与导入格式

这是本机展示服务，使用 Python 3.9+ 标准库 HTTP 服务与 SQLite，无需安装第三方依赖。接口和页面同源，默认仅绑定 `127.0.0.1:8791`；没有公网产品所需的账号、权限、审计、并发编辑冲突或多用户隔离机制。演示种子包含医院、商场及两个附近商场展示包；室内图、商户与队列为模拟内容，附近商场的地址与室外锚点来自用户提供资料。真实 HTTP 接口、真实本地数据库持久化，不代表已接入医院、商场或排队业务系统。

## 启动与数据位置

在 `louli-showcase` 根目录执行：

```sh
python3 backend/server.py
```

浏览器打开 `http://127.0.0.1:8791/`。默认路径根据服务脚本位置解析，与启动时的工作目录无关。显式参数如下（相对参数路径按当前工作目录解析）：

```sh
python3 backend/server.py --port 8791 --db backend/runtime/demo.sqlite --data-dir data --frontend-dir frontend
```

数据库首次创建时载入种子，后续启动只补充缺少的种子场馆，不覆盖已有导入及排队修改。退出再启动后修改仍在。`--frontend-dir` 可指定单独的页面目录；仅该目录内部的文件可被访问，路径上跳和指向目录外的符号链接会返回 404。服务不公开 `backend/`、`data/` 或 SQLite 文件。

## API v1

请求及响应 JSON 使用 UTF-8。写操作必须提供 `Content-Type: application/json` 和有效 `Content-Length`。单个请求体最多 **2 MiB**。成功响应如下：

| 方法 | 路径 | 结果 |
| --- | --- | --- |
| GET | `/api/v1/health` | `200 {"status":"ok","apiVersion":1,"storage":"sqlite","localOnly":true}` |
| GET | `/api/v1/nearby-venues` | `200` 附近场馆目录，包含来源状态及重新计算的直线距离 |
| GET | `/api/v1/venues` | `200 {"venues":[{"id","name","type","source"}]}`，按 id 排序 |
| GET | `/api/v1/venues/{id}/bundle` | `200` 完整场馆包，含当前队列 |
| GET | `/api/v1/venues/{id}/queues` | `200 {"queues":[...]}` |
| PUT | `/api/v1/venues/{id}/queues` | 接收 `{"queues":[...]}`，`200` 返回同结构 |
| POST | `/api/v1/imports` | 接收完整场馆包，`201 {"venueId":"custom-id"}` |
| POST | `/api/v1/reset` | 接收 `{}`，`200 {"venuesLoaded":2}`（数量按种子文件计算） |

`PUT queues` 是**全量替换**，不是单行补丁：提交所有要保留的队列；空数组清除该场馆排队信息。更新后同时修改包中的 `catalog.poi[poiId].q`，未在队列里的 POI 移除 `q` 字段。完整包导入时也以顶层 `queues` 为队列事实来源。这样列表、详情与路线等待估算使用一致数据。服务不会自动生成真实客流变化；演示互动和手动编辑才会改变队列。

`POST imports` 按 `venue.id` 新增或整包替换已有场馆。新旧场馆均返回 201。所有校验在写入前完成；任一字段不合法时不写入。写入使用 SQLite 事务。排队与导入采用最后一次成功写入为准，不提供版本冲突检测。

`POST reset` **仅用于本地演示**，会重新载入并覆盖 `--data-dir` 下所有 `.json` 对应的种子场馆，保留其他导入场馆及其队列。所有种子先一起校验，再用一个事务写入；种子缺失、损坏或不合法时保留原数据库。使用前先 GET 完整包保存需要保留的数据。

## curl 示例

以下命令在 `louli-showcase` 根目录执行：

```sh
curl http://127.0.0.1:8791/api/v1/health
curl http://127.0.0.1:8791/api/v1/venues
curl http://127.0.0.1:8791/api/v1/venues/hosp/bundle
curl http://127.0.0.1:8791/api/v1/venues/mall/queues
```

先备份队列，再编辑和恢复：

```sh
curl http://127.0.0.1:8791/api/v1/venues/hosp/queues -o saved-queues.json
curl -X PUT http://127.0.0.1:8791/api/v1/venues/hosp/queues \
  -H 'Content-Type: application/json' \
  --data '{"queues":[{"poiId":"N1","ahead":12,"minutesPerPerson":4,"unit":"人"}]}'
curl -X PUT http://127.0.0.1:8791/api/v1/venues/hosp/queues \
  -H 'Content-Type: application/json' --data-binary @saved-queues.json
```

导入示例包或未来准备好的包：

```sh
curl -X POST http://127.0.0.1:8791/api/v1/imports \
  -H 'Content-Type: application/json' --data-binary @data/mall.json
curl -X POST http://127.0.0.1:8791/api/v1/imports \
  -H 'Content-Type: application/json' --data-binary @my-venue.json
```

恢复演示种子（覆盖种子场馆，保留其他导入场馆）：

```sh
curl -X POST http://127.0.0.1:8791/api/v1/reset \
  -H 'Content-Type: application/json' --data '{}'
```

## schemaVersion 1：场馆包

顶层必填 `schemaVersion`、`venue`、`map`、`catalog`、`queues`。`schemaVersion` 必须是整数 1。未知字段会被拒绝（除各处明确允许的可选字段）。默认格式把可选 `flow` 放在 `catalog` 内，兼容顶层 `flow` 导入并归一化到 `catalog.flow`；同时提供两处时必须内容一致。

最小可用包（可保存为 `my-venue.json`，可按此结构扩展模拟包）：

```json
{
  "schemaVersion": 1,
  "venue": {
    "id": "my-hospital",
    "name": "示例医院",
    "type": "hospital",
    "source": "synthetic",
    "description": "仅模拟内容"
  },
  "map": {
    "width": 20,
    "height": 20,
    "resolution": 0.5,
    "start": {"x": 10, "y": 18},
    "corridors": [[8, 0, 12, 19]],
    "rooms": [
      {"id": "room1", "x0": 0, "y0": 3, "x1": 8, "y1": 9,
       "dx": 8, "dy": 6, "ix": -1, "iy": 0}
    ],
    "fountain": {"x": 10, "y": 1, "r": 0.1},
    "escalator": [10, 2, 11, 3],
    "entrances": [{"x": 10, "y": 20, "t": "入口", "a": "s"}]
  },
  "catalog": {
    "title": "医院", "sub": "单层演示", "unit": "人",
    "cats": {"clinic": ["诊区", "诊", 2]},
    "chips": [["all", "全部"], ["clinic", "诊区"]],
    "favs": ["room1"],
    "sample": {"poi": "room1", "num": "A001"},
    "poi": {
      "room1": {"n": "内科", "s": "普通门诊", "c": "clinic", "q": [2, 3, "人"],
                "docs": ["示例医生"], "info": ["仅演示，非就医建议"]}
    },
    "flow": {"phases": [["room1"]], "labels": ["门诊"]}
  },
  "queues": [{"poiId": "room1", "ahead": 2, "minutesPerPerson": 3, "unit": "人"}]
}
```

### venue

- `id`：1–64 位安全小写 slug，首字符为小写字母或数字，后续可含 `a-z 0-9 _ -`；示例 `hosp`、`mall`、`my-hospital`。
- `name`：1–200 字符；`type`：`hospital` 或 `mall`；`source`：`synthetic` 或 `user-provided`。
- `description`：可选，最多 2000 字符。真实授权资料使用 `user-provided`；仅换一个 source 字段不会将模拟数据变成真实数据。

### map

- `width`、`height`：4–300 的整数栅格尺寸；`resolution`：`0.5` 或 `1`，单位米/栅格。默认 140×84、0.5 米/格，即 70×42 米的局部平面。限制尺寸避免寻路栅格过大。
- `start`：整数栅格坐标，`0 <= x < width`、`0 <= y < height`，并位于某条走廊或某间房间内。该检查只确保起点在可用矩形内，不证明所有 POI 已连通。
- `corridors`：至少 1 条、最多 300 条轴对齐矩形 `[x0,y0,x1,y1]`，要求左上小于右下，坐标在闭区间 `[0,width]`、`[0,height]`。房间、走廊几何边界可以用小数；栅格尺寸仍为整数。
- `rooms`：1–300 个矩形；id 为 1–64 位大小写字母、数字、下划线或短横线的标识，首字符字母或数字，id 必须唯一。门点 `dx,dy` 在地图闭区间内；`ix,iy` 必须是四个单位方向之一 `[-1,0] [1,0] [0,-1] [0,1]`，指向门内。默认详情目标为 `tx=dx+ix*3`、`ty=dy+iy*3`，目标必须在地图内部。门点可为小数。
- `fountain`：必需 `{x,y,r}`，中心在地图闭区间内，半径 0–较短边尺寸。无喷泉可放半径 0 的占位点。
- `escalator`：必需合法矩形；无扶梯可放小矩形占位，用于保持当前渲染结构兼容。占位仍会参与现有地图绘制，请选不妨碍关键通路的位置。
- `entrances`：最多 30 项 `{x,y,t,a}`，允许位于地图外框线上（`x=width` 或 `y=height`）；`t` 为显示名称，最多 200 字符；`a` 为方向文字，最多 20 字符，现有种子用 `s/w/e`。

坐标以左上角为原点，x 向右，y 向下。现有坐标**不是地理经纬度**。地图由房间矩形、走廊矩形、入口和设施构成。

### catalog 与引用

- `title/sub/unit` 必填，每项 1–200 字符。
- `cats`：1–50 个分类，分类值固定为 `[显示名,字形,colorIndex]`，颜色索引为 0–20 整数。
- `chips`：最多 100 项 `[category,label]`；category 必须存在于 cats，或为用于显示全部的 `all`。
- `favs`：POI id 数组；`sample`：`{poi: POI id, num: 示例叫号文字}`。
- `poi`：**每个房间都必须恰好对应一个同 id 的 POI**，不允许多出或缺失。每项必填 `n` 名称、`s` 描述（可以为空）、`c` 分类 id。
- POI 可选 `r` 评分 0–5、`p` 非负价格、`q` 队列 `[ahead,minutesPerPerson,unit]`、`tags/menu/docs/info` 字符串数组、`deals` 的 `[标题,价格,原价]` 数组、`rev` 的 `[作者,评论]` 数组。各类列表最多 100 项；名称最多 200 字符，常规文本最多 2000 字符。
- 可选 `catalog.flow`：`{phases:[[poiId,...],...],labels:[文字,...]}`，phases 与 labels 等长，最多 30 阶段，所有 POI id 必须有效。前端读取 `catalog.flow`。

### queues

每项仅包含 `poiId`、`ahead`、`minutesPerPerson`、`unit`。POI id 必须存在且队列中不重复；`ahead` 为 0–1,000,000 的整数；`minutesPerPerson` 为大于 0、最多 10,000 的有限数字（最小接受 0.000001）；`unit` 为 1–20 字符。最多 300 条。估计等待时间为 `ahead × minutesPerPerson`，属于展示估算。

通用限制：文本最多 2000 字符、字段名最多 100 字符、对象最多 1000 字段、通用数组最多 1000 项、嵌套最多 12 层；数字必须有限且绝对值不超过 10 亿，业务字段另有更小范围。JSON 不允许重复键。拒绝 NaN、Infinity、布尔值冒充业务数字，以及路径型场馆 id。

## 将来导入模拟包或真实地图

模拟包：复制现有种子或最小包，修改场馆 id、内容、地图与队列；保持所有房间和 POI 的 id 一一对应，用接口导入。页面从服务端读取当前场馆列表及包，不需将未来数据写进页面代码。

真实地图：先取得地图资料的使用授权，确认真实楼层、尺度、入口、可通行区域、房间用途及门点。将源图坐标投影或转换为**米制局部平面坐标**，完成尺度与方向标定，再按分辨率除成当前栅格坐标，映射成此处的矩形 rooms/corridors。正确填写门点和门内方向，并检查导航连通性后导入 `source: user-provided` 的包。客户名称、个人信息、诊疗或真实排队数据只应在具有授权的数据范围内整理。

当前提供的是统一 JSON 包导入入口和地图数据格式预留。**尚未实现任意 CAD、DWG、PDF 平面图、GeoJSON、多边形、任意地理坐标或多楼层自动导入**，也没有室内实时定位、消防通行或无障碍路线认证。真实地图适配器需要另行开发并实地验证；先整理成当前单层轴对齐矩形格式才可导入。真实排队系统则可由后续适配器调用 PUT queues，当前服务本身不会访问业务平台。

## 错误与验证

API 错误统一形如：

```json
{"error":{"code":"validation_error","message":"map.width must be between 4 and 300"}}
```

| 状态 | code | 含义 |
| --- | --- | --- |
| 400 | `invalid_json` | 不是有效 UTF-8 JSON 对象，含重复键或非法常量 |
| 404 | `venue_not_found` / `not_found` | 场馆、接口或允许的静态文件不存在 |
| 405 | `method_not_allowed` | 已知资源不支持该方法 |
| 411 | `length_required` | 缺少或无效 Content-Length |
| 413 | `body_too_large` | 请求体超过 2 MiB |
| 415 | `unsupported_media_type` | Content-Type 不为 application/json |
| 422 | `validation_error` | schema、几何、引用、队列或种子校验失败 |
| 500 | `storage_error` | 本地文件或数据库读写失败 |

运行测试：

```sh
python3 -m unittest discover -s tests -v
```

测试先确认缺失服务的失败，再实现；覆盖导入/覆盖、UTF-8、API 读取、队列持久化与事务、失败 reset 保留数据、请求大小、路径及符号链接逃逸、边界入口、原始小数门点和 flow 兼容。所有测试使用临时 SQLite、临时种子、临时页面与随机本机端口，不改实际演示数据。

## 附近场馆目录与地点元数据

`GET /api/v1/nearby-venues` 读取 `data/context/nearby-venues.json`，不加入 SQLite 场馆种子。目录缺失返回空列表；无效目录返回422。结构示例见该文件：schemaVersion为1，crs为WGS84，origin包含id/name/lat/lon，venues包含id/name/category/address/lat/lon/data_status/map_url。可选source_url、distance_straight_m。距离由后端按球面直线距离重新计算并排序，不作为步行路线。静态前端副本在frontend/data/nearby-venues.json；修改目录时需同时更新离线副本。

场馆包的venue允许location和indoorStatus。location必须完整包含crs(WGS84)、lat、lon、address、mapUrl(HTTPS OpenStreetMap链接)、dataStatus、distanceStraightM、anchorId。经纬度是室外信息，与map内的栅格坐标分开保存。indoorStatus可为demo_simulated或user_provided；存在location时必须显式填写。source描述室内数据来源，含真实室外信息的模拟包仍使用synthetic。

锚点状态：outdoor_anchor_real_osm是室外地点；hospital_polygon_real_osm是院区参考点；nearby_entrance_poi_real_osm是入口或公交站附近参考点；official_address_campus_anchor_osm仅是官方地址对应校园范围参考点，不能当作医院建筑入口。原始状态由提供资料保留，并非本项目新做的测绘认证。

两个完整实例是data/yintai-demo.json和data/xixi-demo.json，可通过已有POST imports导入；地点元数据随包存入SQLite，接口校验异常不写入。室内地图仍按前述单层格式整理。硬件登记、设备遥测、定位服务和实际商户叫号接口仍未实现。
