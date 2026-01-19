# 🎯 Job Radar - 智能职位聚合器

> 一个智能的职位聚合器，从 10 家主要科技公司抓取职位信息，并使用复杂的多阶段评分算法进行匹配。

不再需要每天手动检查 10+ 个招聘页面。Job Radar 自动化职位发现，智能匹配您的偏好设置，只展示真正重要的机会。

## ✨ 核心功能

### 🎪 智能匹配算法
- **8 阶段评分系统** - 包含用户偏好、资历等级、技术领域和角色验证
- **基于短语的匹配** - 2-3 个词的短语得分比单个关键词高 2.5 倍
- **自动排除** - 过滤不需要的角色（研究、销售、前端等）
- **20% 匹配阈值** - 确保只显示相关职位（2026-01-19 优化：从 25% 降低到 20%）
- **百分比评分** - 25-100% 的分数帮助优先级排序
- **职位标题 2x 权重** - 标题匹配比其他字段更重要（2026-01-19 新增）

### 🏢 10 家主要科技公司
| 公司 | 数据源 | 准确度 |
|---------|-------------|----------|
| Anthropic | Greenhouse API | ✓ 官方 - 高度准确 |
| Stripe | Greenhouse API | ✓ 官方 - 高度准确 |
| Databricks | Greenhouse API | ✓ 官方 - 高度准确 |
| Sentry | Playwright | ✓ 直接抓取 - 准确 |
| OpenAI | JSearch API | ⚠️ 可能不完整 |
| Google | JSearch API | ⚠️ 可能不完整 |
| Meta | JSearch API | ⚠️ 可能不完整 |
| Amazon | JSearch API | ⚠️ 可能不完整 |
| Apple | JSearch API | ⚠️ 可能不完整 |
| Glean | JSearch API | ⚠️ 可能不完整 |

**混合策略**: 优先使用官方 API（Greenhouse）以获得最高准确度，对于有反爬虫检测的公司使用 JSearch API。

### 🎨 丰富的 UI 功能
- **🔍 实时搜索框** - 按职位标题或地点搜索（2026-01-19 新增）
- **⭐ 收藏功能** - 一键收藏感兴趣的职位，跨会话保存（2026-01-19 新增）
- **📁 默认折叠** - 更新后所有公司默认折叠，快速浏览统计信息（2026-01-19 新增）
- **可折叠的公司区域** - 专注于重要内容
- **3 列排序** - 按标题、地点或匹配度排序
- **高级过滤** - 按美国地点、远程或匹配状态过滤
- **基于匹配度的默认排序** - 职位自动按相关性排序
- **数据准确度标记** - 了解哪些数据源是官方的 vs 聚合的
- **一键跳转** - 直接跳转到公司招聘页面验证

### 💾 持久化存储
- **基于 localStorage** - 无需数据库
- **可自定义偏好设置** - 跨会话保存
- **重置为默认值** - 包含优化的基于短语的偏好设置
- **缓存结果** - 快速刷新无需重新抓取
- **数据缓存与合并策略** - API 失败时保留旧数据（2026-01-19 新增）

### 🔍 为高级工程师优化
默认偏好针对：
- 分布式系统和后端基础设施
- 平台工程和工作流编排
- AI/ML 基础设施和 Agent 系统
- Senior/Staff 级别职位
- 生产级系统设计

**过滤的反模式**:
- 纯研究职位
- 前端/移动开发
- 销售、市场、招聘
- 模型训练和提示工程

## 🚀 快速开始

### 前置要求
- Node.js 18+
- pnpm
- RapidAPI Key（用于 JSearch API）

### 安装

```bash
# 克隆仓库
git clone https://github.com/hlckl123456/job-radar.git
cd job-radar

# 安装依赖
pnpm install

# 设置环境变量
cp .env.example .env
# 将你的 RAPIDAPI_KEY 添加到 .env 文件中

# 启动开发服务器
pnpm dev
```

在浏览器中打开 http://localhost:3000。

### 首次设置

1. **编辑偏好设置** - 点击 "Edit Preferences" 或使用 "Reset to Defaults" 获取优化设置
2. **点击 "Update Jobs"** - 从所有 10 家公司抓取职位（约 20-30 秒）
3. **浏览结果** - 使用搜索、过滤、排序和折叠功能找到下一个职位
4. **收藏职位** - 点击 ☆ 收藏感兴趣的职位
5. **申请** - 点击职位标题在公司招聘页面查看完整描述

## 📊 工作原理

### 匹配算法

职位通过 8 个阶段评分：

