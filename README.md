# ShinyColors-zh

偶像大师闪耀色彩（THE iDOLM@STER SHINY COLORS）网页版中文汉化脚本与自动化翻译数据发布流水线，主测桌面版 **Firefox + Violentmonkey（暴力猴）**。

> **重要声明**：
> 1. 录制包含他人译文的剧情视频发布至公开网站前，请先取得对应译者同意。
> 2. 本仓库代码采用 [MIT License](./LICENSE) 开源；社区中文译文数据直接复用自 [`ShinyGroup/SCTranslationData`](https://github.com/ShinyGroup/SCTranslationData) 并保留全部译者署名，本项目不主张对社区译文的版权。
> 3. 本项目仅在浏览器内存中替换游戏客户端已解密加载的显示文本与 UI 贴图，不逆向加密算法、不篡改请求内容、不提供任何自动化操作功能。

---

## 一键安装（桌面版 Firefox）

1. 在 PC 版 Firefox 安装扩展：[Violentmonkey（暴力猴）](https://addons.mozilla.org/firefox/addon/violentmonkey/)。
2. 打开本项目的 GitHub Pages 发布页并点击安装脚本：
   - **一键安装页**：https://yiyiko.github.io/ShinyColors-zh/
   - **脚本直链**：https://yiyiko.github.io/ShinyColors-zh/ShinyColors-zh.user.js
   - **备用镜像（jsDelivr）**：https://cdn.jsdelivr.net/gh/Yiyiko/ShinyColors-zh@gh-pages/ShinyColors-zh.user.js
3. 打开游戏 https://shinycolors.enza.fun/ 即可自动加载汉化（脚本通过 `@updateURL` 自动检查更新）。

---

## 菜单与功能说明

点击浏览器工具栏的 Violentmonkey 图标，可在菜单中使用以下功能：

| 菜单项 | 说明 |
|---|---|
| **打开 ShinyColors-zh 诊断面板** | 展示 Boot 捕获方式、webpack 模块定位 ID、6 大 Hook 状态、数据源版本/上游 commit、当前剧情译文覆盖率与一键复制诊断报告 |
| **切换汉化总开关（刷新后生效）** | 关闭后游戏完全恢复日文原样，不注入任何钩子 |
| **导出当前剧情原文 CSV** | 将刚加载的剧情导出为社区标准格式 CSV（含 `info` 与 `译者` 行），便于补译或纠错 |
| **导入本地剧情 CSV 预览** | 选择本地翻译好的 CSV 载入当前会话预览，重新进入对应剧情立即生效 |
| **导出本次未翻译剧情清单** | 导出本次游玩过程中遇到但尚未有译文的剧情原文包（`.json`），供人工或离线 AI 补译使用 |
| **设置自定义数据源 URL** | 默认依次尝试 GitHub Pages → jsDelivr；可填写自定义地址（如本地联调 `http://127.0.0.1:8787/`） |
| **清空本地翻译缓存** | 清除 IndexedDB 中缓存的 `manifest.json`、词典与剧情译文 |

---

## 数据同步与优先级架构

GitHub Actions 每日定时（北京时间 04:00）自动从 `ShinyGroup/SCTranslationData@master` 拉取最新译文并构建发布至 `gh-pages` 分支。合并同一剧情或词条时严格遵守：

`upstream（社区人工译文） > local（本项目人工修订） > ai（AI 机翻补译）`

当社区上游补充了人工译文时，构建流水线会自动跳过对应 AI 译文，并在 `build-report.json` 中记录可清理清单。

---

## 本地开发与维护命令

```bash
# 安装依赖
pnpm install

# 类型检查与单元测试
pnpm typecheck
pnpm test

# 构建正式版 / P1 侦察版油猴脚本
pnpm build
pnpm run build:recon

# 启动本地侦察与静态数据联调服务（http://127.0.0.1:8787）
pnpm run dev:recon

# 完整数据同步、规范校验、构建与本地发布 gh-pages
pnpm run pipeline:sync
pnpm run pipeline:lint
pnpm run pipeline:build
pnpm run pipeline:deploy

# 离线 AI 补译（密钥仅通过环境变量传入，绝不写入仓库）
# 支持 GEMINI_API_KEY 或 OPENAI_API_KEY（+ 可选 OPENAI_BASE_URL）
$env:GEMINI_API_KEY = "<your-key>"
pnpm run pipeline:ai -- path/to/story.csv --model=gemini-2.5-flash
```

更多排查与协作说明请查看：
- 维护与故障排查指南：[docs/MAINTENANCE.md](./docs/MAINTENANCE.md)
- 翻译贡献指南：[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)
- 静态侦察笔记：[docs/recon/STATIC_RECON.md](./docs/recon/STATIC_RECON.md)

---

## 致谢

- 感谢原项目 [`biuuu/ShinyColors`](https://github.com/biuuu/ShinyColors) 的开拓性设计与实现
- 感谢 [`ShinyGroup/SCTranslationData`](https://github.com/ShinyGroup/SCTranslationData) 社区及其全体译者长期以来的无私贡献
