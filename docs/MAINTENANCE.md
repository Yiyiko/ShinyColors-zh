# 维护与故障排查指南（MAINTENANCE）

当《偶像大师 闪耀色彩》前端更新导致部分或全部汉化失效时，请按以下标准流程快速定位并修复。

---

## 1. 第一时间打开诊断面板定位故障层

在游戏页面点击 Violentmonkey 图标 → **打开 ShinyColors-zh 诊断面板**，逐项检查：

1. **Boot 捕获**：
   - `require: FAIL (timeout)`：
     - 说明 webpack chunk 全局数组探测和 `Function.prototype.call` 正则回退均未命中。
     - 检查新主包 `app-<hash>.js` 中的 `__webpack_require__` 函数体格式是否变化，更新 [src/boot/capture-require.ts](../src/boot/capture-require.ts) 中的 `WEBPACK_REQUIRE_REGEX` 或 chunk 探测条件。
   - `ezg: FAIL (timeout)`：
     - 检查页面 `<script src="/enza-game.min.js">` 加载时机或全局对象名是否变化，更新 [src/boot/capture-ezg.ts](../src/boot/capture-ezg.ts)。
2. **模块定位（Locator）**：
   - 正常情况下模块 ID 变化不会导致失效（定位器通过 `factoryHints` 扫描全部 `require.m` 并按 `app-<hash>.js` 缓存）。
   - 若某模块显示 `not-found`：
     - 运行下方第 2 节的侦察工具检查新主包中该模块的工厂源码关键词或导出成员是否改名；
     - 更新 [src/locator/signatures.ts](../src/locator/signatures.ts) 中的 `factoryHints` / `matchExports` 与 `hintIds`。
3. **Hook 状态**：
   - 单个 hook 显示 `failed` 时，查看面板底部“最近错误”或点击“复制报告”获取异常堆栈；单个 hook 异常会自动隔离，不会导致游戏白屏。
4. **数据层**：
   - 若 `source` 显示“加载失败”，检查 https://yiyiko.github.io/ShinyColors-zh/manifest.json 与 https://cdn.jsdelivr.net/gh/Yiyiko/ShinyColors-zh@gh-pages/manifest.json 的可达性；可在菜单中临时清空缓存或切换自定义源。

---

## 2. 运行 P1 侦察套件采集最新运行态证据

```bash
pnpm run dev:recon
```

1. 暂时在 Violentmonkey 中**停用**正式版脚本，打开 `http://127.0.0.1:8787/recon.user.js` 安装 `[DEV 侦察] 偶像大师闪耀色彩 Recon`。
2. 打开游戏并依次进入主页、任意剧情回放、任务、道具、偶像详情与相册。
3. 侦察脚本会自动脱敏并回传采样结果到：
   - `docs/recon/runtime-report.local.json`（模块导出键、剧情路径、词条数量、文本采样、API 路径与资源图片采样）
   - `fixtures/story/*.local.json` 与 `fixtures/api/*.local.json`
4. 侦察完成后**停用侦察脚本**并重新启用正式版脚本。

---

## 3. 回归验证与发版清单

1. 修改代码后本地运行全量验证：
   ```bash
   pnpm typecheck
   pnpm test
   pnpm run pipeline:lint
   pnpm build
   pnpm run build:recon
   ```
2. 语义化升级版本号：同步更新 [package.json](../package.json) 的 `version` 与 [src/meta.ts](../src/meta.ts) 的 `APP_VERSION`（确保 `@version` 与 `manifest.version` 一致）。
3. 推送到 `main` 后，确认 GitHub Actions 的 **CI** 与 **Sync Upstream & Deploy Pages** 全部变绿，并验证线上 `manifest.json` 版本已刷新。
