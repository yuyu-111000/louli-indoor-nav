# 楼里硬件概念方案

- `hardware-design.pdf`：6页A4设计稿。
- `hardware-design.tex`：可编辑LaTeX源文件，与两张PNG放在同一目录。
- `BOM.csv`：UTF-8 BOM编码，12个零件/服务条目，适合Excel打开；两条路线互斥。
- `concept.png` / `exploded.png`：分别通过内置imagegen生成的概念图与爆炸图。
- `image-prompts.json`：两次生成的完整提示词。
- `sources.md`：厂商主来源、访问日期及使用边界。

## 验证
已用现有XeLaTeX导出6页PDF，并用系统Poppler渲染检查全部6页；中文、图像、表格、页码显示正常，最终编译日志无Overfull警告。CSV编码、12行数量及两条路线成本合计已独立校验。

内置LaTeX编辑器已打开源文件，调用原生编译后因不支持伴随PNG图片资源而失败；这不影响已导出的PDF，但当前原生预览不能确认成功。无需安装TeX。

## 方案边界
这是工程评审前的概念稿，不是可直接制造的CAD/电路资料。价格为预算估算，不是采购报价；尺寸、射频、供电、寿命、手机链路、精度与整机合规均需实物验证。
