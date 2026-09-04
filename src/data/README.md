# 游戏数据 JSON

本目录存放所有可配置游戏数据。修改 JSON 后重启/重新加载插件即可生效，不需要改 `src/game.js`。

## 文件说明

| 文件 | 内容 | 新增一条数据的位置 |
|---|---|---|
| `species.json` | 鱼种（含搏鱼体力系数） | 在数组末尾添加一个对象 |
| `maps.json` | 地图（含体力成本） | 在数组末尾添加一个对象 |
| `rods.json` | 鱼竿商品 | 在数组末尾添加一个对象 |
| `baskets.json` | 鱼篓商品 | 在数组末尾添加一个对象 |
| `accessories.json` | 配件商品 | 在数组末尾添加一个对象 |
| `accessorySlots.json` | 配件槽位枚举 | 新增配件类型时修改 |
| `rodTypes.json` | 鱼竿类型枚举 | 新增竿型时修改 |
| `junkItems.json` | 垃圾/杂物枚举 | 新增杂物文案时修改 |
| `fishingEvents.json` | 钓鱼随机事件文案 | 新增等待/收杆/结果事件时修改 |
| `eventStages.json` | 钓鱼阶段枚举 | 新增阶段时修改 |
| `eventKinds.json` | 钓鱼结果类型枚举 | 新增结果类型时修改 |
| `oldRodMigration.json` | 旧鱼竿 id 迁移映射 | 一般不修改 |
| `levelExp.json` | 等级经验表 | 调整等级曲线时修改 |
| `initialState.json` | 新玩家初始存档数据 | 调整开局金币/初始装备/初始文案时修改 |

## 常用新增方式

### 新增鱼

在 `species.json` 数组末尾加入：

```json
{
  "id": "new_fish",
  "name": "新鱼",
  "icon": "assets/fish/carp.svg",
  "minWeightGrams": 100,
  "maxWeightGrams": 500,
  "minLengthCm": 10,
  "maxLengthCm": 30,
  "staminaPerKg": 8,
  "baseValue": 20,
  "requiredRodId": "hand",
  "scoreWeight": 1,
  "maps": ["beginner"],
  "description": "描述",
  "habitat": "栖息地",
  "favoriteBait": "偏好饵料",
  "tips": "技巧"
}
```

### 新增地图

在 `maps.json` 数组末尾加入：

```json
{
  "id": "new_map",
  "name": "地点",
  "icon": "assets/maps/beginner.svg",
  "region": "省",
  "city": "市",
  "spot": "钓点",
  "type": "湖泊",
  "requiredLevel": 1,
  "entryFee": 0,
  "staminaCost": 1,
  "description": "描述",
  "fishIntro": "鱼种介绍"
}
```

### 新增鱼竿

在 `rods.json` 数组末尾加入：

```json
{
  "id": "new_rod",
  "brand": "品牌",
  "model": "型号",
  "name": "鱼竿名",
  "icon": "assets/rods/yunchuan_bamboo.svg",
  "rodType": "hand",
  "type": "手竿",
  "material": "材质",
  "length": "3.6m",
  "sections": 5,
  "power": "硬度",
  "action": "调性",
  "weight": "自重",
  "lureWeight": "—",
  "lineWeight": "线号",
  "closedLength": "收纳",
  "tipDiameter": "先径",
  "buttDiameter": "元径",
  "basePrice": 0,
  "baseSuccessRate": 0.55,
  "weightMultiplier": 1,
  "catchMultiplier": 1
}
```

### 新增配件

在 `accessories.json` 数组末尾加入：

```json
{
  "id": "new_accessory",
  "brand": "品牌",
  "model": "型号",
  "name": "配件名",
  "icon": "assets/accessories/basic_reel.svg",
  "slot": "reel",
  "material": "材质",
  "spec": "规格",
  "basePrice": 100,
  "rodTypes": ["hand"],
  "successRateBonus": 0.01
}
```

`slot` 必须是 `accessorySlots.json` 中已有的 id，`rodTypes` 必须是 `rodTypes.json` 中已有的 id。

### 调整新玩家初始数据

直接改 `initialState.json` 中的字段即可，例如初始金币、初始鱼竿、初始鱼篓、默认地图、初始提示文案等。
