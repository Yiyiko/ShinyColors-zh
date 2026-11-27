# 离线数据流水线

本目录将在 P4/P5 实现以下脚本：
- `sync-upstream.ts`：拉取 `ShinyGroup/SCTranslationData@master` 至 `data/upstream/`
- `merge.ts`：按 `upstream > local > ai` 优先级合并翻译数据
- `lint.ts`：校验 CSV 结构、标点规范、译名表与字数规则
- `build.ts`：生成 `dist/manifest.json`、`dist/story-index.json` 与按内容 hash 命名的数据文件
- `translate-ai.ts`：离线 LLM 补译与自动 lint 校验
