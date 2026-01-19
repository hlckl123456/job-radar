# Job Radar 优化路线图

**创建日期**: 2026-01-19
**当前状态分析**:
- 总 Jobs: 1742
- Matched: 323 (18.5%)
- 平均 Match Score: 0.37 (37%)
- 代码行数: 1351 行 (App.tsx: 459, index.ts: 892)

---

## 🎯 立即可实施的优化 (Quick Wins)

### 1. ⚡ 实施 JSearch API 优化 (30分钟)
**收益**: 减少 40% 处理时间，提高数据质量

```typescript
// app/api/src/index.ts - scrapeWithJSearch 函数
const params = new URLSearchParams({
  query,
  page: '1',
  num_pages: numPages.toString(),
  date_posted: 'month',         // ← 新增：只要最近一个月
  employment_types: 'FULLTIME'  // ← 新增：过滤掉 intern, contractor
});
```

**预期结果**:
- ✅ 减少 30% 不相关 jobs (intern, contractor)
- ✅ 数据更新鲜（只要最近一个月）
- ✅ 降低 API 成本

---

### 2. 🗑️ 移除后端的 employmentType 字段 (5分钟)
**当前问题**: 前端已删除，但后端仍在处理

```typescript
// app/api/src/index.ts:577 - 删除此行
employmentType: job.job_employment_type,  // ← 删除
```

**收益**:
- ✅ 简化代码
- ✅ 减少数据传输

---

### 3. 🎨 UI 紧凑化 (20分钟)
**当前问题**: 表格太宽，有些列浪费空间

**优化方案**:
```css
/* app/web/src/App.css */

/* Title column: 最重要，给最多空间 */
th:nth-child(1), td:nth-child(1) {
  width: 40%;
  min-width: 300px;
}

/* Location column */
th:nth-child(2), td:nth-child(2) {
  width: 25%;
  min-width: 150px;
}

/* Match column: 固定宽度 */
th.match-column, td.match-column {
  width: 90px;
  min-width: 90px;
  white-space: nowrap;
}

/* Link column: 最小 */
th:nth-child(4), td:nth-child(4) {
  width: 80px;
  min-width: 80px;
  text-align: center;
}
```

**收益**:
- ✅ 更好的空间利用
- ✅ 减少横向滚动

---

### 4. 📊 改进 Match Score 显示 (15分钟)
**当前问题**: Match score 37% 偏低，可能是算法问题

**优化方案 A - 调整阈值**:
```typescript
// app/api/src/index.ts
function scoreJob(job: Job, preferences: Preferences): number {
  let score = 0;
  const title = job.title.toLowerCase();
  const description = (job.snippet || '').toLowerCase();

  // 降低阈值：从 0.3 → 0.2
  return score >= 0.2;  // ← 原来可能是 0.3
}
```

**优化方案 B - 改进算法**:
```typescript
// 使用加权评分
function scoreJobWeighted(job: Job, preferences: Preferences): number {
  let score = 0;
  const title = job.title.toLowerCase();
  const description = (job.snippet || '').toLowerCase();

  // Title match (权重 2x)
  lookingForPhrases.forEach(phrase => {
    if (title.includes(phrase)) score += 0.5;  // 2x 权重
  });

  // Description match (权重 1x)
  lookingForPhrases.forEach(phrase => {
    if (description.includes(phrase)) score += 0.25;
  });

  // Negative match (扣分)
  notLookingForPhrases.forEach(phrase => {
    if (title.includes(phrase)) score -= 0.5;
    if (description.includes(phrase)) score -= 0.25;
  });

  return Math.max(0, score);
}
```

**收益**:
- ✅ 提高 matching 准确率
- ✅ 更多相关 jobs 被 match

---

### 5. 🔄 添加 Rate Limiting (15分钟)
**当前问题**: JSearch API 有 rate limit，容易触发 429

```typescript
// app/api/src/index.ts - 添加延迟
async function scrapeWithJSearch(
  companyName: string,
  query: string,
  numPages: number = 5
): Promise<Job[]> {
  // 添加 1 秒延迟避免 rate limit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // ... 原有代码
}
```

**收益**:
- ✅ 避免 429 错误
- ✅ 提高稳定性

---

## 🚀 中等优化 (1-2小时)

### 6. 📱 响应式设计优化 (1小时)
**当前问题**: 移动端体验可能不佳

```css
/* app/web/src/App.css */
@media (max-width: 768px) {
  /* 隐藏 Location column */
  th:nth-child(2), td:nth-child(2) {
    display: none;
  }

  /* Title 占满宽度 */
  th:nth-child(1), td:nth-child(1) {
    width: 60%;
  }

  /* 缩小字体 */
  table {
    font-size: 0.85rem;
  }

  /* Match badge 更小 */
  .match-badge {
    padding: 0.15rem 0.3rem;
    font-size: 0.75rem;
  }
}
```

---

### 7. 🔍 添加搜索/过滤功能 (1.5小时)
**新功能**: 在结果中实时搜索

