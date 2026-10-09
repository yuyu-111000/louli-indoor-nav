# 楼里界面字体

`louli-ui-sans.woff` 是 Noto Sans SC 2.04 的界面文字子集，包含当前 `frontend/` 文本文件使用的字形、基本拉丁文字与常用标点，保留 400–600 的可变字重。源文件来自本机已有的 `NotoSansSC-VF.ttf`，没有新增字体下载或运行依赖。

修改后的字体名称为 Louli UI Sans。完整版权与 SIL Open Font License 1.1 见 [OFL.txt](OFL.txt)。新增文字若超出子集，会使用页面声明的系统中文字体；大标题使用原字体。

这是接近 Claude 界面的无衬线字体方案，并未附带 Anthropic 专有字体。`typography.css` 在系统已有 Anthropic Sans 时优先使用它，其他环境使用自托管字体。