1. **用户正向偏好** (0-1.0 分)
   - 短语匹配（2-3 个词）得分更高
   - 标题匹配权重 2x（0.5 分 vs 0.25 分）- 2026-01-19 新增
   - 其他字段匹配（团队、地点、描述）1x 权重
   - 最多 0.5 分来自单个词匹配

2. **用户负向偏好** (立即取消资格)
   - 短语匹配 → 立即排除
   - 单个词匹配 → -0.3 分惩罚

3. **内置资历匹配** (0-0.4 分)
   - Staff/Principal/Distinguished: 0.4 分
   - Senior/Lead: 0.25 分
   - Mid-level: 0.1 分

4. **技术领域匹配** (0-0.35 分)
   - 分布式系统、AI/ML、后端/基础设施
   - 编排、可观测性
   - 每个领域匹配一次

5. **角色类型验证** (0.15 分 + 必需)
   - 必须包含：engineer、architect、developer、scientist
   - 没有有效角色类型 → 不匹配

6. **强负向过滤** (立即取消资格)
   - 市场、销售、运营、人力资源
   - 客户成功、业务开发

7. **中度负向过滤** (-0.25 分每类)
   - 前端、研究、产品、初级

8. **地点加分** (0.05 分)
   - 远程、旧金山、纽约等

**匹配阈值**: 20%（归一化分数 ≥ 0.20 + 有效角色类型）

### 数据源

#### Greenhouse API（4 家公司）
- Anthropic、Stripe、Databricks
- 官方 API，100% 可靠
- 结构化数据：职位、部门、地点、发布时间
- 无需 API 密钥

#### JSearch API（6 家公司）
- OpenAI、Google、Meta、Amazon、Apple、Glean
- 通过 RapidAPI 聚合职位
- 过滤参数：employment_types=FULLTIME, date_posted=month（2026-01-19 优化）
- 串行执行避免 rate limit（2026-01-19 优化）
- 需要 RapidAPI 密钥（免费层级：150 请求/月）

#### Playwright 抓取（1 家公司）
- Sentry
- 直接抓取公司招聘页面
- 提取职位标题和地点的正则表达式
- 无需 API 密钥

## 📈 最近优化（2026-01-19）

我们完成了 **7 个核心优化**，大幅提升系统稳定性和用户体验：

### 原计划的 4 个优化
1. ✅ **JSearch API 优化** - 添加 employment_types=FULLTIME 和 date_posted=month 过滤
2. ✅ **Match Score 算法改进** - 职位标题 2x 权重，降低阈值（0.25→0.20）
3. ✅ **搜索功能** - 实时搜索框 + `:saved` 命令
4. ✅ **收藏功能** - localStorage 持久化 + "Show Saved Only" 过滤器

### 部署后的 3 个紧急改进
5. ✅ **串行执行 JSearch API** - 避免 rate limit（429 错误）
6. ✅ **数据缓存与合并策略** - 失败时保留旧数据，不显示 0/0
7. ✅ **默认折叠公司列表** - 更新后所有公司默认折叠，UX 改进

### 预期改进
- ⬇️ **30-40% 不相关职位减少**（过滤实习、旧职位）
- ⬆️ **50% match rate 提升**（18.5% → 25-30%）
- 🚀 **显著的用户体验改进**（搜索 + 收藏 + 折叠）
- 🛡️ **更高的可靠性**（缓存策略 + 串行 API）

详细文档：
- [English Version](docs/optimization-summary-2026-01-19.md)
- [中文版本](docs/optimization-summary-2026-01-19-zh.md)

## 🏗️ 技术栈

### 后端
- **Node.js + TypeScript** - 类型安全的服务器代码
- **Express** - REST API 服务器
- **Playwright** - Sentry 网页抓取
- **Fetch API** - Greenhouse 和 JSearch API 调用

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 快速开发构建
- **CSS Modules** - 组件样式

### 数据
- **LocalStorage** - 客户端持久化（偏好设置、收藏的职位）
- **JSON 文件缓存** - 服务器端职位数据（data/jobs.json）
- **无数据库** - 零基础设施开销

## 📂 项目结构

```
job-radar/
├── app/
│   ├── api/                    # Express 后端
│   │   └── src/
│   │       └── index.ts        # API 路由 + 抓取逻辑
│   └── web/                    # React 前端
│       └── src/
│           ├── App.tsx         # 主应用组件
│           └── App.css         # 样式
├── data/
│   └── jobs.json              # 缓存的职位数据（608 KB）
├── docs/                       # 项目文档
│   ├── optimization-summary-2026-01-19.md       # 优化总结（英文）
│   ├── optimization-summary-2026-01-19-zh.md    # 优化总结（中文）
│   ├── jsearch-api-findings.md                   # JSearch API 探索
│   └── optimization-roadmap.md                   # 优化路线图
├── .env.example               # 环境变量模板
└── README.md                  # 项目说明（英文）
```

