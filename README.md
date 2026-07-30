# Travel Guide · 本地旅行规划器

一个隐私优先、离线可用的旅行规划网页应用。它把行程、地图、消费分摊、行李清单和数据备份放在同一个响应式工作区中，数据默认保存在浏览器本地，不依赖账号或云端服务。

![桌面端设计预览](design/travel-planner-desktop-concept.png)

## 功能

- 多行程管理：首次打开为空白工作区，由用户创建第一条行程；支持编辑、归档、恢复和删除
- 行程时间线：先匹配城市，再搜索地标、酒店、机场或详细地址，按天管理同城多个精确地点、活动与交通段
- 全球地图：基于 MapLibre 展示停靠点和路线，使用 WGS84 坐标
- 消费与预算：记录发生时间、备注、付款人、参与者、多币种消费及其关联节点或交通
- AA 分摊：支持均分、按份额、百分比和固定金额，展示每位成员已付、应付、净额及简化转账建议
- 行李清单：按分类管理物品，支持可编辑自定义模板、数量和完成状态
- 数据安全：JSON 导入导出、备份提醒、导入前校验和冲突处理
- 多端体验：桌面与移动端响应式布局、键盘可访问弹窗及打印版行程单

## 技术栈

- React 19 + TypeScript 6
- Vite 8
- Dexie / IndexedDB 本地持久化
- MapLibre GL JS 地图渲染
- Zod 数据校验
- Vitest + Testing Library
- Oxlint

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

Vite 会输出本地访问地址，通常为 `http://localhost:5173`。

### 地点搜索配置

地点和城市搜索优先使用 Geoapify。API Key 由 Vite 开发服务器或生产 Worker 代为请求，不会进入浏览器代码。复制示例配置并填写密钥即可启用：

```bash
copy .env.example .env.local
```

```dotenv
GEOAPIFY_API_KEY=
```

只在本机 `.env.local` 中为等号后填写真实值；示例文件必须保持空值。未设置 `GEOAPIFY_API_KEY` 时，同源接口会返回明确的“未配置”状态，前端自动回退至 OpenStreetMap Nominatim，无需额外操作。部署时同样使用服务端运行时 Secret `GEOAPIFY_API_KEY`，不要使用会暴露到客户端的 `VITE_` 前缀。

中文机场、火车站、地铁站、医院、停车场等基础设施名称会先按原词搜索；没有结果时，词典会生成保留专名的英文类别查询（例如“朱安达机场”扩展为“朱安达 airport”），不再依赖上海或曼谷等测试地点的硬编码匹配。只有点击“搜索城市”或“搜索地点”（或在输入框按 Enter）后才会发起请求。

### 公网部署安全

- GitHub 只提交空白 `.env.example`；`.env`、`.env.*` 和 `*.local` 均被忽略。
- 生产 Key 只配置为 Sites 运行时 Secret `GEOAPIFY_API_KEY`，不得写入源码、构建参数、托管配置文件或客户端前缀变量。
- `npm run check:secrets` 会检查待提交源码；`npm run build` 会自动先执行该检查，并确认浏览器构建不含 Key 名或疑似凭据。
- 生产搜索代理将查询词限制为 120 个字符、结果上限固定为 6、Geoapify 请求超时为 5 秒，并对同一结果缓存 5 分钟。
- Worker 根据可信代理传入的客户端 IP 执行每分钟 30 次的边缘实例内限流，并拒绝浏览器跨站请求。该限流是降低滥用的第一层防护，不能替代 Geoapify 账户配额、Key 限制或异常流量监控。
- 公共 GitHub 仓库建议保持 [Secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning) 和 [Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) 开启。Geoapify 控制台还可为生产 Key 配置允许的 IP、Referrer、Origin 和 CORS，但服务端 Worker 使用前必须先验证出口信息是否稳定。
- 如果 Key 曾进入 Git 提交、构建日志或公开响应，应先在 Geoapify 撤销并轮换，再处理 Git 历史；删除当前文件不能使已泄露的 Key 恢复安全。

## 质量检查

```bash
npm run check:secrets
npm test
npm run lint
npm run build
```

自动化测试覆盖空白首次启动、全归档恢复、领域模型、基础设施词典、Geoapify 与 Nominatim 回退、城市与具体地点匹配、同城多节点规划、引用完整性、可编辑行李模板、数据持久化、导入导出、地图 GeoJSON、费用分摊和关键业务工作流。

## 数据与隐私

应用数据保存在当前浏览器的 IndexedDB 中，不会自动上传。清除站点数据、切换浏览器或更换设备前，请先在“备份”页面导出 JSON 文件。导入操作会先进行结构校验，并允许选择覆盖或保留冲突数据。

地图底图与任意地点/地址在线搜索需要网络连接；行程管理、消费、行李清单和已保存数据的读取可在本地完成。在线搜索会将查询词和城市范围发送给 Geoapify；未配置或服务不可用时发送给 OpenStreetMap Nominatim。API Key 仅保留在服务端代理环境中。本项目不提供云同步、实时汇率、导航或预订服务。

## 项目结构

```text
src/
  components/       应用工作区、弹窗与打印视图
  data/             离线城市数据与基础设施搜索词典
  db/               IndexedDB 数据库和仓库层
  domain/           领域模型、日期、金额与校验规则
  features/         行程、地图、消费、行李和数据迁移功能
  services/         地点与地址搜索服务
tests/              自动化测试
design/             设计规范、交付说明和视觉稿
docs/plans/         实施与验收修复记录
```

完整产品范围和验收标准见 [旅行规划网页开发计划.md](./旅行规划网页开发计划.md)。

## 构建与部署

```bash
npm run build
npm run preview
```

生产文件输出到 `dist/`。静态资源可部署到支持 SPA 回退的服务；要隐藏 Geoapify API Key，还需部署 `dist/server/index.js` 中生成的 Worker，并在运行时设置 `GEOAPIFY_API_KEY`。不配置密钥时应用仍会自动使用 Nominatim。
