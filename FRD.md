# Priority Citizenship — AI Tools FRD (Functional Requirements Document)

---

## 1. Document Checklist（AI 文档清单生成器）

### 用户场景
客户想知道："我要申请瓦努阿图投资入籍，到底需要准备哪些文件？每份文件有什么要求？哪些需要公证翻译？"

### 功能流程

**Step 1 — 选择目标签证类型**

| 选项 | 覆盖程序 |
|------|---------|
| 🛂 Citizenship by Investment (DSP/CIIP) | 投资入籍 |
| 🏠 Residence Permit | 居留许可（工作/退休/投资） |
| 💼 Business Immigration | 商业移民 |
| 👨‍👩‍👧‍👦 Family Sponsorship | 家庭担保 |
| ✈️ Visitor Visa | 旅游/访问签证 |

**Step 2 — 补充个人信息（3 个问题）**

1. 申请人国籍？（影响是否需要额外认证/翻译）
2. 是否携带家属？→ 配偶 / 子女 / 父母
3. 当前居住国？（影响无犯罪证明开具国家）

**Step 3 — AI 生成清单**

根据签证类型 + 个人信息，生成分类文档清单：

```
📋 Your Personalized Document Checklist

📄 身份文件 (4 items)
  ✅ 有效护照（有效期 12 个月以上）
  ✅ 出生证明（需 Apostille 认证 + 英文翻译）
  ✅ 6 张护照照片（35×45mm，白底）
  ✅ 结婚证（如携带配偶，需公证翻译）

🔍 背景审查 (2 items)
  ✅ 无犯罪记录证明（中国 + 新加坡，近 10 年，6 个月内开具）
  ✅ 银行资信证明（近 3 个月）

🏥 健康与财务 (3 items)
  ✅ 体检报告（指定体检机构，3 个月内有效）
  ✅ 资金来源说明（银行流水 / 公司分红 / 资产出售凭证）
  ✅ 近 3 个月地址证明（水电账单或银行对账单）

📝 申请表格 (1 item)
  ✅ DSP 申请表（由指定代理提交）

⏱ 预计文件准备时间：2-4 周
💰 文件认证费用估算：US$500-1,500（取决于国家和份数）
```

**Step 4 — 交互功能**
- 每项 ☑️ 可勾选完成状态（存 localStorage）
- 🔄 "发送到邮箱"按钮 → 调用 `/api/send-checklist` 把清单发到客户邮箱
- 📤 "导出 PDF" → 浏览器打印为 PDF

### 技术要点
- 每种签证类型的文档清单预置在 JSON 配置中
- 根据国籍/居住国动态追加认证要求（如非英语国家 → 追加翻译要求）
- 家属信息自动追加家属相关文档

---

## 2. Fee Calculator（费用计算器）

### 用户场景
客户想知道："我一个人申请 DSP 入籍，加上老婆和 2 个小孩，到底要花多少钱？政府收多少？尽职调查费多少？有没有隐藏费用？"

### 功能流程

**Step 1 — 选择签证/入籍类型**

| 选项 | 
|------|
| 🛂 DSP — 发展支持计划（投资入籍） |
| 🛂 CIIP — 资本投资移民计划（可部分返还） |
| 🏠 Residence Permit — 居留许可 |
| 💼 Business Immigration — 商业移民 |

**Step 2 — 填写申请人信息**

1. 主申请人数量：1
2. 配偶：✅ / ❌
3. 子女数量：__（0-10，含年龄判断是否超龄）
4. 父母/岳父母数量：__（0-4）
5. 其它家属（成年子女 18-29 岁）：__

**Step 3 — 实时费用明细**

以 DSP + 一家四口为例：

```
💰 Cost Breakdown — DSP Citizenship by Investment

🏛 Government Fees
  主申请人政府捐赠          US$130,000
  配偶                      US$20,000
  子女 × 2                  US$30,000 ($15,000 × 2)
  ─────────────────────────────────────
  政府捐赠小计              US$180,000

🔍 Due Diligence & Processing
  主申请人尽职调查          US$5,500
  配偶尽职调查              US$5,500
  ─────────────────────────────────────
  尽职调查小计              US$11,000

📋 Administrative & Other
  政府行政费（≈4人）        US$10,000
  文件翻译认证（估算）      US$1,500
  快递/护照投递             US$500
  ─────────────────────────────────────
  行政费用小计              US$12,000

═══════════════════════════════════════
  💰 TOTAL ESTIMATED COST    US$203,000
═══════════════════════════════════════

💡 CIIP 方案对比：同样家庭 US$165,000 + US$5,500×2 + US$10,000 ≈ US$186,000
   其中 US$50,000 资本金 5 年后返还
```

**Step 4 — 交互功能**
- 📊 DSP vs CIIP 并列对比柱状图
- 📤 "导出 PDF" 按钮
- 📧 "发送报价到邮箱" 
- 🔗 "预约顾问详细解读费用" → 跳转 booking 页面

