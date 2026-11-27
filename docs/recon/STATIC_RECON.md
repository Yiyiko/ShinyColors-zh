# 静态侦察报告（Static Recon）

> 分析时间：2026-11-27（游戏维护更新窗口）
> 样本来源：公开静态前端文件（未登录，未触碰任何账号数据或加密算法复刻）
> - 旧构建：`app-cf9560e28bc9ed119489.js`（`X_VERSION: '416'`，约 3.82 MB）
> - 新构建：`app-7f823508bcfb71a3b5eb.js`（`X_VERSION: '417'`，约 3.84 MB）
> - 引擎文件：`enza-game.min.js?v=3eec969d848400b5e5162fedaefff634ce6f7ae4`（约 701 KB）

---

## 1. 跨构建变化核实

| 项目 | 旧构建 (`416`) | 新构建 (`417`) | 架构结论 |
|---|---|---|---|
| 主包文件名 | `app-cf9560e28bc9ed119489.js` | `app-7f823508bcfb71a3b5eb.js` | 每次更新变哈希，用作模块定位缓存键 |
| webpack chunk 全局变量 | `self.ybndqvpnnyy3vp` | `self.h1nbtcfobfbcco` | **每次构建随机变化**，必须动态探测 |
| `__webpack_require__` 形式 | 标准 webpack 5 函数体 | 完全一致 | 源码特征正则可作为可靠回退方案 |
| `ezg` 模块 ID | `77528` | `77528`（内部引用），外围模块 ID 出现漂移 | 硬编码 ID 仅作提示，主路径走工厂源码预筛 + 导出签名扫描 |

---

## 2. 关键注入点静态分析结论

### 2.1 引擎对象 `window.ezg`（原 `AOBA`）
- 模块 `77528` 读取 `window.ezg` 后立即将 `window.ezg = null`。
- **对策**：在 `@run-at document-start` 阶段通过 `Object.defineProperty(window, 'ezg', ...)` 提前截获对象引用，同时保留原有读写行为，不干扰游戏内部清理。

### 2.2 剧情加载器 `SCENARIO`（模块 `11254`）与路径格式
- 模块 `11254` 导出未冻结对象 `A = { _errorEvent, setErrorEvent, load(path, handleError=true, isAssetMap=false), _handleError }`。
- 上层封装模块 `1935` 调用方式为：
  `path.join(ASSET_ROOT, SCENARIO_PATH, relativePath)` → 传入 `11254.A.load(fullPath)`。
- 结合旧项目 `type.replace(/^\/assets\/json\//, '')` 印证：传给 `load` 的明文逻辑路径形如 `/assets/json/mypage_communications/490160001.json`，剥离 `/assets/json/` 前缀即与 `SCTranslationData` 的 CSV `info` 路径严格对应。
- `load` 内部在解密资源后通过 `JSON.parse` 返回明文对象 Promise。包装 `load` 并保持原 Promise 语义（不吞异常）是最稳健的剧情注入点。

### 2.3 UI 词条 `PHRASE`（模块 `40257`）
- 模块 `40257` 导出未冻结的单例类实例 `A`，初始状态 `_locale = "ja"`、`_polyglot = null`。
- 游戏后续调用 `A.init(phrases, locale)` 初始化 `this._polyglot = new Polyglot({ phrases, locale })`。
- **修复旧项目隐患**：旧项目以 `mod.A._polyglot.phrases` 作为定位条件，若在 `init()` 之前探测会失败。新版定位器改为检测 `init`/`t`/`_polyglot` 成员，并在 `init` 前后均可无竞态注入译文。

### 2.4 PIXI 文本（`enza-game.min.js` + 模块 `38304`）
- `enza-game.min.js` 的 `ezg.Text.prototype` 保留标准 `text` getter/setter 与 `updateText(respectDirty)`。
- 模块 `38304` 挂载 `ezg.Text.prototype.typeText(text, clear)` 实现逐字打字机动画（通过 `this.ezgUpdate` 逐字符累加 `this.text`）。
- **对策**：只在外层包装 `typeText` 与 `updateText`（或 `text` setter），严禁复制压缩后的引擎内部渲染逻辑；用 `typeText` 栈防止逐字打印期间被静态词典误替换。

### 2.5 API 客户端（模块 `96525`）
- 模块 `96525` 导出经 `Object.freeze` 冻结的 API 客户端对象 `A`（含 `get/post/put/patch/delete/request/_addQueue/_request/_encryptRequest`）。
- 所有请求通过内部串行队列 `L.enqueue({ method, path, options, resolve })` 调 `this._queue.push(...)` 入队；收到密文响应后由游戏自身 wasm 解密并 `JSON.parse` 写入 `res.body`，随后调用 `resolve(res)`。
- **对策**：**不再全局破坏 `Object.freeze`**。通过精准守卫捕获队列对象（校验对象同时具有 `method`、`path`、`options`、`resolve`）并在 `resolve` 之前处理 `res.body`，具体运行态表现由 P1 侦察脚本实测核实。

### 2.6 资源加载器（`enza-game.min.js` + 模块 `5431`/`1025`/`85674`）
- `enza-game.min.js` 中 `ezg.loaders.Resource.prototype._loadElement(type)` 仍然存在，负责创建 `Image` 并设置 `this.data.src = this.url`。
- 模块 `5431` 管理 `asset-map.json` 查询参数 `?v=<hash>`；模块 `1025` 提供 `isSupportedWebP`/`isWebPResource`/`toWebPUrl`；模块 `85674` 调用 `98547` 加密资源路径。
- **待 P1 运行态核实**：`_loadElement('image')` 执行时 `this.name` 是否保持明文逻辑路径以及 `this.url` 的 query 格式。

---

## 3. 开服后 P1 运行时验证清单

1. 启动 `pnpm dev:recon`，在 Firefox + Violentmonkey 中打开 `http://127.0.0.1:8787/recon.user.js` 安装侦察脚本。
2. 登录 https://shinycolors.enza.fun/，依次访问：主页 → 任意已解锁剧情回放 → 任务 → 道具 → 偶像/技能详情 → 相册。
3. 核实 `docs/recon/runtime-report.json` 与 `fixtures/` 中的 7 项运行时数据：
   - `boot`（require + ezg 捕获方式与耗时）
   - 全部模块定位 ID 与导出结构
   - `SCENARIO.load` 实际传入的剧情路径与明文数组结构（至少 3 段）
   - `PHRASE` 词条键数量与样例
   - `Text.prototype.typeText` / `text` setter 调用采样
   - API 队列捕获到的逻辑 `path` 与 `res.body` 顶层键（至少 5 个接口）
   - `_loadElement('image')` 的 `this.name` 与 `this.url` 映射样本
