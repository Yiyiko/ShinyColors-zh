# 翻译与开发贡献指南（CONTRIBUTING）

欢迎提交人工翻译修订、新增剧情补译或代码改进。

---

## 1. 翻译数据目录约定

- `data/upstream/`：**禁止手工修改**。由 CI 定时从 `ShinyGroup/SCTranslationData@master` 同步。
- `data/local/`：存放本项目的人工修订与补译（例如 `data/local/story/.../*.csv`）。
- `data/ai/`：存放经离线脚本 `pipeline/translate-ai.ts` 生成的 AI 补译（`译者` 行必须标注为 `AI(<模型名>)`）。

合并优先级：`upstream > local > ai`。因此一旦社区上游补齐人工译文，本项目对应的 AI 译文会在构建时自动退让。

---

## 2. 剧情 CSV 格式与规范

- 编码统一 **UTF-8（无 BOM）+ LF**。
- 标准表头：`id,name,text,trans`
- 必须包含 `info` 行（`name` 列填相对逻辑路径，如 `mypage_communications/490160001.json`）与 `译者` 行（`name` 列填译者名或 `AI(模型名)`）。
- 换行使用字面量 `\n`。
- 请遵守社区翻译规范（全角逗号 `，`、全角波浪号 `～`、标准省略号 `……`、标准破折号 `——`、不用 `『』`、不将 `ちゃん/さん` 译为 `酱/桑`、选项单行 ≤ 11 字、小框单行 ≤ 17 字，并遵循角色/组合固定译名表）。

提交前请运行校验：

```bash
pnpm run pipeline:lint
```

---

## 3. 使用脚本内置工具提取与预览译文

1. 在游戏中点开任意剧情后，打开 Violentmonkey 菜单 → **导出当前剧情原文 CSV**。
2. 翻译完成后，通过菜单 → **导入本地剧情 CSV 预览** 载入文件，重新进入该剧情即可实时预览排版效果。
3. 确认无误后将 CSV 放入 `data/local/story/` 并提交 PR。
