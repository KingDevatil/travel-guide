# Travel Planner Complete Product Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复当前审计发现的全部功能、交互、数据一致性、移动端、无障碍、打印、性能与工程质量问题，使现有旅行规划器在桌面和手机端都可完整使用。

**Architecture:** 保留 React + Dexie 的本地优先架构，在数据仓库层增加按行程广播的变更通知，让行程、交通、费用、成员、清单和打印视图自动同步。界面层继续以 `TripWorkspace` 为主工作区，使用响应式布局提供真正的移动端体验，并以共享的对话框无障碍 Hook 统一 Escape、焦点圈定和焦点恢复行为。

**Tech Stack:** React 19、TypeScript 6、Dexie 4、MapLibre GL、Vite 8、Vitest、Testing Library、CSS。

---

### Task 1: 建立回归基线与实施清单

**Files:**
- Create: `docs/plans/2026-07-30-complete-product-hardening.md`
- Modify: `src/test-setup.ts`
- Test: `src/App.test.tsx`

**Step 1: 记录现有测试、构建和 Lint 基线**

Run: `npm test -- --run`

Expected: 在受支持运行时通过；当前系统 Node 如暴露 `localStorage.clear` 兼容问题则记录并修复测试环境。

**Step 2: 修复 Node 测试环境的 Storage/Canvas 兼容层**

为 jsdom 提供完整、可清理的 Storage shim，并为地图测试提供最小 Canvas 上下文替身，避免测试环境噪声掩盖真实失败。

**Step 3: 新增关键行为回归测试**

覆盖归档行程恢复入口、可见行程管理入口、删除确认、行程切换状态重置、移动导航语义以及数据变更后视图刷新。

### Task 2: 修复数据同步与引用完整性

**Files:**
- Create: `src/db/change-events.ts`
- Modify: `src/db/trip-repository.ts`
- Modify: `src/hooks/useItinerary.ts`
- Modify: `src/components/features/ExpenseList.tsx`
- Modify: `src/components/features/PackingList.tsx`
- Modify: `src/components/features/ParticipantManager.tsx`
- Modify: `src/components/PrintTrip.tsx`
- Test: `src/db/trip-repository.test.ts`

**Step 1: 在仓库层增加行程级变更通知**

所有成功的写操作在事务完成后广播 `tripId`，订阅方仅刷新相关行程。

**Step 2: 让各功能视图订阅同一数据源**

行程时间线、地图、费用、清单、成员和打印视图在变更事件后重新读取 Dexie，消除多个 Hook 实例之间的陈旧状态。

**Step 3: 修复删除后的悬空引用**

删除交通时保留但解除关联费用；删除费用时清除交通记录上的 `expenseId`；删除停靠点时解除所有受影响交通费用的 `legId`。

**Step 4: 添加仓库级引用完整性测试**

Run: `npm test -- --run src/db/trip-repository.test.ts`

Expected: 所有删除路径都不留下悬空引用。

### Task 3: 完善对话框、删除确认与无障碍

**Files:**
- Create: `src/hooks/useDialogAccessibility.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/dialogs/StopEditor.tsx`
- Modify: `src/components/dialogs/TripEditor.tsx`
- Modify: `src/components/dialogs/LegEditor.tsx`
- Modify: `src/components/features/ExpenseList.tsx`
- Modify: `src/components/features/PackingList.tsx`
- Modify: `src/components/features/PackingTemplateManager.tsx`
- Modify: `src/components/features/ParticipantManager.tsx`
- Modify: `src/components/itinerary/ItineraryTimeline.tsx`

**Step 1: 建立统一对话框行为**

为所有 modal 增加 `role="dialog"`、`aria-modal`、Escape 关闭、初始焦点、Tab 焦点圈定和关闭后的焦点恢复。

**Step 2: 为所有破坏性操作增加二次确认**

费用、清单项、清单模板、参与者和交通删除均使用现有 `ConfirmDialog`，确认文本明确数据影响。

**Step 3: 移除隐藏的可聚焦工作流**

删除仅用于测试的不可见时间线实例，确保所有功能入口在真实界面可见且可操作。

### Task 4: 补齐移动端和导航体验

**Files:**
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Step 1: 实现真实响应式工作区**

在小于 1024px 时取消固定 1024px 最小宽度，改为单列主内容、横向日期选择、紧凑顶部栏和固定底部主导航。

**Step 2: 处理行程切换与归档空状态**

