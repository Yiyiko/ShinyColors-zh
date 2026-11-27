# ShinyColors-zh

偶像大师闪耀色彩（THE iDOLM@STER SHINY COLORS）网页版汉化脚本（主测桌面版 **Firefox + Violentmonkey**）与持续更新的翻译数据发布流水线。

> **译文使用声明**：录剧情视频到公开网站请先取得对应译者同意。本仓库代码采用 MIT 协议开源，翻译文本数据直接复用自社区仓库 [`ShinyGroup/SCTranslationData`](https://github.com/ShinyGroup/SCTranslationData) 并保留全部译者署名，不声明对社区译文的版权。

## 安装（PC Firefox）

1. 在 Firefox 安装 [Violentmonkey（暴力猴）](https://addons.mozilla.org/firefox/addon/violentmonkey/) 扩展。
2. 安装本仓库构建发布的 `ShinyColors-zh.user.js`（当前处于 P0 开发阶段，可通过本地构建的 `dist/ShinyColors-zh.user.js` 安装验证）。
3. 打开 <https://shinycolors.enza.fun/>，打开浏览器开发者工具控制台确认看到 `[ShinyColors-zh]` 启动日志。

## 本地开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

构建产物位于 `dist/ShinyColors-zh.user.js`。

## 致谢

- 感谢原汉化脚本项目 [`biuuu/ShinyColors`](https://github.com/biuuu/ShinyColors)
- 感谢社区翻译仓库 [`ShinyGroup/SCTranslationData`](https://github.com/ShinyGroup/SCTranslationData) 及其全体译者
