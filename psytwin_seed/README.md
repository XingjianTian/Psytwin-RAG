# PsyTwin 心理健康知识库种子资料

这个目录用于让同事在 clone `Psytwin-RAG` 后，使用自己的阿里云百炼 API Key 重新构建 PsyTwin 心理健康知识图谱。

它不保存你的运行时向量库、LLM 缓存或私有 API Key，只保存可重新导入的 Markdown 种子资料和导入脚本。

## 使用前提

1. 已经启动 LightRAG 服务。
2. LightRAG `.env` 中已经配置阿里云百炼模型和 `LIGHTRAG_API_KEY`。
3. 当前服务最好是空知识库。如果已经导入过同名文件，脚本会跳过 409 冲突文件，避免重复导入。

## 一键导入

在 LightRAG 仓库根目录执行：

```powershell
$env:LIGHTRAG_URL="http://localhost:9621"
$env:LIGHTRAG_API_KEY="psytwin-local-rag-key"
node .\psytwin_seed\import-seed.mjs
```

如果你的 LightRAG 服务地址或 API Key 不同，替换上面两个环境变量即可。

## 只检查不导入

```powershell
node .\psytwin_seed\import-seed.mjs --dry-run
```

## 导入完成后

打开：

```text
http://localhost:9621
```

进入“知识图谱”页面，默认会以 `label=*`、`max_depth=3`、`max_nodes=1000` 读取全局图谱。首次生成会受模型输出影响，节点数和边数不保证逐字一致，但主题结构、检索能力和页面效果应与 PsyTwin 当前部署保持一致。

如果必须获得完全一致的节点、边、向量和缓存结果，需要通过私有渠道迁移 `data` 运行态目录，而不是重新跑 LLM。
