# 后端验证记录

2026-10-07，本机 Python 3.9，标准库 unittest。

测试先于服务代码编写：首次运行 7 条测试全部失败，原因是 `backend/server.py` 尚未实现。后续增加原始小数几何、catalog.flow、超大整数、失败种子重载、UTF-8 surrogate 和小数边界目标的测试，并分别观察对应失败后实现修正。

最终命令：

```sh
python3 -m unittest discover -s outputs/louli-showcase/tests -v
```

结果：**Ran 14 tests, OK**。测试使用临时数据库、种子、前端目录及随机本机端口；没有修改真实展示数据库。

额外真实种子烟雾检查：以临时 SQLite 启动服务，读取项目 data/hosp.json 和 data/mall.json；`GET health`、`GET venues`（2 个场馆）及两套 `GET bundle` 均返回 200，种子完整校验通过。

覆盖范围：完整包读写/upsert、错误导入保留旧数据、队列更新持久化及原子性、seed reset/失败 reset、JSON/2MiB 限制、静态目录上跳和符号链接逃逸、引用完整性、数字范围、边界入口、小数几何、catalog/top-level flow 兼容。前端视觉和浏览器操作由主任务另行验证。

2026-10-08 推送前新增重置保留自定义地图及队列的回归测试：先观察404失败，修正种子重载后15项通过。