## 🎯 使用指南

### 搜索功能
```
🔍 搜索 "staff" → 只显示标题/地点包含 "staff" 的职位
🔍 搜索 "san francisco" → 只显示 SF 地点的职位
🔍 搜索 "remote" → 只显示远程职位
🔍 输入 ":saved" → 只显示收藏的职位
```

### 收藏功能
```
⭐ 点击 ☆ → 变成 ⭐（已收藏）
🔄 刷新页面 → 收藏状态保持（localStorage）
☑️ 勾选 "Show Saved Only" → 只显示收藏的职位
📊 显示收藏数量: "Show Saved Only (5)"
```

### 折叠功能
```
📁 Update 后所有公司默认折叠
📊 只显示统计信息: "Anthropic: 339 (45 matched)"
👆 点击公司名展开查看详情
```

### 偏好设置
1. 点击 "Edit Preferences"
2. **Looking For**: 添加你想要的关键词（分布式系统、后端、平台等）
3. **Not Looking For**: 添加你不想要的关键词（研究、前端、销售等）
4. 点击 "Save"
5. 点击 "Update Jobs" 重新评分所有职位

**提示**: 使用 2-3 个词的短语（如 "distributed systems"）比单个词效果更好！

## 🔧 配置

### 环境变量

在 `.env` 文件中设置：

```bash
# JSearch API（通过 RapidAPI）
RAPIDAPI_KEY=your_rapidapi_key_here

# 服务器端口（可选）
PORT=3001
```

### 获取 RapidAPI 密钥

1. 访问 https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. 注册免费账户
3. 订阅免费计划（150 请求/月）
4. 复制 API 密钥到 `.env`

## 🚧 已知限制

### JSearch API
- ⚠️ **Rate Limiting**: 免费层级 150 请求/月（每个公司 1 次请求）
- ⚠️ **准确性**: 可能不完整，依赖第三方聚合
- ⚠️ **延迟**: 需要串行执行（1 秒延迟）避免 429 错误
- ✅ **缓解措施**: 实施数据缓存策略，失败时保留旧数据

### Playwright 抓取
- ⚠️ **脆弱性**: 网站更改可能破坏抓取器
- ⚠️ **速度**: 比 API 慢（需要完整页面加载）
- ✅ **可靠性**: Sentry 目前运行稳定

### 匹配算法
- ⚠️ **假阳性**: 某些职位可能被错误匹配
- ⚠️ **假阴性**: 某些相关职位可能被遗漏
- ✅ **可调整**: 通过偏好设置微调

## 🔜 未来改进

### Phase 3: 深度优化
1. 分析 Stripe 低 match rate（为什么只有 3.7%？）
2. 使用 job_highlights - 利用 JSearch 的结构化数据
3. 组件化重构 - 拆分 App.tsx
4. 响应式设计 - 移动端优化

### Phase 4: 高级功能
1. 统计面板 - 显示更多 metrics
2. 变化通知 - 新职位提醒
3. 备用数据源 - 为 JSearch 公司寻找其他 API
4. 导出收藏的职位 - CSV/PDF 导出

详见 [优化路线图](docs/optimization-roadmap.md)

## 📝 开发

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器（并发）
pnpm dev

# 或分别启动
pnpm --filter @job-radar/api dev    # 后端: localhost:3001
pnpm --filter @job-radar/web dev    # 前端: localhost:3000
```

### 构建生产版本

```bash
# 构建所有包
pnpm build

# 运行生产服务器
pnpm start
```

### 测试抓取器

```bash
# 测试 Greenhouse API
cd app/api
npm run dev

# 在浏览器中访问
curl http://localhost:3001/api/jobs/update -X POST -H "Content-Type: application/json" -d '{"preferences":{}}'
```

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 开发流程
1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. Push 到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Greenhouse](https://greenhouse.io/) - 官方招聘 API
- [JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) - 职位聚合 API
- [Playwright](https://playwright.dev/) - 网页抓取框架
- [React](https://react.dev/) - UI 框架
- [Vite](https://vitejs.dev/) - 构建工具

## 📧 联系方式

项目链接: [https://github.com/hlckl123456/job-radar](https://github.com/hlckl123456/job-radar)

---

**构建时间**: 2026-01-19
**最后更新**: 2026-01-19
**版本**: 2.0.0（包含 7 个核心优化）

用 ❤️ 和 ☕ 制作，由 [Claude Code](https://claude.com/claude-code) 提供支持
