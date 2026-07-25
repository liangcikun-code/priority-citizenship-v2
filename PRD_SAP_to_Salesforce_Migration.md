# Product Requirements Document (PRD)

## SAP Sales & Distribution (SD) + Project System (PS) 迁移至 Salesforce Sales Cloud + Service Cloud

---

| 文档属性 | 详情 |
|----------|------|
| 文档版本 | v1.0 |
| 文档状态 | Draft for Review |
| 作者 | [Author Name] |
| 创建日期 | 2026-07-24 |
| 密级 | Internal — Confidential |
| 适用范围 | 企业级 CRM/ERP 混合迁移项目 |

---

## 目录

1. [Executive Summary](#1-executive-summary)
2. [商业背景与战略目标](#2-商业背景与战略目标)
3. [当前状态分析](#3-当前状态分析)
4. [范围定义](#4-范围定义)
5. [功能需求 — Sales Cloud](#5-功能需求--sales-cloud)
6. [功能需求 — Service Cloud / Project Management](#6-功能需求--service-cloud--project-management)
7. [数据模型设计](#7-数据模型设计)
8. [集成架构](#8-集成架构)
9. [迁移策略](#9-迁移策略)
10. [用户角色与权限矩阵](#10-用户角色与权限矩阵)
11. [非功能性需求](#11-非功能性需求)
12. [实施路线图](#12-实施路线图)
13. [风险与依赖](#13-风险与依赖)
14. [附录](#14-附录)

---

## 1. Executive Summary

### 1.1 项目概述

本项目旨在将企业当前 SAP ECC 系统中的 **Sales & Distribution (SD)** 模块和 **Project System (PS)** 模块的核心功能，分阶段迁移至 **Salesforce Sales Cloud** 和 **Salesforce Service Cloud** 平台。

### 1.2 业务价值

| 维度 | 当前 (SAP) | 目标 (Salesforce) |
|------|-----------|-------------------|
| 用户界面 | SAP GUI / Fiori，学习成本高 | Lightning Experience，现代化 Web UI |
| 移动端 | 需要第三方适配 | 原生 Salesforce Mobile App |
| 报表能力 | SAP BW / ABAP 报表开发周期长 | Salesforce Reports & Dashboards，实时可配置 |
| 集成扩展性 | RFC/BAPI，强耦合 | REST API / MuleSoft，松耦合 |
| 总拥有成本 | 年维护费高 + 硬件/Basis 团队 | SaaS 订阅制，无基础设施负担 |
| 迭代速度 | 6-12 月一次 Release | 每季节 3 次自动更新 |
| 用户体验 | 表单式操作，流程僵化 | 路径引导（Path）、动态表单、Einstein AI |

### 1.3 关键成功指标 (KPI)

- **销售效率提升**：销售代表创建商机到报价发送的平均耗时减少 40%
- **项目交付透明度**：项目经理实时掌握项目健康度，逾期预警覆盖率 > 90%
- **用户采纳率**：上线后 6 个月内活跃用户 > 85%
- **数据一致性**：Salesforce 与下游 ERP（SAP FICO 保留）数据同步准确率 > 99.5%
- **工单处理效率**：客服首次响应时间（FRT）降低 50%

---

## 2. 商业背景与战略目标

### 2.1 驱动因素

1. **销售数字化升级**：现有 SAP SD 报价流程依赖本地数据批处理，无法支持实时定价和移动端审批
2. **项目交付现代化**：SAP PS 操作复杂，项目经理普遍反馈 WBS 录入效率低、资源调度不直观
3. **统一客户视图**：销售、项目实施、售后服务三大部门使用不同系统，客户 360° 视图缺失
4. **智能决策需求**：管理层期望通过 AI/ML 预测销售管线健康状况和项目风险

### 2.2 战略目标对齐

| 企业战略 | 本项目贡献 |
|---------|-----------|
| 提升客户体验 NPS | 统一客户入口，从售前到售后无缝衔接 |
| 运营降本增效 | 减少 SAP 用户 License 和 Basis 运维成本 |
| 数据驱动决策 | Salesforce Einstein Analytics 替代手工报表 |
| 全球化扩张 | Salesforce 原生的多语言、多币种、多法人主体支持 |

---

## 3. 当前状态分析

### 3.1 SAP SD 模块现状

| 子模块 | 核心功能 | 痛点 |
|--------|---------|------|
| 客户主数据 | 客户-合作伙伴关系，信用管理 | 客户数据分散在多个 SAP Client，与实际使用场景脱节 |
| 销售订单 | 标准订单、合同、调度协议 | 订单录入需 15+ 必填字段，销售代表操作负担重 |
| 定价 | 条件技术 (Condition Technique)，定价过程 | 价格规则修改需 ABAP 开发介入，响应周期 2-4 周 |
| 出货 | 交货凭证、拣配、包装、发货过账 | 与 WMS 强耦合，解耦难度高 |
| 开票 | 发票、贷项/借项凭证 | 需与金税/合规系统对接，非标场景多 |
| 信用管理 | 信用检查、风险类管理 | 规则固化，无法灵活调整 |

### 3.2 SAP PS 模块现状

| 子模块 | 核心功能 | 痛点 |
|--------|---------|------|
| 项目结构 | 项目定义、WBS 元素、网络、活动 | WBS 层级过多（平均 5-7 层），实际操作体验差 |
| 成本计划 | 成本要素计划、预算编制 | 预算变更审批线下流转，无系统化追踪 |
| 资源管理 | 工作中心、能力需求 | 资源调度依赖 Excel，可视化程度低 |
| 时间确认 | CATS 工时录入 | 工时填报系统（CATS）使用率 < 60%，数据质量差 |
| 项目结算 | 结果分析、结算规则 | 月底结算周期长（3-5 天），财务关账压力大 |
| 进度管理 | 里程碑趋势分析、EVA | 实际进度数据严重滞后于现场 |

### 3.3 与戴尔 SAP 实施经验的对比借鉴

基于在戴尔的 SAP 项目管理和业务流程经验，以下关键教训被纳入本 PRD 的设计原则：

| 戴尔经验 | 本 PRD 对应的设计决策 |
|---------|---------------------|
| SAP 界面复杂导致一线销售抵触 | Salesforce 采用路径引导（Path）+ 动态表单，按角色简化页面 |
| SAP PS WBS 层级太深，项目经理输入负担重 | Salesforce 项目对象扁平化，最多 3 层里程碑结构 |
| SAP 定价过程在戴尔需要频繁 ABAP 变更 | Salesforce 采用 Price Rules + Flow，业务人员自主维护 |
| 多工厂/多公司的 SAP 实施复杂度极高 | 分阶段迁移：先迁移销售和项目管理，保留 SAP FICO 作为财务核心 |
| 戴尔 SAP 项目中最成功的是简化标准功能而非大量定制 | 优先采用 Salesforce OOTB 功能，仅在核心差异点进行定制 |

---

## 4. 范围定义

### 4.1 范围内 (In-Scope)

| 来源系统 | 功能模块 | 目标系统 |
|---------|---------|---------|
| SAP SD | 客户主数据、联系人管理 | Salesforce Sales Cloud — Accounts & Contacts |
| SAP SD | 销售线索、商机管理 | Salesforce Sales Cloud — Leads & Opportunities |
| SAP SD | 报价管理（Quotation） | Salesforce Sales Cloud — Quotes |
| SAP SD | 销售订单管理（Sales Order） | Salesforce Sales Cloud — Orders |
| SAP SD | 定价管理 | Salesforce Sales Cloud — Price Rules / CPQ |
| SAP SD | 合同管理 | Salesforce — Contracts |
| SAP PS | 项目定义、项目结构 | Salesforce Service Cloud — Custom Project Object |
| SAP PS | WBS 工作分解 | Salesforce — Milestones + Tasks |
| SAP PS | 资源分配 | Salesforce — Resource Assignment |
| SAP PS | 工时确认 | Salesforce — Time Tracking (Custom) |
| SAP PS | 项目状态监控 / 项目健康度 | Salesforce — Dashboards + Einstein AI |
| SAP PS | 项目问题/风险管理 | Salesforce Service Cloud — Cases + Entitlements |
| — | 客服工单（售后服务） | Salesforce Service Cloud — Cases, Queues, SLAs |
| — | 知识库 | Salesforce Service Cloud — Knowledge |
| — | 客户自助门户 | Salesforce — Experience Cloud (Community) |

### 4.2 范围外 (Out-of-Scope — 暂不迁移)

| 功能 | 原因 | 临时方案 |
|------|------|---------|
| SAP SD 仓储物流 (Delivery/Picking/PGI) | 与 WMS 强耦合，迁移风险极高 | 保留 SAP WM/EWM，通过 API 与 Salesforce 整合 |
| SAP SD 开票 (Billing) | 涉税合规、金税接口 | 保留 SAP FICO，Salesforce 订单数据同步至 SAP 开票 |
| SAP PS 项目结算 (Settlement) | 财务结算规则极其复杂 | 保留 SAP CO，Salesforce 成本数据回流 SAP 结算 |
| SAP FICO 总账/应收/应付/资产 | 财务合规与审计要求 | 永久保留 SAP FICO 作为 Record of Truth |
| SAP MM 采购/库存管理 | 非本次项目范围 | 保留 SAP MM |

---

## 5. 功能需求 — Sales Cloud

### 5.1 Account & Contact 管理 (客户主数据迁移 SAP → SF)

**SAP 对应：** Customer Master (KNA1, KNB1, KNVV 表)

**Salesforce 实现：**

- Account 对象承载企业客户，Contact 承载联系人
- 实现 Account Hierarchy（母公司-子公司层级关系），对应 SAP 的合作伙伴功能（售达方 SP、付款方 BP、收货方 SH、开票方 PY）
- 信用额度字段映射至 Account.Credit_Limit__c 自定义字段
- 客户分类（行业、区域、销售组织）通过 Record Type 和 Picklist 实现
- 实时调用 SAP RFC / SOAP Service 执行信用检查

**验收标准：**
- 客户数据完整性 > 99.5%
- 客户层级关系正确展示至 5 层深度
- 信用检查响应时间 < 3 秒

### 5.2 Lead & Opportunity Management (销售线索与商机)

**SAP 对应：** 销售查询 (Inquiry) → 报价 (Quotation) → 销售订单 (Sales Order)

**Salesforce 实现：**

- Lead：市场线索入口，Web-to-Lead / API 接入
- Lead Conversion：验证后转为 Account + Contact + Opportunity
- Opportunity：按 B2B 复杂销售流程管理
  - Sales Stages 映射至 SAP 的销售凭证类型和状态
  - Stage 1: Prospecting → Stage 2: Qualification → Stage 3: Proposal → Stage 4: Negotiation → Stage 5: Closed Won/Lost
- Opportunity Products：关联产品目录，替代 SAP 销售订单行项目
- Einstein Lead Scoring 自动评分，辅助销售代表优先级排序
- Opportunity Splits：多人协作分摊销售业绩

**验收标准：**
- Lead 转化率可实时报表查询
- Opportunity Pipeline 仪表板准确反映预测收入
- 销售阶段推进强制填写关键信息（Validation Rule）

### 5.3 Quote & Order Management (报价与订单)

**SAP 对应：** Quotation (VA21) → Sales Order (VA01)

**Salesforce 实现：**

- Quote：支持多产品行、折扣、税率计算
  - Quote Line Items 对应 SAP 行项目
  - Quote Template 使用 Salesforce CPQ 或自定义 PDF 模板
- Quote → Order 转化：Salesforce Orders 对象，订单头/行结构
- 订单激活后通过 MuleSoft/自定义 API 同步至 SAP SD 创建 SO
- 订单状态双向同步：Salesforce ↔ SAP

**验收标准：**
- Quote 生成 PDF 时间 < 5 秒
- 订单同步延迟 < 30 秒（准实时）
- 订单错误率 < 0.5%

### 5.4 Pricing Management (定价管理)

**SAP 对应：** Condition Technique (条件类型、存取顺序、定价过程)

**Salesforce 实现：**

- 使用 Salesforce CPQ Price Rules 实现：批量折扣、客户特定价格、促销价格
- 定价逻辑层次：
  - Price Book（标准价目表）
  - Price Rules（价格规则，替代 SAP 条件类型）
  - Discount Schedules（量折扣阶梯，替代 SAP 定价阶梯 KJ***
  - Approval Rules（折扣审批流，替代 SAP 定价审批）
- 复杂定价（如成本加成、竞品匹配）通过自定义 Apex 实现

**验收标准：**
- 价格计算准确率 100%（与 SAP 交叉验证）
- 超折扣自动触发审批流
- 价格变更历史完整可审计

### 5.5 Contract Management (合同管理)

**SAP 对应：** Contract (VA41) — 数量合同 / 价值合同

**Salesforce 实现：**

- Salesforce Contracts 对象
- 合同关联至 Account 和 Opportunity
- 合同消耗追踪：调用合同剩余数量/价值
- 合同到期自动提醒（Flow + Email Alert）

---

## 6. 功能需求 — Service Cloud / Project Management

### 6.1 项目对象模型 (替代 SAP PS Project/WBS)

**SAP 对应：** Project Definition (PROJ) → WBS Elements (PRPS) → Networks → Activities

**Salesforce 实现：**

- 创建自定义对象 `Project__c`，承载项目主数据
- 项目层级（替代 WBS 多层结构）：
  - `Project__c` (Project Definition)
  - `Milestone__c` (里程碑，最多 3 层，替代浅层 WBS)
  - `Project_Task__c` (任务，替代 Network Activity)
- 项目阶段：Initiation → Planning → Execution → Monitoring → Closure
- 项目甘特图集成（Lightning Web Component + Chart.js 或购买 AppExchange 组件）

**验收标准：**
- 项目创建至 WBS 展开完成 < 2 分钟
- 甘特图实时反映任务依赖关系
- 里程碑完成率实时可查

### 6.2 资源管理与工时确认

**SAP 对应：** Work Center / Capacity Requirements / CATS

**Salesforce 实现：**

- `Resource_Assignment__c` 自定义对象，记录资源分配
  - 关联至 User (Consultant) + Project_Task__c
  - 计划工时 vs 实际工时对比
- 工时填报：Salesforce Flow 构建简洁的周工时录入界面
  - 替代 SAP CATS，手机端可直接填写
  - 自动提醒未填工时用户
- 资源利用率仪表板（按人员、项目维度）

**验收标准：**
- 工时填报完成率 > 85%（CARS was < 60%）
- 资源冲突自动预警
- 手机端工时填报可用

### 6.3 项目问题与风险管理

**SAP 对应：** PS Notifications / Quality Notifications (QM)

**Salesforce 实现：**

- 项目问题：复用 Service Cloud **Case 对象**
  - Case Record Type: "Project Issue"
  - 关联 Project__c
  - 严重度：Critical / High / Medium / Low
  - 升级规则 (Escalation Rules)
- 项目风险：自定义对象 `Project_Risk__c`
  - 风险矩阵：概率 × 影响 = 风险等级
  - 缓解措施和应急计划字段
  - 风险状态：Open / Mitigated / Closed

**验收标准：**
- 问题 SLA 合规率 > 90%
- 风险仪表板包含 Top 10 风险和趋势

### 6.4 客服工单管理 (Service Cloud — Case Management)

**背景：** 售后的客户服务请求（项目交付后的维保、投诉、退款等）

**Salesforce 实现：**

- Case 对象：
  - Record Types: Customer Inquiry / Complaint / Technical Support / Refund Request
  - 案例来源：Email-to-Case / Web-to-Case / Phone / Chat
- Queues & Assignment Rules：
  - 技能路由 (Omni-Channel)：按产品线、语言、工单类型自动分配
- Entitlements & Milestones：
  - 客户 SLA 权益：Gold (4h 响应) / Silver (8h) / Standard (24h)
  - 工单生命周期追踪

**验收标准：**
- 首次响应时间 FRT 降低 50%
- 工单一次解决率 (FCR) > 70%

### 6.5 Knowledge Base (知识库)

**Salesforce 实现：**

- Salesforce Knowledge：
  - 产品 FAQ、安装指南、故障排查文档
  - 多语言支持
  - 文章版本管理与审批发布流程
- Einstein Article Recommendations：工单处理时自动推荐文章

---

## 7. 数据模型设计

### 7.1 核心对象关系 (ERD 概要)

```
Account (客户公司)
  ├── Contact (联系人)
  ├── Opportunity (商机)
  │     ├── Opportunity Line Item (产品行)
  │     ├── Quote (报价)
  │     │     └── Quote Line Item
  │     └── Order (订单)
  │           └── Order Item
  ├── Contract (合同)
  └── Project__c (项目)
        ├── Milestone__c (里程碑)
        │     └── Project_Task__c (任务)
        │           └── Resource_Assignment__c
        ├── Time_Entry__c (工时记录)
        ├── Project_Risk__c
        └── Case (项目问题 / 客服工单)
              ├── Case Comment
              ├── Email Message
              └── Attachment
```

### 7.2 关键数据映射：SAP → Salesforce

| SAP 对象 | SAP 主要表 | Salesforce 对象 | 映射说明 |
|----------|-----------|----------------|---------|
| Customer Master | KNA1, KNB1, KNVV | Account | 客户编号、名称、地址 |
| Contact Person | KNVK | Contact | 联系人姓名、电话、邮件 |
| Sales Order Header | VBAK | Order | 销售订单编号、日期、状态 |
| Sales Order Item | VBAP | Order Item | 物料、数量、金额 |
| Quotation Header | VBAK (AUART='QT') | Quote | 报价单编号、有效期 |
| Condition Record | KONP, KONH | Price Rule / Price Book Entry | 价格、折扣 |
| Project Definition | PROJ | Project__c | 项目编号、描述 |
| WBS Element | PRPS | Milestone__c | WBS 编码、描述 |
| Network Activity | AFVC | Project_Task__c | 活动、工期 |
| CATS Time Entry | CATSDB | Time_Entry__c | 工时、日期 |
| Quality Notification | QMEL | Case | 问题描述 |

### 7.3 自定义字段规范

所有自定义字段遵循以下命名约定：
- `{功能描述}__c` — 文本/数值/日期字段
- `{Reference}_r` — 关联关系
- 所有货币字段统一使用 `CurrencyIsoCode` 支持多币种

---

## 8. 集成架构

### 8.1 集成全景图

```
┌─────────────────────────────────────────────────────────────┐
│                     Salesforce Platform                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │Sales Cloud│  │Service   │  │Experience│  │Einstein     │ │
│  │           │  │Cloud     │  │Cloud     │  │Analytics    │ │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│        └──────────────┼─────────────┼──────────────┘        │
│                       │   MuleSoft  │                       │
└───────────────────────┼─────────────┼───────────────────────┘
                        │             │
          ┌─────────────┼─────────────┼─────────────┐
          │             │  ESB / API Gateway         │
          │             │                            │
          │   ┌─────────┴─────────┐                  │
          │   │                   │                  │
          ▼   ▼                   ▼                  ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  SAP ECC │    │  SAP BW  │    │  External│    │  Email   │
    │  FICO    │    │  (未来)  │    │  Tax     │    │  (O365)  │
    │  WM/EWM  │    │  Data    │    │  System  │    │          │
    │          │    │  Lake    │    │          │    │          │
    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 8.2 集成模式

| 集成类型 | 模式 | 频率 | 延迟要求 |
|---------|------|------|---------|
| 客户主数据 | SAP → SF 批量同步 (ETL) | 每日 | < 15 分钟 |
| 销售订单 | SF → SAP 实时同步 (API) | 按事件 | < 30 秒 |
| 信用检查 | SF → SAP 实时查询 (BAPI/RFC) | 按事件 | < 3 秒 |
| 项目成本 | SF → SAP CO 批量同步 | 每日 | < 30 分钟 |
| 开票请求 | SF → SAP 实时同步 | 按事件 | < 1 分钟 |
| 物料主数据 | SAP → SF 批量同步 | 每日 | < 15 分钟 |
| 价格主数据 | SAP → SF 批量同步 | 每小时 | < 5 分钟 |

### 8.3 错误处理

- 所有 API 调用实现重试机制（Exponential Backoff，最多 3 次）
- 同步失败数据进入 `Integration_Error_Log__c` 自定义对象
- 关键集成失败触发 Email + Slack 告警
- 每日自动生成集成健康报告

---

## 9. 迁移策略

### 9.1 迁移原则

1. **增量迁移，非大爆炸**：按销售区域/业务线分批次割接
2. **SAP 作为财务核⼼**：FICO 模块永久保留，不做任何迁移
3. **数据质量优先**：迁移前执行数据清洗（去重、去空、标准化）
4. **双系统并行期**：每批次割接后，SAP 与 Salesforce 并行运行至少 4 周
5. **回滚能力**：每阶段有可执行的回滚方案

### 9.2 迁移阶段

| 阶段 | 内容 | 周期 | 关键交付 |
|------|------|------|---------|
| Phase 0 | 基础设施搭建、环境配置 | 4 周 | 开发/测试/生产环境就绪 |
| Phase 1 | 客户数据迁移、Account/Contact | 6 周 | 客户 360° 视图 |
| Phase 2 | Lead/Opportunity/Quote 上线 | 8 周 | 销售管线可追踪 |
| Phase 3 | Order Management + SAP 订单同步 | 8 周 | 订单双向同步 |
| Phase 4 | Project Management + 资源管理 | 10 周 | 项目交付在线管理 |
| Phase 5 | Service Cloud (Case/KB/Portal) | 8 周 | 售后服务上线 |
| Phase 6 | Einstein AI, 高级报表, 优化 | 6 周 | AI 预测和智能分析 |

### 9.3 数据迁移工具

- 数据抽取：SAP Table Reader / SAP Data Services
- 数据转换：MuleSoft DataWeave / Informatica
- 数据加载：Salesforce Bulk API 2.0 / Data Loader
- 数据校验：自定义 Apex 验证脚本 + 手工抽样（≥10%）

---

## 10. 用户角色与权限矩阵

| 角色 | 主要功能 | 对象权限 | 数据范围 |
|------|---------|---------|---------|
| Sales Rep | Lead, Opportunity, Quote | CRUD 自己的记录 | 自己的客户和商机 |
| Sales Manager | 销售管线管理、审批 | CRUD 团队记录 | 下辖团队数据 |
| Project Manager | 项目创建、资源分配、风险 | CRUD 自己的项目 | 自己负责的项目 |
| Resource Manager | 资源池管理、人力调度 | Read 全部资源 | 全局 |
| Consultant | 工时填报、任务更新 | Read/Update 分配的任务 | 被分配的任务 |
| Customer Service Agent | Case 处理、知识库 | CRUD Cases | 被分配的工单 |
| Service Manager | 工单分析、SLA 管理 | Read 全部 Cases | 全局 + 报表 |
| System Admin | 配置、用户管理 | 全部权限 | 全部 |
| Read-Only Executive | 报表、仪表板 | Read-Only | 全部汇总 |

---

## 11. 非功能性需求

### 11.1 性能

| 指标 | 目标 |
|------|------|
| 页面加载时间 (Lightning) | < 3 秒 (P95) |
| API 响应时间 (查询) | < 1 秒 (P95) |
| 报表运行时间 | < 10 秒 (P95) |
| 并发用户数 | 500+ 同时在线 |
| 数据存储 | 初始 50GB，年增长 20% |

### 11.2 安全与合规

- 传输层：TLS 1.2+ 所有外部通信
- 应用层：Salesforce Shield — 字段审计追踪 + 事件监控
- 数据层：Platform Encryption 加密静止数据
- 认证：SSO (SAML 2.0 / OpenID Connect) + MFA
- 区域合规：遵循当地数据保护法规（如适用：GDPR / PIPL / PDPA）
- IP 白名单限制非工作时间访问

### 11.3 可用性

- Salesforce 目标 SLA: 99.9%+ (平台原生 SLO)
- 计划维护窗口：周六 02:00-06:00 UTC
- SAP-Salesforce 集成可用性目标: 99.5%

### 11.4 国际化

- 多语言界面：EN（默认）、中、日
- 多币种交易：USD, EUR, CNY, JPY, SGD
- 多法人主体：通过 Salesforce Division / Custom Org Hierarchy 隔离

---

## 12. 实施路线图

```
                    2026 Q3  Q4  | 2027 Q1  Q2  Q3  Q4
                    ──────────── | ────────────────────
Phase 0: 环境搭建     ████       |
Phase 1: 客户迁移     ████████   |
Phase 2: 销售流程         ████████ |
Phase 3: 订单管理              ████████ |
Phase 4: 项目管理                  ██████████ |
Phase 5: 客服系统                      ██████████ |
Phase 6: AI + 优化                           ██████ |

关键里程碑:
  ★ Q4-2026: 首批销售用户上线
  ★ Q2-2027: 订单 SAP-SF 双向同步 Go-Live
  ★ Q4-2027: 全模块上线，SAP SD/PS 降级为只读
```

---

## 13. 风险与依赖

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| SAP BAPI 接口文档缺失或过时 | 集成延期 4-6 周 | 中 | Phase 0 先行接口探测和 PoC |
| 数据质量问题导致迁移返工 | 迁移延期、用户不信任 | 高 | Phase 1 前完成数据清洗，设立数据 Owner |
| 用户抵制新系统 | 采纳率低 | 中 | 早期 Champion 用户参与 UAT，培训先行 |
| SAP FICO 接口负载过高 | 财务系统性能下降 | 低 | 设置 API Rate Limit 和缓存层 |
| Salesforce 平台限制 (Governor Limits) | 定制功能不可实现 | 中 | 架构评审前置，遵循 Salesforce Well-Architected |
| MuleSoft 许可成本超预期 | 项目预算超支 | 中 | Phase 0 确定集成中间件选择并进行 TCO 分析 |
| 多语言数据同步时的编码问题 | 数据乱码 | 低 | 统一 UTF-8，集成测试覆盖中日文场景 |

### 依赖关系

```
内部依赖:
  ├── IT 基础设施团队：SSO / IP 白名单 / 网络配置
  ├── SAP Basis 团队：BAPI/RFC 接口开放和性能调优
  └── 业务部门：数据清洗、流程梳理、UAT 资源

外部依赖:
  ├── Salesforce AE/SE：产品许可和架构建议
  ├── MuleSoft (如有)：集成中间件部署和配置
  └── 实施伙伴 (SI)：定制开发和迁移执行
```

---

## 14. 附录

### 14.1 术语表

| 术语 | 全称 | 说明 |
|------|------|------|
| SD | Sales & Distribution (SAP) | SAP 销售与分销模块 |
| PS | Project System (SAP) | SAP 项目系统模块 |
| FICO | Finance & Controlling (SAP) | SAP 财务与管理会计模块 |
| WBS | Work Breakdown Structure | 工作分解结构 |
| CATS | Cross-Application Time Sheet | SAP 跨应用工时表 |
| BAPI | Business Application Programming Interface | SAP 业务 API |
| RFC | Remote Function Call | SAP 远程函数调用 |
| CPQ | Configure Price Quote | Salesforce 配置定价报价工具 |
| LWC | Lightning Web Component | Salesforce 前端组件框架 |
| FRT | First Response Time | 首次响应时间 |
| FCR | First Contact Resolution | 一次解决率 |

### 14.2 参考文档

- SAP SD 功能规范 (Functional Spec) — v2.3, 2024
- SAP PS 业务流程手册 — v1.8, 2023
- Salesforce Well-Architected Framework
- MuleSoft Anypoint Platform 集成指南
- 戴尔 SAP SD/PS 实施经验 — Internal Lessons Learned

### 14.3 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-07-24 | v1.0 | 初始版本 | [Author] |

---

*文档结束*
