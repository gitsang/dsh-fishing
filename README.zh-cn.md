# @gitsang/dsh-fishing

[English](README.md) · [简体中文](README.zh-cn.md)

一个用于 deepseek-harness **Web** 界面的挂机钓鱼小游戏。

使用 agent 时，token 消耗会被收集为鱼饵：每消耗 1M token 增加 1 个鱼饵。每次抛竿消耗 1 个鱼饵，因此每消耗 1M token 游戏会自动使用当前装备的鱼竿抛竿一次并钓上一条鱼。鱼可以出售换取金币；金币可以用来购买不同品牌的鱼竿。鱼竿不再有等级或升级路线。钓到鱼会获得经验并提升等级；更高等级会解锁新地图。除新手地图外，进入其他地图需要门票。每张门票持续一个自然日，也可以一次购买多天门票。不同地图有不同的鱼，还有更多鱼竿 / 鱼篓 / 配件可供收集。每钓到一种新鱼都会解锁游戏内图鉴条目，记录栖息地、偏好饵料、技巧和你的个人最佳纪录。

游戏从左边的侧边栏打开：在设置按钮上方有一个 `Fishing` 按钮，样式与其他侧边栏按钮一致。点击后会直接在侧边栏中打开钓鱼面板。

## 截图

<img src="assets/screenshots/fishing-game.png" width="170" alt="钓鱼主界面" title="钓鱼主界面">
<img src="assets/screenshots/fishing-equipment.png" width="170" alt="装备与背包" title="装备与背包">
<img src="assets/screenshots/fishing-map.png" width="170" alt="地图详情" title="地图详情">
<img src="assets/screenshots/fishing-shop.png" width="170" alt="商店" title="商店">
<img src="assets/screenshots/fishing-codex.png" width="170" alt="鱼类图鉴" title="鱼类图鉴">

> 截图为侧栏钓鱼面板的静态示例；实际运行时会轮询实时快照并支持交互。

## 工作原理

- **服务端/宿主部分**（`src/index.js`）：订阅 `session/event`，从 `assistant/message` 和 `compaction/summary` 事件中读取 `usage` 并投喂给游戏核心。它暴露两个 HTTP 接口：
  - `GET /fishing/snapshot` — 当前游戏快照 JSON。
  - `POST /fishing/command` — 发送命令，例如 `{"type":"SellFish","fishId":"..."}`。
- **游戏核心**（`src/game.js`）：鱼种、鱼竿、定时钓鱼流程、钓获/出售/升级规则。每次抛竿先进入随机 0-60 秒的等待阶段，再进入随机 0-60 秒的收线阶段；阶段文案/结果事件从 `FISHING_EVENTS` 配置表中读取。它遵循与 pi-fishing 设计文档相同的核心模型，但不会导入或依赖 pi-fishing。
- **浏览器部分**（`src/client.js`）：一个 `dsh.client` Web 插件，将 `Fishing` 侧边栏按钮注册到布局的 `sidebar.footer.action` 插槽中，并轮询快照接口。

## 安装到 Web profile

把这个包添加到 Web profile 的依赖和 bundles 中，例如 `~/.dsh/profiles/web/package.json`：

```json
{
  "dependencies": {
    "@gitsang/dsh-fishing": "link:/path/to/dsh-fishing"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@gitsang/dsh-fishing"
      ]
    }
  }
}
```

然后安装并启动：

```bash
cd ~/.dsh/profiles/web
pnpm install
dsh web
```

宿主插件的配置行由 `cordis.patch.yml` 插入；浏览器插件会从包的 `dsh.client` 声明中自动发现。

## 状态存储

状态存储在 `$DSH_HOME/storages/dsh-fishing/`（默认 `~/.dsh/storages/dsh-fishing/`）：

- `state.json` — 原子快照，防抖写入。
- `events.jsonl` — 追加写入的事件/命令日志；当 `state.json` 缺失或不可读时，用于尽力重建状态。

## 命令

侧边栏面板提供常用操作。原始 HTTP API 接受以下命令类型：

- `SellFish` / `SellAllFish`
- `BuyRod` / `EquipRod`
- `BuyBasket` / `EquipBasket`
- `BuyAccessory` / `EquipAccessory` / `UnequipAccessory`
- `BuyTicket` / `ChangeMap` — 购买多日地图门票并切换地图
  （例如 `{"type":"BuyTicket","mapId":"forest_lake","days":3}`、
  `{"type":"ChangeMap","mapId":"forest_lake"}`）。如果当前正在钓鱼，会取消本次钓鱼并退还已消耗的鱼饵。

## 开发说明

- 游戏 tick 间隔为 500ms；浏览器每 500ms 轮询一次快照。
- Token 数量公式：`inputTokens + outputTokens + cacheReadTokens +
  cacheWriteTokens`（当字段名不同时会回退读取 `input/output/cacheRead/cacheWrite`）。
- 组件刻意保持自包含：客户端只访问 `/fishing/*`，不导入任何 pi-fishing 代码。