```typescript
// App.tsx - 添加搜索状态
const [searchTerm, setSearchTerm] = useState('');

// 过滤 jobs
const filteredJobs = matchedJobs.filter(job =>
  job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (job.location || '').toLowerCase().includes(searchTerm.toLowerCase())
);
```

```tsx
{/* UI */}
<input
  type="text"
  placeholder="Search jobs..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '300px' }}
/>
```

**收益**:
- ✅ 快速找到感兴趣的 jobs
- ✅ 更好的用户体验

---

### 8. 💾 添加"收藏"功能 (1.5小时)
**新功能**: 标记感兴趣的 jobs

```typescript
// App.tsx
const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

// 从 localStorage 加载
useEffect(() => {
  const saved = localStorage.getItem('savedJobs');
  if (saved) {
    setSavedJobs(new Set(JSON.parse(saved)));
  }
}, []);

// 切换收藏
const toggleSave = (jobId: string) => {
  const newSaved = new Set(savedJobs);
  if (newSaved.has(jobId)) {
    newSaved.delete(jobId);
  } else {
    newSaved.add(jobId);
  }
  setSavedJobs(newSaved);
  localStorage.setItem('savedJobs', JSON.stringify([...newSaved]));
};
```

```tsx
{/* UI - 添加收藏按钮 */}
<td>
  <button
    onClick={() => toggleSave(job.id)}
    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
  >
    {savedJobs.has(job.id) ? '⭐' : '☆'}
  </button>
  <a href={job.url} target="_blank">View</a>
</td>
```

**收益**:
- ✅ 保存感兴趣的 jobs
- ✅ 跨会话保存（localStorage）

---

### 9. 📈 优化 Stripe 的 Matching (1小时)
**问题**: Stripe 有 541 jobs 但只有 20 matched (3.7% - 太低！)

**分析**:
```bash
# 检查 Stripe jobs 的 title 分布
cd /Users/Claus/Documents/github/job-radar && cat data/jobs.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
stripe_jobs = [j for j in data['jobs'] if j['company'] == 'Stripe']
matched = [j for j in stripe_jobs if j.get('matched')]
unmatched = [j for j in stripe_jobs if not j.get('matched')]

print(f'Stripe Matched Jobs (sample):')
for j in matched[:5]:
    print(f'  ✅ {j[\"title\"]} ({j.get(\"matchScore\", 0):.2f})')

print(f'\nStripe Unmatched Jobs (sample):')
for j in unmatched[:10]:
    print(f'  ❌ {j[\"title\"]}')
"
```

**优化方向**:
- 检查 Stripe jobs 的 title 是否包含 preferences 中的关键词
- 可能需要调整 preferences 或 matching 算法

---

## 🎯 高级优化 (2-4小时)

### 10. 🧩 组件化 App.tsx (2小时)
**当前问题**: App.tsx 有 459 行，太长

**重构方案**:
```
app/web/src/
  ├── App.tsx (主文件，100行)
  └── components/
      ├── PreferencesSection.tsx
      ├── FiltersSection.tsx
      ├── CompanySection.tsx
      ├── JobTable.tsx
      └── JobRow.tsx
```

**示例 - JobTable.tsx**:
```typescript
interface JobTableProps {
  jobs: Job[];
  company: string;
  onSort: (column: SortColumn) => void;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
}

export function JobTable({ jobs, company, onSort, sortColumn, sortDirection }: JobTableProps) {
  return (
    <table>
      {/* ... */}
    </table>
  );
}
```

**收益**:
- ✅ 代码更易维护
- ✅ 组件可复用
- ✅ 更好的 TypeScript 类型检查

---

### 11. 🔄 优化 Scraping 并发性 (2小时)
**当前问题**: 串行 scraping，速度慢

**优化方案**:
```typescript
// app/api/src/index.ts
async function scrapeAllCompanies(): Promise<Job[]> {
  const companies = [
    { name: 'Anthropic', scraper: scrapeAnthropic },
    { name: 'OpenAI', scraper: scrapeOpenAI },
    // ...
  ];

  // 并发 scraping (限制并发数为 3)
  const results = [];
  for (let i = 0; i < companies.length; i += 3) {
    const batch = companies.slice(i, i + 3);
    const batchResults = await Promise.allSettled(
      batch.map(c => c.scraper())
    );
    results.push(...batchResults);
  }

  // 处理结果
  const allJobs = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  return allJobs;
}
```

**收益**:
- ✅ 速度提升 3x (3个并发)
- ✅ 错误隔离（一个失败不影响其他）

---

### 12. 🎨 使用 job_highlights 改进 Matching (2小时)
**优势**: job_highlights 是结构化数据，比 job_description 更准确