### 费用数据来源
基于 `vanuatu-knowledge.json` 中的官方数据：
- DSP: 单人 $130K, 夫妻 $150K, 三口 $165K, 四口 $180K, 每加一人 $25K
- CIIP: 四口以内 $165K flat, 每加一人 $25K
- Due Diligence: $5,500/成人(16+)
- 行政费: ≈$2,000-3,000/人
- Residence Permit: 从 $10,000 起
- Business: 从 $30,000 起
- 文件认证: $500-1,500
- Visitor Visa: ≈$200

---

## 3. AI Interview Prep（AI 面试模拟器）

### 用户场景
客户即将参加瓦努阿图移民面试（或宣誓前的合规审查），想提前练习。他们不知道会被问到什么问题，也不知道如何回答才符合要求。

### 功能流程

**Step 1 — 选择面试类型**

| 面试类型 | 适用场景 |
|---------|---------|
| 🛂 Citizenship Due Diligence Interview | 投资入籍 DD 面试 |
| 🏠 Residence Permit Interview | 居留许可面谈 |
| 💼 Business Immigration Interview | 商业移民面谈（含商业计划答辩） |
| 🔤 General Immigration Q&A | 通用移民问答练习 |

**Step 2 — 选择难度 + 语言**

- 难度：🟢 Beginner / 🟡 Intermediate / 🔴 Advanced
- 面试语言：English / 中文（双语切换）

**Step 3 — AI 模拟面试**

界面类似聊天窗口，但 AI 扮演**移民面试官**角色：

```
┌─────────────────────────────────────────┐
│  🎤 Immigration Interview Simulator      │
│  Type: Citizenship DD | Level: Beginner  │
│  Question 2/10                           │
├─────────────────────────────────────────┤
│                                          │
│  🧑‍💼 Interviewer:                          │
│  "Mr. Chen, can you explain the source   │
│   of your investment funds? Please       │
│   provide specific details about how     │
│   you accumulated the USD 130,000."      │
│                                          │
│  👤 You:                                  │
│  [                                 ]     │
│  [                          Send 📤]    │
│                                          │
├─────────────────────────────────────────┤
│  📊 Session Progress  ████░░░░ 20%      │
│  ⭐ Confidence Score: 72%               │
│  💡 Tip: Be specific about dates and    │
│     amounts. Vague answers raise flags.  │
└─────────────────────────────────────────┘
```

**Step 4 — AI 评估反馈**

完成 10 题后生成报告：

```
📊 Interview Readiness Report

⭐ Overall Score: 78/100 — Good, room for improvement

📈 Category Breakdown:
  ✅ Source of Funds    85% — Clear and specific
  ⚠️ Personal History   70% — Add more timeline details
  ✅ Program Knowledge  82% — Good understanding of DSP
  ⚠️ Future Plans       65% — Vague about post-citizenship plans

🎯 Top Improvement Areas:
  1. Future Plans — be ready to explain why you chose Vanuatu
     specifically and how you plan to use the citizenship
  2. Personal History — prepare a clear timeline of your
     career and residence history, avoid gaps

📝 Model Answer Examples: [展开查看标准回答参考]

🔄 Retake Interview  📤 Export Report
```

### 面试题库设计

按面试类型分类，每类 20-30 题：

**Citizenship DD 面试（典型问题）：**
- Source of funds explanation
- Career history and timeline
- Reason for choosing Vanuatu
- Current business/employment details
- Family background
- Previous visa/citizenship applications
- Political exposure (PEP) declaration
- Sanctions and legal history
- Post-citizenship plans
- Understanding of DSP program obligations

**Business Immigration 面试：**
- Business plan overview
- Market analysis for Vanuatu
- Investment breakdown
- Hiring plans
- Revenue projections
- Industry experience
- Competitor analysis
- Regulatory compliance understanding

### 技术要点
- Gemini API 扮演面试官角色（system prompt 设定角色 + 追问逻辑）
- 根据用户回答质量动态调整后续问题难度
- 评估用关键词匹配 + AI 判断结合
- 回答历史保存在 localStorage

---

## 开发优先级建议

| 优先级 | 功能 | 理由 |
|--------|------|------|
| 🥇 P0 | Fee Calculator | 最高频使用，直接促进付费转化 |
| 🥈 P1 | Document Checklist | 实用性强，降低客服咨询量 |
| 🥉 P2 | AI Interview Prep | 差异化功能，提升专业形象 |

---

## 技术实现工期估算

| 功能 | 前端页面 | 后端 API | 总工时 |
|------|---------|---------|--------|
| Fee Calculator | 3h | 0h（纯前端计算） | **3h** |
| Document Checklist | 3h | 1h（邮件发送） | **4h** |
| AI Interview Prep | 5h | 2h（Gemini 面试逻辑） | **7h** |