行程切换时重置所选日期、停靠点和弹窗；当全部行程均已归档时仍显示“管理已归档行程”和“新建行程”入口。

**Step 3: 补齐导航语义**

主导航和日期按钮使用 `aria-current` / `aria-pressed`，移动端固定导航不遮挡正文和弹窗。

### Task 5: 修复地图控制与降级流程

**Files:**
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/components/features/TripMapView.tsx`
- Modify: `src/components/map/TripMap.tsx`
- Modify: `src/index.css`
- Test: `src/components/map/TripMap.test.tsx`

**Step 1: 连接时间线选择与地图焦点**

把 `selectedStopId` 传入地图；点击时间线停靠点后地图同步定位。

**Step 2: 让“适配范围”成为真实动作**

增加 fit 请求序号，按钮每次点击都重新计算当前线路边界；“全程”和“当天”仅负责过滤范围。

**Step 3: 修复地图加载失败后的重试**

重试时安全移除旧实例、重新挂载容器并重新初始化 MapLibre。

**Step 4: 区分交通方式样式**

按交通方式设置路线颜色和虚线规则，使地图表达与图例一致。

### Task 6: 完善费用、AA 与币种处理

**Files:**
- Modify: `src/components/features/ExpenseList.tsx`
- Modify: `src/components/dialogs/LegEditor.tsx`
- Modify: `src/utils/money.ts`
- Modify: `src/utils/settlement.ts`
- Test: `src/utils/settlement.test.ts`

**Step 1: 完善费用字段**

费用表单支持日期时间、备注、停靠点或交通关联；编辑时完整回填，保存时保持互斥关联。

**Step 2: 补齐参与者收支摘要**

按币种展示每位参与者已支付、应承担和净额，并保留最小转账建议。

**Step 3: 统一金额换算**

所有编辑器使用 `toMinorAmount` / `fromMinorAmount`，正确处理 JPY、KWD 等不同小数位币种。

### Task 7: 修复打印并移除虚假信息

**Files:**
- Modify: `src/components/PrintTrip.tsx`
- Modify: `src/components/features/BackupPanel.tsx`
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/index.css`

**Step 1: 让打印内容自动刷新**

打印视图订阅仓库变更，打印触发前再刷新一次，确保刚编辑的数据出现在纸面。

**Step 2: 修复打印样式**

打印时隐藏真实工作区 `.planner-shell` 和浮层，只输出 `.print-trip`。

**Step 3: 删除硬编码天气**

移除并未接入数据源的天气图标和温度文案，避免向用户展示虚假实时信息。

### Task 8: 性能、数据库与遗留代码清理

**Files:**
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/db/db.ts`
- Modify: `src/utils/export-itinerary-html.ts`
- Modify: `package.json`
- Modify: `README.md`
- Delete: 未被任何入口引用的旧 desktop/mobile/dialog/sample/style 文件

**Step 1: 动态拆分地图模块**

使用 `React.lazy` 加载嵌入地图，避免 MapLibre 静态进入主包并消除无效动态导入警告。

**Step 2: 升级 Dexie schema**

新增 `[tripId+date]` 复合索引并验证升级路径，消除查询回退警告。

**Step 3: 清理 Lint 警告和未引用实现**

只删除经 `rg` 和构建确认完全未引用的遗留文件，保留用户已有数据与有效样式。

**Step 4: 更新工程说明**

更新 README 中测试数量、运行时要求和已实现功能说明。

### Task 9: 全量自动化与浏览器验收

**Files:**
- Test: all tests and production build

**Step 1: 执行完整自动化验证**

Run: `npm test -- --run`

Expected: 全部测试通过，无未处理异步更新警告。

Run: `npm run lint`

Expected: 0 errors、0 warnings。

Run: `npm run build`

Expected: 构建成功，地图成为独立异步 chunk，不再出现无效动态导入警告。

**Step 2: 桌面浏览器验收**

验证行程管理、日期切换、停靠点和交通编辑、地图选择与适配、费用关联与删除确认、AA、清单、备份和打印入口；检查控制台。

**Step 3: 移动端浏览器验收**

以 390×844 视口验证无横向页面溢出、底部导航可用、时间线单列、地图/费用/清单可切换、弹窗可关闭且不被底栏遮挡。

**Step 4: 保存最终截图并汇总结果**

输出桌面和移动端关键页面截图路径，记录测试、Lint、构建和浏览器交互结果。