```typescript
// 利用 JSearch 的 job_highlights 字段
interface JobHighlights {
  Qualifications?: string[];
  Responsibilities?: string[];
  Benefits?: string[];
}

function scoreJobWithHighlights(job: JSearchJob, preferences: Preferences): number {
  let score = 0;
  const highlights = job.job_highlights || {};

  // Qualifications (权重最高 - 3x)
  (highlights.Qualifications || []).forEach(qual => {
    lookingForPhrases.forEach(phrase => {
      if (qual.toLowerCase().includes(phrase)) {
        score += 0.75;  // 3x 权重
      }
    });
  });

  // Responsibilities (权重 2x)
  (highlights.Responsibilities || []).forEach(resp => {
    lookingForPhrases.forEach(phrase => {
      if (resp.toLowerCase().includes(phrase)) {
        score += 0.5;  // 2x 权重
      }
    });
  });

  // Title (权重 2x)
  lookingForPhrases.forEach(phrase => {
    if (job.job_title.toLowerCase().includes(phrase)) {
      score += 0.5;
    }
  });

  return score;
}
```

**收益**:
- ✅ 更准确的 matching
- ✅ 更快（不需要处理整个 description）
- ✅ 可能提高 Stripe 的 match rate (3.7% → 10%+)

---

### 13. 📊 添加统计面板 (1.5小时)
**新功能**: 显示更多统计信息

```tsx
<div className="stats-dashboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
  <div className="stat-card">
    <h4>Total Jobs</h4>
    <p className="stat-number">{jobsData.stats?.totalScraped || 0}</p>
  </div>
  <div className="stat-card">
    <h4>Matched</h4>
    <p className="stat-number">{jobsData.stats?.totalMatched || 0}</p>
  </div>
  <div className="stat-card">
    <h4>Match Rate</h4>
    <p className="stat-number">
      {jobsData.stats ? (jobsData.stats.totalMatched / jobsData.stats.totalScraped * 100).toFixed(1) : 0}%
    </p>
  </div>
  <div className="stat-card">
    <h4>Avg Score</h4>
    <p className="stat-number">
      {(jobsData.jobs.filter(j => j.matched).reduce((sum, j) => sum + (j.matchScore || 0), 0) / jobsData.jobs.filter(j => j.matched).length * 100).toFixed(0)}%
    </p>
  </div>
</div>
```

---

### 14. 🔔 添加变化通知 (2小时)
**新功能**: 当有新 jobs match 时通知用户

```typescript
// 比较新旧数据
useEffect(() => {
  const previousJobs = localStorage.getItem('previousJobs');
  if (previousJobs && jobsData.jobs.length > 0) {
    const prev = JSON.parse(previousJobs);
    const newMatches = jobsData.jobs.filter(job =>
      job.matched && !prev.some((p: Job) => p.id === job.id && p.matched)
    );

    if (newMatches.length > 0) {
      alert(`🎉 Found ${newMatches.length} new matched jobs!`);
    }
  }

  localStorage.setItem('previousJobs', JSON.stringify(jobsData.jobs));
}, [jobsData.jobs]);
```

---

## 🎯 推荐的实施顺序

### Phase 1: 立即实施 (今天 - 1小时)
1. ✅ JSearch API 优化 (30分钟)
2. ✅ 移除后端 employmentType (5分钟)
3. ✅ Rate Limiting (15分钟)
4. ✅ UI 紧凑化 (20分钟)

**预期收益**: 40% 性能提升，更好的 UI

---

### Phase 2: 快速改进 (明天 - 2小时)
5. ✅ 改进 Match Score 算法 (30分钟)
6. ✅ 添加搜索功能 (30分钟)
7. ✅ 添加收藏功能 (1小时)

**预期收益**: 更准确的 matching，更好的 UX

---

### Phase 3: 深度优化 (本周 - 4小时)
8. ✅ 分析并优化 Stripe matching (1小时)
9. ✅ 使用 job_highlights 改进算法 (2小时)
10. ✅ 组件化重构 (2小时)

**预期收益**: 代码质量提升，更高的 match rate

---

### Phase 4: 高级功能 (下周 - 可选)
11. ✅ 响应式设计
12. ✅ 统计面板
13. ✅ 变化通知
14. ✅ 并发 scraping

---

## 📊 预期改进对比

| 指标 | 当前 | Phase 1 后 | Phase 2 后 | Phase 3 后 |
|------|------|------------|------------|------------|
| **Scraping 时间** | 100% | 60% ⬇️ | 60% | 20% ⬇️⬇️ |
| **Match Rate** | 18.5% | 20% ⬆️ | 25% ⬆️ | 35% ⬆️⬆️ |
| **平均 Match Score** | 37% | 40% ⬆️ | 50% ⬆️ | 60% ⬆️⬆️ |
| **UI 响应速度** | 基准 | 同 | +搜索 | +组件化 |
| **代码可维护性** | 1351行 | 同 | 同 | ⬆️⬆️ 模块化 |

---

## 🎯 我的建议

**立即开始**:
1. JSearch API 优化 (最大 ROI)
2. 改进 Match Score 算法 (提高质量)
3. 添加搜索和收藏 (更好的 UX)

这 3 个优化能在 **2小时内完成**，带来 **最大的价值提升**。

要我开始实施吗？你想从哪个开始？
