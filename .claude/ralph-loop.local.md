---
active: true
iteration: 1
max_iterations: 20
completion_promise: "PROJECT_DONE"
started_at: "2026-01-19T07:13:35Z"
---

你是一个在本地 git repo 中工作的 AI 工程师。你的任务是在当前已存在的仓库目录中，从零实现一个叫「job-radar」的最小可用网站（MVP），并通过可验证的 Playwright 端到端测试作为完成条件。

========================
0) 最高优先级原则（必须遵守）
========================
- 不要跳过测试。每个迭代结束必须运行 Playwright E2E，并确保通过。
- 所有变更都必须通过 git 记录：每轮至少 1 个 commit，带清晰信息。
- 本阶段禁止 git push（先只做本地 commit，等你确认后再开启 push）。
- 所有需求、变更、总结都必须以文件形式写入 docs/ 下（文件系统驱动）。
- 避免依赖 LinkedIn 抓取（反爬太强）。优先使用各公司官方 ATS / careers JSON / RSS / 公开 API。若找不到 JSON，则使用 Playwright 浏览器抓取并结构化输出。
- 不做 research / 模型训练。目标是工程可用、可维护、可测试的产品原型。

========================
1) MVP 产品目标（V1）
========================
实现一个网页应用：
A. 点击按钮即可启动抓取/更新岗位
B. 从以下公司抓取“最新发布”的岗位（尽可能按发布时间排序）：
   - Anthropic, OpenAI, Amazon, Stripe, Apple, Databricks, Glean, Google, Meta, Sentry
C. 将抓取到的岗位与“我的岗位偏好”进行匹配：
   - matched：显示在结果表格
   - not matched：可不显示（或放到折叠区）
D. UI 展示要求：
   - 按公司分组
   - 每个公司内部按“最新发布”排序（若无法可靠获取发布时间，则按抓取顺序/站点排序逻辑并说明）
   - 用 HTML table 显示：Title | Team/Category(若有) | Location(若有) | Posted(若有) | Match score(可选) | Short snippet | Link
   - 每个岗位必须有 Link（点开看详情）
E. 偏好设置：
   - 页面上可编辑“Looking for / Not looking for”文本（默认填入下面给定内容）
   - 必须保存在本地（localStorage 或 IndexedDB 均可），刷新后仍保留
   - 必须保留上一次搜索结果（本地存储），刷新后仍能看到上一次结果，直到下次更新
F. 抓取策略：
   - 先为每家公司找到其 ATS / careers 列表入口和可用 JSON（如果有）
   - 通过公司域名与 careers 列表拿到结构化数据（优先 JSON）
   - 拿不到 JSON 就用 Playwright 抓取页面（仅抓列表页所需字段）

========================
2) 我的岗位偏好（必须内置默认值，可在 UI 修改）
========================
Looking for（默认值）：
- Senior / Staff level AI engineering 或 distributed system 相关，偏工程问题（非 research）
- 擅长方向（关键字 / 语义匹配都可以）：
  - Distributed Systems: consistency, failure recovery, idempotency, long-running workflows, cross-service orchestration
  - Workflow Orchestration: durable execution, failure-aware workflows, compensation vs fix-forward, Temporal-like systems
  - Multi-Agent Orchestration: coordination, role separation, capability boundaries, tool contracts, sandboxing
  - Distributed AI Systems: treat LLM/agents as unreliable components, production hardening and governance
  - Observability & Reliability: tracing/metrics at workflow/agent level, failure mode analysis, debuggability-first

Not looking for（默认值）：
- Pure AI research / model training / algorithm papers
- Prompt-only roles with no system complexity
- Pure frontend roles

匹配逻辑（V1）：
- 先做一个可解释的 rule-based matching（关键词/否定关键词/权重），输出 match = true/false 和可选 score
- 在 docs/requirements.md 说明匹配规则与可改进点

========================
3) 技术栈要求（V1）
========================
- 前端：React + Vite + TypeScript
- 后端：Node（Express 或 Fastify）+ TypeScript（用于抓取与缓存）
- 包管理：pnpm
- E2E：Playwright（必须）
- 存储：
  - 服务端：抓取结果缓存到本地文件（例如 data/jobs.json），便于调试与回放
  - 客户端：localStorage 保存偏好与上次结果（或保存一个 jobs snapshot）

========================
4) 项目结构（必须创建并遵守）
========================
job-radar/
  app/
    web/
    api/
  e2e/
    tests/
    artifacts/
    playwright.config.ts
  docs/
    requirements.md
    changelog.md
    retrospective.md
    sources.md
  scripts/
    dev.sh
    test-e2e.sh
  agent.md
  README.md

说明：
- 当前 repo 名不必叫 job-radar，但必须在 repo 内创建上述目录结构。
- 所有脚本必须可执行（chmod +x）。

========================
5) 迭代循环流程（每轮必须执行）
========================
每一轮迭代你都必须：
1) 读取 docs/requirements.md，确认本轮要完成的子目标
2) 编码实现
3) 运行 scripts/test-e2e.sh（包含：启动 api、启动 web、运行 playwright test、输出 artifacts）
4) 若失败：修复并重复测试直到全绿
5) 全绿后：
   - 更新 docs/changelog.md（本轮变更 + 新增/修复点 + 未解决问题）
   - git add -A
   - git commit -m "[round-X] <clear summary>"
   - 本阶段禁止 git push
6) 进入下一轮

========================
6) Playwright E2E 测试要求（完成条件的核心）
========================
必须覆盖：
(a) 打开页面 -> 偏好设置可见且有默认值
(b) 修改偏好设置 -> 刷新后仍保留
(c) 点击 Update Jobs -> loading -> 完成后出现结果
(d) 结果按公司分组展示
(e) 为 10 家公司分别验证：company section 存在；若 0 jobs 必须显示明确提示并在 sources.md 解释
(f) 每条岗位必须有 link（href 非空）
配置：trace on；产物输出到 e2e/artifacts/

========================
7) 数据源与 ATS 发现（必须输出到 docs/sources.md）
========================
为每家公司记录：
- careers 入口 URL
- 是否有 JSON/API（若有，记录 URL 和字段映射）
- 若无 JSON：Playwright 抓取 URL 与选择器策略
- 风险/限制
不要依赖 LinkedIn 列表。

========================
8) 完成条件（Completion Promise）
========================
当且仅当以下全部满足时，你才可以在最后一行输出：PROJECT_DONE（必须是最后一行且仅输出该词；不得在中途提及 PROJECT_DONE）
1) Web + API 可通过 scripts/dev.sh 一键启动
2) 点击按钮可抓取并显示岗位（至少基本可用）
3) 偏好设置可编辑、可本地持久化，刷新保留
4) 上次搜索结果可本地保留，刷新仍可见
5) docs/requirements.md, docs/changelog.md, docs/sources.md, docs/retrospective.md 完整存在并有内容
6) README.md 说明：这是 AI Agent 驱动实验；如何运行；测试方法；AI 做了什么（链接 changelog / retrospective）
7) Playwright E2E 全绿（0 failures），覆盖 10 家公司（允许 0 jobs 但有明确提示）
8) 代码已按每轮 commit（本阶段不要求 push）

========================
9) 第一轮计划
========================
第一轮先完成：
- 目录结构与最小骨架（web+api）
- scripts/dev.sh 与 scripts/test-e2e.sh 可跑
- docs/requirements.md、agent.md、README.md 初版
- Playwright smoke test：页面可打开
第一轮不强制抓取 10 家公司，但必须保证测试链路跑通并 commit。

现在开始。
