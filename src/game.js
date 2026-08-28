/**
 * Pure-ish fishing game core. The host adapter feeds it token events and
 * commands; the web client renders snapshots. It intentionally does not import
 * any deepseek-harness or pi-fishing code.
 */

import { randomUUID } from 'node:crypto'

export const GAME_VERSION = 1
export const BAIT_TOKENS_PER_BAIT = 1_000_000

export const SPECIES = [
  { id: 'carp', name: '鲫鱼', emoji: '🐟', rarity: 'common', minWeightGrams: 200, maxWeightGrams: 800, minLengthCm: 15, maxLengthCm: 30, baseValue: 12, requiredRodId: 'hand', scoreWeight: 1, maps: ['beginner'], description: '最常见的淡水鱼，适应力强，是新手钓友的好伙伴。', habitat: '水草丰茂的静水区、金鸡湖', favoriteBait: '蚯蚓、面团', tips: '清晨和傍晚开口更好，手竿轻提即可。' },
  { id: 'crucian', name: '鲤鱼', emoji: '🐠', rarity: 'common', minWeightGrams: 500, maxWeightGrams: 1500, minLengthCm: 20, maxLengthCm: 40, baseValue: 20, requiredRodId: 'hand', scoreWeight: 1, maps: ['beginner'], description: '鳞片金黄、体格圆润的鲤鱼，寓意吉祥。', habitat: '湖底淤泥、水草边', favoriteBait: '玉米粒、红薯饵', tips: '咬钩动作沉稳，等浮漂连续下顿再提竿。' },
  { id: 'koi', name: '锦鲤', emoji: '🐠', rarity: 'epic', minWeightGrams: 1500, maxWeightGrams: 5000, minLengthCm: 35, maxLengthCm: 70, baseValue: 400, requiredRodId: 'hand', scoreWeight: 1, maps: ['forest_lake', 'legendary_waters'], description: '色彩华丽的观赏鲤，传说能带来好运。', habitat: '西湖的深水区、普达措', favoriteBait: '特制鱼粮、小虾', tips: '锦鲤很聪明，钓线尽量细、动作要轻。' },
  { id: 'bass', name: '鲈鱼', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 800, maxWeightGrams: 2500, minLengthCm: 30, maxLengthCm: 55, baseValue: 45, requiredRodId: 'sea', scoreWeight: 1, maps: ['deep_sea', 'qingdao_coast', 'south_sea'], description: '肉食性海鱼，体型匀称，力道十足。', habitat: '近海岩礁、深水急流', favoriteBait: '小鱼、活虾', tips: '路亚/海竿抛投后慢收，容易触发攻击。' },
  { id: 'catfish', name: '鲶鱼', emoji: '🐡', rarity: 'rare', minWeightGrams: 2000, maxWeightGrams: 6000, minLengthCm: 40, maxLengthCm: 80, baseValue: 120, requiredRodId: 'sea', scoreWeight: 1, maps: ['forest_lake', 'pearl_river'], description: '有须的底栖鱼，白天藏在泥洞中。', habitat: '湖泊泥底、桥洞下', favoriteBait: '鸡肝、腥味饵', tips: '夜钓效率更高，中钩后它会往淤泥里钻。' },
  { id: 'arowana', name: '龙鱼', emoji: '🐉', rarity: 'legendary', minWeightGrams: 3000, maxWeightGrams: 9000, minLengthCm: 50, maxLengthCm: 90, baseValue: 1200, requiredRodId: 'sea', scoreWeight: 1, maps: ['legendary_waters'], description: '被称为“活化石”的古老鱼类，鳞片如龙甲。', habitat: '普达措的上层水面', favoriteBait: '小鱼、昆虫', tips: '需要高等级地图和强力鱼竿，中钩后小心爆发力。' },
  { id: 'trout', name: '鳟鱼', emoji: '🐠', rarity: 'uncommon', minWeightGrams: 600, maxWeightGrams: 1800, minLengthCm: 25, maxLengthCm: 45, baseValue: 50, requiredRodId: 'fly', scoreWeight: 1, maps: ['mountain_river', 'northeast_river'], description: '喜欢冷水溪流的鱼，肉质细嫩。', habitat: '山涧急流、清澈浅滩', favoriteBait: '飞蝇、红虫', tips: '用飞蝇竿模拟昆虫落水，溪流中快速收线。' },
  { id: 'mandarin', name: '鳜鱼', emoji: '🐟', rarity: 'rare', minWeightGrams: 1000, maxWeightGrams: 3500, minLengthCm: 30, maxLengthCm: 60, baseValue: 150, requiredRodId: 'lure', scoreWeight: 1, maps: ['forest_lake', 'pearl_river'], description: '身上有斑纹的凶猛淡水鱼，鳜鱼的一种。', habitat: '西湖的乱石底', favoriteBait: '小鱼、泥鳅', tips: '藏在石缝中，路亚饵贴近底部慢拖效果好。' },
  { id: 'bream', name: '鳊鱼', emoji: '🐟', rarity: 'common', minWeightGrams: 300, maxWeightGrams: 1200, minLengthCm: 18, maxLengthCm: 35, baseValue: 15, requiredRodId: 'feeder', scoreWeight: 1, maps: ['beginner'], description: '体型侧扁的淡水鱼，适合入门垂钓。', habitat: '金鸡湖的缓流区', favoriteBait: '麦粒、商品粉饵', tips: '浮漂微微点动时别急着提，等真实咬口。' },
  { id: 'grass_carp', name: '草鱼', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 1000, maxWeightGrams: 4000, minLengthCm: 30, maxLengthCm: 60, baseValue: 55, requiredRodId: 'feeder', scoreWeight: 1, maps: ['beginner', 'pearl_river', 'yangtze_river'], description: '吃水草长大的大型淡水鱼，力量很大。', habitat: '水草区、人工鱼塘', favoriteBait: '草叶、玉米', tips: '中钩后会猛冲，飞德杆要调好泄力。' },
  { id: 'black_carp', name: '青鱼', emoji: '🐠', rarity: 'rare', minWeightGrams: 2000, maxWeightGrams: 8000, minLengthCm: 40, maxLengthCm: 80, baseValue: 180, requiredRodId: 'feeder', scoreWeight: 1, maps: ['forest_lake', 'yangtze_river'], description: '青黑色的大型鲤科鱼，以螺蛳为食。', habitat: '西湖深水底', favoriteBait: '螺蛳、贝类', tips: '底钓为主，饵要沉到泥底才有机会。' },
  { id: 'tilapia', name: '罗非鱼', emoji: '🐟', rarity: 'common', minWeightGrams: 250, maxWeightGrams: 1000, minLengthCm: 16, maxLengthCm: 35, baseValue: 16, requiredRodId: 'hand', scoreWeight: 1, maps: ['beginner', 'pearl_river'], description: '繁殖力强、肉质扎实的罗非鱼。', habitat: '温暖浅水、鱼塘岸边', favoriteBait: '腥香饵、面包', tips: '成群活动，找到鱼群后可以连竿。' },
  { id: 'perch', name: '河鲈', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 500, maxWeightGrams: 2000, minLengthCm: 22, maxLengthCm: 48, baseValue: 60, requiredRodId: 'lure', scoreWeight: 1, maps: ['forest_lake'], description: '河鲈背鳍带刺，性情凶猛，喜欢伏击。', habitat: '西湖的水草边、倒木旁', favoriteBait: '小鱼、亮片', tips: '抛到障碍物附近慢速收线，常有意想不到的咬口。' },
  { id: 'eel', name: '鳗鱼', emoji: '🐍', rarity: 'rare', minWeightGrams: 800, maxWeightGrams: 3500, minLengthCm: 30, maxLengthCm: 70, baseValue: 160, requiredRodId: 'feeder', scoreWeight: 1, maps: ['forest_lake', 'pearl_river'], description: '身体细长如蛇，夜间更活跃。', habitat: '湖泊淤泥、石缝', favoriteBait: '蚯蚓、动物内脏', tips: '夜钓、沉底钓更容易遇到。' },
  { id: 'char', name: '红点鲑', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 400, maxWeightGrams: 1600, minLengthCm: 20, maxLengthCm: 45, baseValue: 70, requiredRodId: 'fly', scoreWeight: 1, maps: ['mountain_river', 'northeast_river'], description: '红点鲑是冷水鱼中的精灵，体色鲜艳。', habitat: '高海拔冷水溪流', favoriteBait: '飞蝇、小虫', tips: '清晨水面有昆虫时最活跃。' },
  { id: 'salmon', name: '鲑鱼', emoji: '🐟', rarity: 'rare', minWeightGrams: 1500, maxWeightGrams: 6000, minLengthCm: 35, maxLengthCm: 80, baseValue: 220, requiredRodId: 'fly', scoreWeight: 1, maps: ['mountain_river', 'northeast_river'], description: '洄游性鲑鱼，逆流而上时格外凶猛。', habitat: '漓江的深潭、急流', favoriteBait: '鱼卵、飞蝇', tips: '秋季繁殖洄游期更容易碰到大个体。' },
  { id: 'yellow_croaker', name: '黄花鱼', emoji: '🐟', rarity: 'common', minWeightGrams: 200, maxWeightGrams: 900, minLengthCm: 15, maxLengthCm: 32, baseValue: 22, requiredRodId: 'surf', scoreWeight: 1, maps: ['deep_sea', 'qingdao_coast'], description: '近海常见鱼类，因鱼鳔能发声得名。', habitat: '近岸泥沙底、浅海', favoriteBait: '虾肉、沙蚕', tips: '潮水初涨时咬口好，滩钓抛远一些。' },
  { id: 'mackerel', name: '鲭鱼', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 400, maxWeightGrams: 1600, minLengthCm: 20, maxLengthCm: 45, baseValue: 45, requiredRodId: 'surf', scoreWeight: 1, maps: ['deep_sea', 'qingdao_coast'], description: '游速快的海洋鱼类，常成群巡游。', habitat: '深海表层、冷水与暖流交汇处', favoriteBait: '亮片、小鱼段', tips: '看到海鸟聚集时抛竿，往往有鱼群。' },
  { id: 'grouper', name: '石斑鱼', emoji: '🐟', rarity: 'rare', minWeightGrams: 1500, maxWeightGrams: 8000, minLengthCm: 30, maxLengthCm: 90, baseValue: 250, requiredRodId: 'surf', scoreWeight: 1, maps: ['deep_sea', 'south_sea'], description: '石斑鱼是伏击型海鱼，肉质鲜美。', habitat: '珊瑚礁、岩洞、沉船', favoriteBait: '活虾、小鱼', tips: '重铅快速到底，在礁石缝隙附近多等一会。' },
  { id: 'tuna', name: '金枪鱼', emoji: '🐟', rarity: 'epic', minWeightGrams: 3000, maxWeightGrams: 15000, minLengthCm: 50, maxLengthCm: 120, baseValue: 800, requiredRodId: 'sea', scoreWeight: 1, maps: ['deep_sea', 'south_sea'], description: '金枪鱼是海洋中的高速鱼雷。', habitat: '远洋深水区', favoriteBait: '整条小鱼、鱿鱼', tips: '中钩后第一波冲刺极强，需要高等级海竿。' },
  { id: 'marlin', name: '旗鱼', emoji: '🐟', rarity: 'legendary', minWeightGrams: 8000, maxWeightGrams: 30000, minLengthCm: 80, maxLengthCm: 180, baseValue: 2500, requiredRodId: 'surf', scoreWeight: 1, maps: ['deep_sea', 'legendary_waters', 'south_sea'], description: '旗鱼拥有长吻和帆状背鳍，是海中王者。', habitat: '热带远洋、深蓝水域', favoriteBait: '活饵、拖钓假饵', tips: '遇见后要抓住短暂窗口，稳住鱼竿慢慢消耗体力。' },
  { id: 'sturgeon', name: '中华鲟', emoji: '🐉', rarity: 'legendary', minWeightGrams: 5000, maxWeightGrams: 20000, minLengthCm: 60, maxLengthCm: 150, baseValue: 3000, requiredRodId: 'feeder', scoreWeight: 1, maps: ['legendary_waters', 'yangtze_river'], description: '中华鲟是古老的珍稀鱼类，有“水中大熊猫”之称。', habitat: '普达措的深水底层', favoriteBait: '底栖小生物、特制饵', tips: '极其稀有，需要顶级装备和耐心。' },
  { id: 'king_salmon', name: '帝王鲑', emoji: '🐠', rarity: 'epic', minWeightGrams: 4000, maxWeightGrams: 12000, minLengthCm: 55, maxLengthCm: 110, baseValue: 900, requiredRodId: 'fly', scoreWeight: 1, maps: ['legendary_waters'], description: '帝王鲑是鲑鱼中的王者，体型与力量俱佳。', habitat: '普达措的冷水深渊', favoriteBait: '大号飞蝇、鱼卵', tips: '只在传说水域现身，中钩后准备长时间搏斗。' },
  { id: 'golden_carp', name: '金鲤', emoji: '🐠', rarity: 'epic', minWeightGrams: 2000, maxWeightGrams: 7000, minLengthCm: 40, maxLengthCm: 85, baseValue: 600, requiredRodId: 'hand', scoreWeight: 1, maps: ['legendary_waters'], description: '通体金红的祥瑞之鲤，据说见过它会有好运。', habitat: '普达措的灵泉深处', favoriteBait: '金色谷物、灵泉饵', tips: '传闻它喜欢在满月时浮出水面。' },
  { id: 'taimen', name: '哲罗鲑', emoji: '🐟', rarity: 'legendary', minWeightGrams: 3000, maxWeightGrams: 30000, minLengthCm: 50, maxLengthCm: 150, baseValue: 2800, requiredRodId: 'fly', scoreWeight: 1, maps: ['northeast_river', 'xinjiang_lake'], description: '我国北方冷水溪流中的大型鲑科鱼，有“水中猛虎”之称。', habitat: '清澈冷水的深潭与急流', favoriteBait: '大号飞蝇、小鱼', tips: '清晨和傍晚活性最高，中钩后冲击力极强。' },
  { id: 'lenok', name: '细鳞鲑', emoji: '🐠', rarity: 'rare', minWeightGrams: 500, maxWeightGrams: 3000, minLengthCm: 20, maxLengthCm: 60, baseValue: 220, requiredRodId: 'fly', scoreWeight: 1, maps: ['northeast_river', 'mountain_river'], description: '冷水性鲑科鱼，体侧有细小鳞片，喜清澈溪流。', habitat: '高海拔冷水溪流', favoriteBait: '飞蝇、昆虫幼虫', tips: '用飞蝇模拟落水昆虫，溪流中快速收线。' },
  { id: 'burbot', name: '江鳕', emoji: '🐍', rarity: 'rare', minWeightGrams: 800, maxWeightGrams: 5000, minLengthCm: 30, maxLengthCm: 80, baseValue: 260, requiredRodId: 'feeder', scoreWeight: 1, maps: ['northeast_river', 'xinjiang_lake'], description: '唯一生活在淡水的鳕鱼，夜间活动，喜冷水。', habitat: '江河深水与冷水湖底', favoriteBait: '小鱼、动物内脏', tips: '夜钓沉底更容易遇到。' },
  { id: 'chum_salmon', name: '大马哈鱼', emoji: '🐟', rarity: 'epic', minWeightGrams: 2500, maxWeightGrams: 10000, minLengthCm: 50, maxLengthCm: 100, baseValue: 900, requiredRodId: 'fly', scoreWeight: 1, maps: ['northeast_river'], description: '秋季从太平洋溯河洄游的鲑鱼，是东北界江名鱼。', habitat: '冷水江河与入海口', favoriteBait: '鱼卵、大号飞蝇', tips: '洄游期体力充沛，需要足够强力的飞蝇竿。' },
  { id: 'naked_carp', name: '青海湖裸鲤', emoji: '🐠', rarity: 'rare', minWeightGrams: 300, maxWeightGrams: 2000, minLengthCm: 15, maxLengthCm: 50, baseValue: 180, requiredRodId: 'hand', scoreWeight: 1, maps: ['qinghai_lake'], description: '俗称“湟鱼”，青海湖特有珍稀鱼类，耐高寒盐碱。', habitat: '高原咸水湖浅水区', favoriteBait: '糌粑饵、小虫', tips: '高原水温低，鱼口轻，浮漂要调灵敏。' },
  { id: 'plateau_loach', name: '高原鳅', emoji: '🐍', rarity: 'common', minWeightGrams: 50, maxWeightGrams: 300, minLengthCm: 8, maxLengthCm: 20, baseValue: 18, requiredRodId: 'hand', scoreWeight: 1, maps: ['qinghai_lake'], description: '适应高原环境的鳅科小鱼，常在水底砂石间活动。', habitat: '高原湖泊与河流砂石底', favoriteBait: '红虫、蚯蚓段', tips: '底钓小钩细线，动作要轻。' },
  { id: 'spotted_naked_carp', name: '花斑裸鲤', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 200, maxWeightGrams: 1500, minLengthCm: 12, maxLengthCm: 45, baseValue: 60, requiredRodId: 'hand', scoreWeight: 1, maps: ['qinghai_lake'], description: '高原河流中的鲤科鱼，体侧有稀疏斑点。', habitat: '高原湖泊与河流缓流区', favoriteBait: '谷物饵、小虾', tips: '晴天水温升高时更活跃。' },
  { id: 'humphead_wrasse', name: '苏眉鱼', emoji: '🐟', rarity: 'legendary', minWeightGrams: 5000, maxWeightGrams: 30000, minLengthCm: 40, maxLengthCm: 120, baseValue: 3500, requiredRodId: 'surf', scoreWeight: 1, maps: ['south_sea'], description: '南海珊瑚礁区的名贵大型鱼，额头隆起，色彩艳丽。', habitat: '热带珊瑚礁与外海岩礁', favoriteBait: '活虾、鱿鱼', tips: '在珊瑚礁边缘守钓，中钩后要防止钻礁。' },
  { id: 'parrotfish', name: '鹦嘴鱼', emoji: '🐠', rarity: 'uncommon', minWeightGrams: 500, maxWeightGrams: 4000, minLengthCm: 20, maxLengthCm: 70, baseValue: 80, requiredRodId: 'surf', scoreWeight: 1, maps: ['south_sea'], description: '珊瑚礁常见鱼类，嘴部像鹦鹉，啃食珊瑚藻类。', habitat: '热带珊瑚礁区', favoriteBait: '藻饵、虾肉', tips: '白天在礁区觅食，轻矶钓容易遇见。' },
  { id: 'moray_eel', name: '海鳗', emoji: '🐍', rarity: 'rare', minWeightGrams: 1000, maxWeightGrams: 8000, minLengthCm: 40, maxLengthCm: 120, baseValue: 280, requiredRodId: 'surf', scoreWeight: 1, maps: ['south_sea', 'deep_sea'], description: '凶猛的海底肉食性鱼类，常藏在岩缝中。', habitat: '珊瑚礁、岩洞、沉船', favoriteBait: '鱿鱼、小鱼块', tips: '夜钓或黄昏钓更容易，中钩后立即拉离礁石。' },
  { id: 'yellowcheek_carp', name: '鳡鱼', emoji: '🐟', rarity: 'epic', minWeightGrams: 2000, maxWeightGrams: 20000, minLengthCm: 40, maxLengthCm: 120, baseValue: 1200, requiredRodId: 'lure', scoreWeight: 1, maps: ['yangtze_river'], description: '长江流域的大型凶猛淡水鱼，游速极快，被称为“水老虎”。', habitat: '大江干流与开阔湖面', favoriteBait: '活鱼、亮片', tips: '路亚远投快速收线，刺激它追咬。' },
  { id: 'longsnout_catfish', name: '长吻鮠', emoji: '🐟', rarity: 'rare', minWeightGrams: 800, maxWeightGrams: 6000, minLengthCm: 25, maxLengthCm: 80, baseValue: 300, requiredRodId: 'feeder', scoreWeight: 1, maps: ['yangtze_river'], description: '俗称“江团”，长江名贵经济鱼类，吻长、肉质细嫩。', habitat: '江河深水与乱石底', favoriteBait: '虾肉、螺蛳', tips: '底钓为主，水流较急时加重铅坠。' },
  { id: 'mud_carp', name: '鲮鱼', emoji: '🐟', rarity: 'common', minWeightGrams: 200, maxWeightGrams: 1500, minLengthCm: 15, maxLengthCm: 40, baseValue: 18, requiredRodId: 'hand', scoreWeight: 1, maps: ['pearl_river', 'beginner'], description: '华南暖水性鱼类，喜群游，肉质细嫩。', habitat: '江河缓流、水草边', favoriteBait: '麦麸、商品粉饵', tips: '成群活动，打窝后常能连竿。' },
  { id: 'snakehead', name: '斑鳢', emoji: '🐍', rarity: 'rare', minWeightGrams: 500, maxWeightGrams: 4000, minLengthCm: 20, maxLengthCm: 70, baseValue: 140, requiredRodId: 'lure', scoreWeight: 1, maps: ['pearl_river', 'forest_lake'], description: '俗称“生鱼”，华南常见的凶猛肉食性淡水鱼。', habitat: '水草茂密、泥底静水', favoriteBait: '青蛙形假饵、小鱼', tips: '雷蛙或软饵在水草区慢拖容易触发攻击。' },
  { id: 'peled', name: '高白鲑', emoji: '🐟', rarity: 'epic', minWeightGrams: 500, maxWeightGrams: 3500, minLengthCm: 25, maxLengthCm: 60, baseValue: 700, requiredRodId: 'fly', scoreWeight: 1, maps: ['xinjiang_lake'], description: '引入喀纳斯湖等高山冷水湖的鲑科鱼，适应低温。', habitat: '高山冷水湖的中上层', favoriteBait: '飞蝇、小鱼', tips: '清晨风平浪静时在水面附近觅食。' },
  { id: 'spanish_mackerel', name: '鲅鱼', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 1000, maxWeightGrams: 8000, minLengthCm: 30, maxLengthCm: 100, baseValue: 90, requiredRodId: 'surf', scoreWeight: 1, maps: ['qingdao_coast', 'deep_sea'], description: '北方沿海常见的洄游性鱼类，游速快，味道鲜美。', habitat: '近海表层与沿岸水域', favoriteBait: '亮片、小鱼段', tips: '春秋两季近岸追捕小鱼时最好钓。' },
  { id: 'black_seabream', name: '黑鲷', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 300, maxWeightGrams: 3000, minLengthCm: 15, maxLengthCm: 55, baseValue: 75, requiredRodId: 'surf', scoreWeight: 1, maps: ['qingdao_coast', 'deep_sea'], description: '北方礁石区常见的鲷科鱼，体色偏黑，警惕性高。', habitat: '近海岩礁、防波堤', favoriteBait: '虾仁、沙蚕', tips: '轻矶钓、细线小钩，打窝后等口。' },
  { id: 'hairtail', name: '带鱼', emoji: '🐍', rarity: 'rare', minWeightGrams: 200, maxWeightGrams: 2000, minLengthCm: 30, maxLengthCm: 100, baseValue: 120, requiredRodId: 'surf', scoreWeight: 1, maps: ['qingdao_coast'], description: '我国北方沿海重要经济鱼类，体形侧扁如带。', habitat: '近海与较深水域', favoriteBait: '小鱼段、鱿鱼条', tips: '夜钓或晨昏时段更容易遇到。' },
  { id: 'flatfish', name: '偏口鱼', emoji: '🐟', rarity: 'common', minWeightGrams: 200, maxWeightGrams: 2000, minLengthCm: 15, maxLengthCm: 50, baseValue: 30, requiredRodId: 'surf', scoreWeight: 1, maps: ['qingdao_coast'], description: '比目鱼的一种，两眼同在身体一侧，常伏在沙底。', habitat: '近岸泥沙海底', favoriteBait: '沙蚕、虾肉', tips: '沉底钓，等它吞饵后再提竿。' }
]

export const MAPS = [
  { id: 'beginner', name: '江苏·苏州·金鸡湖（城市湖泊）', emoji: '🏞️', region: '江苏', city: '苏州', spot: '金鸡湖', type: '城市湖泊', requiredLevel: 1, entryFee: 0, description: '苏州金鸡湖是开放式城市湖泊，水域开阔、交通方便，适合新手熟悉抛竿和看漂。', fishIntro: '常见鲫鱼、鲤鱼、鳊鱼、草鱼，也有适应力强的罗非鱼和鲮鱼。' },
  { id: 'forest_lake', name: '浙江·杭州·西湖（湖泊）', emoji: '🌲', region: '浙江', city: '杭州', spot: '西湖', type: '湖泊', requiredLevel: 3, entryFee: 100, description: '杭州西湖三面环山，湖光潋滟，是江南淡水钓的经典场景。', fishIntro: '湖中鲤科鱼类丰富，也有鳜鱼、青鱼、河鲈、鳗鲡等。' },
  { id: 'mountain_river', name: '广西·桂林·漓江（江河）', emoji: '⛰️', region: '广西', city: '桂林', spot: '漓江', type: '江河', requiredLevel: 5, entryFee: 250, description: '桂林漓江穿行喀斯特峰林，水清流急，是南方江河钓的代表。', fishIntro: '漓江有鳜鱼、马口鱼、光倒刺鲃等；上游冷水段也能遇到鳟鲑类。' },
  { id: 'pearl_river', name: '广东·广州·珠江（城市江河）', emoji: '🏙️', region: '广东', city: '广州', spot: '珠江', type: '城市江河', requiredLevel: 6, entryFee: 300, description: '珠江穿城而过，水温较高，鱼种偏南方暖水性。', fishIntro: '罗非鱼、鲮鱼、鳜鱼、斑鳢等华南江河鱼类丰富。' },
  { id: 'northeast_river', name: '黑龙江·漠河·黑龙江（界江）', emoji: '❄️', region: '黑龙江', city: '漠河', spot: '黑龙江', type: '界江', requiredLevel: 7, entryFee: 350, description: '中国最北的界江，冬季漫长、夏季短暂，江水冰冷，鱼种独特。', fishIntro: '冷水鱼丰富：哲罗鲑、细鳞鲑、江鳕、大马哈鱼等。' },
  { id: 'qingdao_coast', name: '山东·青岛·栈桥（北方海滨）', emoji: '🏖️', region: '山东', city: '青岛', spot: '栈桥', type: '北方海滨', requiredLevel: 8, entryFee: 450, description: '青岛栈桥一带是北方经典海钓场，礁石与沙滩并存。', fishIntro: '北方近海有鲅鱼、黑鲷、带鱼、鲈鱼、偏口鱼等。' },
  { id: 'deep_sea', name: '福建·厦门·鼓浪屿（海滨）', emoji: '🌊', region: '福建', city: '厦门', spot: '鼓浪屿', type: '海滨', requiredLevel: 8, entryFee: 500, description: '厦门鼓浪屿周边海域礁石与沙滩交错，是东南沿海矶钓、滩钓的热门地。', fishIntro: '近海有黄花鱼、鲭鱼、石斑和鲈鱼，远一些能碰金枪鱼、旗鱼。' },
  { id: 'qinghai_lake', name: '青海·海南州·青海湖（高原咸水湖）', emoji: '💧', region: '青海', city: '海南州', spot: '青海湖', type: '高原咸水湖', requiredLevel: 9, entryFee: 600, description: '中国最大的内陆咸水湖，湖水湛蓝，四周草原雪山环绕。', fishIntro: '以青海湖裸鲤（湟鱼）为代表，另有花斑裸鲤和高原鳅等耐盐碱鱼类。' },
  { id: 'south_sea', name: '海南·三亚·蜈支洲岛（热带海岛）', emoji: '🏝️', region: '海南', city: '三亚', spot: '蜈支洲岛', type: '热带海岛', requiredLevel: 10, entryFee: 750, description: '三亚热带海岛水质清澈、珊瑚礁密布，是南海热带海钓胜地。', fishIntro: '珊瑚礁鱼类丰富：苏眉、鹦嘴鱼、石斑、海鳗，外海有金枪鱼。' },
  { id: 'yangtze_river', name: '湖北·宜昌·三峡（长江峡谷）', emoji: '⛰️', region: '湖北', city: '宜昌', spot: '三峡', type: '长江峡谷', requiredLevel: 11, entryFee: 850, description: '宜昌三峡江段峡谷深切、水流湍急，是长江大型鱼类栖息地。', fishIntro: '长江江段有青鱼、草鱼、鳡鱼、长吻鮠，历史上也是中华鲟洄游通道。' },
  { id: 'legendary_waters', name: '云南·香格里拉·普达措（高原湖泊）', emoji: '✨', region: '云南', city: '香格里拉', spot: '普达措', type: '高原湖泊', requiredLevel: 12, entryFee: 1000, description: '普达措国家公园湖泊清澈，海拔高、水温低，带着秘境气质。', fishIntro: '高原冷水湖泊里有锦鲤、龙鱼、金鲤等珍稀鱼种（游戏设定）。' },
  { id: 'xinjiang_lake', name: '新疆·阿勒泰·喀纳斯湖（高山湖泊）', emoji: '🏔️', region: '新疆', city: '阿勒泰', spot: '喀纳斯湖', type: '高山湖泊', requiredLevel: 13, entryFee: 1200, description: '喀纳斯湖藏身阿尔泰深山，湖水深邃，有“湖怪”传说。', fishIntro: '高山冷水湖中有哲罗鲑、高白鲑、江鳕等珍稀冷水鱼。' }
]

export const RODS = [
  { id: 'hand', name: '手竿', emoji: '🎋', basePrice: 0, upgradeBasePrice: 80, maxLevel: 5, rarityMultiplier: 1.0, weightMultiplier: 1.0, baseSuccessRate: 0.55, successRatePerLevel: 0.04, maxWeightPerLevel: 0.10, species: ['carp', 'crucian', 'koi', 'tilapia', 'golden_carp', 'naked_carp', 'plateau_loach', 'spotted_naked_carp', 'mud_carp'] },
  { id: 'sea', name: '海竿', emoji: '🎣', basePrice: 300, upgradeBasePrice: 200, maxLevel: 5, rarityMultiplier: 1.5, weightMultiplier: 1.1, baseSuccessRate: 0.60, successRatePerLevel: 0.04, maxWeightPerLevel: 0.10, species: ['bass', 'catfish', 'arowana', 'tuna', 'humphead_wrasse', 'moray_eel'] },
  { id: 'lure', name: '路亚竿', emoji: '🎣', basePrice: 900, upgradeBasePrice: 500, maxLevel: 5, rarityMultiplier: 2.5, weightMultiplier: 1.2, baseSuccessRate: 0.65, successRatePerLevel: 0.04, maxWeightPerLevel: 0.10, species: ['perch', 'mandarin', 'snakehead', 'yellowcheek_carp'] },
  { id: 'feeder', name: '飞德杆', emoji: '🎣', basePrice: 600, upgradeBasePrice: 350, maxLevel: 5, rarityMultiplier: 2.0, weightMultiplier: 1.15, baseSuccessRate: 0.62, successRatePerLevel: 0.04, maxWeightPerLevel: 0.10, species: ['bream', 'grass_carp', 'black_carp', 'eel', 'sturgeon', 'burbot', 'longsnout_catfish'] },
  { id: 'fly', name: '飞蝇竿', emoji: '🪰', basePrice: 1200, upgradeBasePrice: 650, maxLevel: 5, rarityMultiplier: 3.0, weightMultiplier: 1.25, baseSuccessRate: 0.68, successRatePerLevel: 0.04, maxWeightPerLevel: 0.10, species: ['trout', 'char', 'salmon', 'king_salmon', 'taimen', 'lenok', 'chum_salmon', 'peled'] },
  { id: 'surf', name: '滩钓竿', emoji: '🏖️', basePrice: 1500, upgradeBasePrice: 800, maxLevel: 5, rarityMultiplier: 3.5, weightMultiplier: 1.3, baseSuccessRate: 0.70, successRatePerLevel: 0.04, maxWeightPerLevel: 0.10, species: ['yellow_croaker', 'mackerel', 'grouper', 'marlin', 'humphead_wrasse', 'parrotfish', 'moray_eel', 'spanish_mackerel', 'black_seabream', 'hairtail', 'flatfish'] }
]

export const BASKETS = [
  { id: 'small', name: '小鱼篓', emoji: '🧺', capacity: 5, basePrice: 0 },
  { id: 'medium', name: '中鱼篓', emoji: '🧺', capacity: 10, basePrice: 200 },
  { id: 'large', name: '大鱼篓', emoji: '🧺', capacity: 15, basePrice: 500 },
  { id: 'extra_large', name: '特大鱼篓', emoji: '🧺', capacity: 20, basePrice: 900 },
  { id: 'deluxe', name: '豪华鱼篓', emoji: '🧺', capacity: 30, basePrice: 1600 }
]

export const ACCESSORY_SLOTS = [
  { id: 'reel', name: '渔轮' },
  { id: 'line', name: '钓线' },
  { id: 'lure', name: '假饵' },
  { id: 'hook', name: '鱼钩' },
  { id: 'bobber', name: '浮漂' },
  { id: 'sinker', name: '铅坠' }
]

export const ACCESSORIES = [
  { id: 'basic_reel', name: '基础渔轮', emoji: '🎡', slot: 'reel', basePrice: 80, rodTypes: ['sea', 'feeder'], successRateBonus: 0.03 },
  { id: 'strong_reel', name: '强力渔轮', emoji: '⚙️', slot: 'reel', basePrice: 220, rodTypes: ['sea', 'feeder'], successRateBonus: 0.06 },
  { id: 'master_reel', name: '大师渔轮', emoji: '🎯', slot: 'reel', basePrice: 600, rodTypes: ['sea', 'feeder', 'fly', 'surf'], successRateBonus: 0.09 },
  { id: 'carbon_line', name: '碳素钓线', emoji: '🧵', slot: 'line', basePrice: 100, rodTypes: ['hand', 'sea', 'lure', 'feeder'], maxWeightBonus: 0.1 },
  { id: 'braided_line', name: '编织钓线', emoji: '🪢', slot: 'line', basePrice: 260, rodTypes: ['sea', 'surf', 'feeder', 'fly'], maxWeightBonus: 0.18 },
  { id: 'fluorocarbon_line', name: '氟碳钓线', emoji: '💎', slot: 'line', basePrice: 500, rodTypes: ['hand', 'lure', 'fly'], maxWeightBonus: 0.25 },
  { id: 'fake_lure', name: '仿生假饵', emoji: '🪱', slot: 'lure', basePrice: 120, rodTypes: ['lure', 'feeder'], rareWeightBonus: 2 },
  { id: 'floating_lure', name: '浮水假饵', emoji: '🦐', slot: 'lure', basePrice: 180, rodTypes: ['lure'], successRateBonus: 0.04 },
  { id: 'deep_diver', name: '深潜假饵', emoji: '🐙', slot: 'lure', basePrice: 320, rodTypes: ['lure', 'fly', 'surf'], rareWeightBonus: 3 },
  { id: 'soft_bait', name: '软饵', emoji: '🦑', slot: 'lure', basePrice: 450, rodTypes: ['feeder', 'surf', 'fly'], successRateBonus: 0.06, rareWeightBonus: 1 },
  { id: 'sharp_hook', name: '锋利鱼钩', emoji: '🪝', slot: 'hook', basePrice: 90, rodTypes: ['hand', 'sea', 'feeder', 'surf'], successRateBonus: 0.03 },
  { id: 'barbless_hook', name: '无倒刺鱼钩', emoji: '🪝', slot: 'hook', basePrice: 240, rodTypes: ['lure', 'fly', 'feeder'], rareWeightBonus: 1, successRateBonus: 0.02 },
  { id: 'circle_hook', name: '圆口鱼钩', emoji: '🌀', slot: 'hook', basePrice: 380, rodTypes: ['sea', 'surf', 'feeder'], maxWeightBonus: 0.12 },
  { id: 'small_bobber', name: '小号浮漂', emoji: '⚪', slot: 'bobber', basePrice: 60, rodTypes: ['hand', 'sea', 'feeder'], successRateBonus: 0.02 },
  { id: 'sensitive_bobber', name: '灵敏浮漂', emoji: '🔴', slot: 'bobber', basePrice: 180, rodTypes: ['hand', 'lure', 'feeder', 'fly'], successRateBonus: 0.05 },
  { id: 'glow_bobber', name: '夜光浮漂', emoji: '💡', slot: 'bobber', basePrice: 320, rodTypes: ['hand', 'sea', 'feeder', 'surf'], rareWeightBonus: 1 },
  { id: 'split_shot', name: '咬铅', emoji: '⚫', slot: 'sinker', basePrice: 70, rodTypes: ['hand', 'sea', 'feeder', 'surf'], maxWeightBonus: 0.05 },
  { id: 'sliding_sinker', name: '滑铅', emoji: '🔩', slot: 'sinker', basePrice: 200, rodTypes: ['sea', 'surf', 'feeder', 'lure'], successRateBonus: 0.04 },
  { id: 'heavy_sinker', name: '重铅坠', emoji: '⛓️', slot: 'sinker', basePrice: 420, rodTypes: ['sea', 'surf', 'feeder'], maxWeightBonus: 0.14 }
]

export const RARITY_SCORE = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
export const RARITY_VALUE_FACTOR = { common: 1.0, uncommon: 1.5, rare: 2.5, epic: 5.0, legendary: 10.0 }
export const RARITY_CATCH_WEIGHT = { common: 100, uncommon: 40, rare: 15, epic: 5, legendary: 1 }
export const JUNK_ITEMS = ['塑料瓶', '易拉罐', '破拖鞋', '烂树枝', '水草']

export const FISHING_EVENTS = [
  { id: 'wait_stargazing', stage: 'waiting', text: '你正在数星星，差点忘了自己在钓鱼……' },
  { id: 'wait_daydreaming', stage: 'waiting', text: '你正在发呆，浮标轻轻晃了一下。' },
  { id: 'wait_rod_shake', stage: 'waiting', text: '你正在晃动鱼竿，水波一圈圈荡开。' },
  { id: 'wait_dragonfly', stage: 'waiting', text: '一只蜻蜓落在鱼竿上，你屏住了呼吸。' },
  { id: 'wait_bubbles', stage: 'waiting', text: '水面冒出一串泡泡，好像有鱼在附近。' },
  { id: 'wait_bobber_twitch', stage: 'waiting', text: '浮标轻轻动了一下，是你的错觉吗？' },
  { id: 'reel_reeling', stage: 'reeling', text: '你正在收杆，鱼线在水面划出一道弧线。' },
  { id: 'reel_fighting', stage: 'reeling', text: '鱼在疯狂挣扎，你赶紧握紧鱼竿！' },
  { id: 'reel_deep_run', stage: 'reeling', text: '鱼突然向深水冲去，鱼线绷得紧紧的！' },
  { id: 'reel_jump', stage: 'reeling', text: '鱼跃出水面，溅起一片水花！' },
  { id: 'reel_tension', stage: 'reeling', text: '鱼线发出嗡嗡声，感觉随时会断！' },
  { id: 'reel_side_swim', stage: 'reeling', text: '鱼开始向左边猛冲，你不得不跟着移动。' },
  { id: 'result_nothing', stage: 'result', kind: 'nothing', text: '什么也没钓到……' },
  { id: 'result_escape', stage: 'result', kind: 'escape', text: '有鱼咬钩了，但挣脱了！' },
  { id: 'result_junk_bottle', stage: 'result', kind: 'junk', text: '钓到了垃圾（塑料瓶），扔掉了。' },
  { id: 'result_junk_can', stage: 'result', kind: 'junk', text: '钓到了垃圾（易拉罐），扔掉了。' },
  { id: 'result_junk_shoe', stage: 'result', kind: 'junk', text: '钓到了垃圾（破拖鞋），扔掉了。' },
  { id: 'result_junk_branch', stage: 'result', kind: 'junk', text: '钓到了垃圾（烂树枝），扔掉了。' },
  { id: 'result_seaweed', stage: 'result', kind: 'junk', text: '钓到了水草，缠得乱七八糟。' }
]

export const FISHING_WAIT_MIN_MS = 0
export const FISHING_WAIT_MAX_MS = 60_000
export const FISHING_REEL_MIN_MS = 0
export const FISHING_REEL_MAX_MS = 60_000
export const FISHING_EVENT_TICK_CHANCE = 0.15

const SPECIES_BY_ID = new Map(SPECIES.map((species) => [species.id, species]))
const RODS_BY_ID = new Map(RODS.map((rod) => [rod.id, rod]))
const BASKETS_BY_ID = new Map(BASKETS.map((basket) => [basket.id, basket]))
const ACCESSORIES_BY_ID = new Map(ACCESSORIES.map((accessory) => [accessory.id, accessory]))
const ACCESSORY_SLOTS_BY_ID = new Map(ACCESSORY_SLOTS.map((slot) => [slot.id, slot]))
const OLD_ROD_MIGRATION = { bamboo: 'hand', carbon: 'sea', long_cast: 'lure', golden: 'lure' }
const MAPS_BY_ID = new Map(MAPS.map((map) => [map.id, map]))
const LEVEL_EXP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000, 13000, 15200, 17600, 20000]
const CATCH_EXP = { common: 10, uncommon: 15, rare: 25, epic: 40, legendary: 60 }

export const TICKET_DAY_MS = 24 * 60 * 60 * 1000
export const MAX_LEVEL = LEVEL_EXP.length

export function levelFromExperience(experience) {
  const exp = Math.max(0, Math.floor(experience || 0))
  let level = 1
  while (level < LEVEL_EXP.length && exp >= LEVEL_EXP[level]) {
    level += 1
  }
  return level
}

export function expForLevel(level) {
  const safe = Math.min(Math.max(1, Math.floor(level || 1)), LEVEL_EXP.length)
  return LEVEL_EXP[safe - 1]
}

export function experienceForSpecies(species) {
  return CATCH_EXP[species?.rarity] ?? 10
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function tokenAmountFromUsage(usage) {
  if (usage === null || typeof usage !== 'object') return 0
  const input = usage.inputTokens ?? usage.input ?? 0
  const output = usage.outputTokens ?? usage.output ?? 0
  const cacheRead = usage.cacheReadTokens ?? usage.cacheRead ?? 0
  const cacheWrite = usage.cacheWriteTokens ?? usage.cacheWrite ?? 0
  return Math.max(0, Math.round(input + output + cacheRead + cacheWrite))
}

export function createInitialState() {
  return {
    version: GAME_VERSION,
    coins: 50,
    experience: 0,
    currentMapId: 'beginner',
    mapTickets: {},
    totalTokensConsumed: 0,
    pendingBaitTokens: 0,
    bait: 0,
    equippedRodId: 'hand',
    ownedRods: { hand: { rodId: 'hand', level: 1 } },
    equippedBasketId: 'small',
    ownedBaskets: { small: { basketId: 'small' } },
    items: [],
    equippedAccessories: Object.fromEntries(ACCESSORY_SLOTS.map((slot) => [slot.id, null])),
    inventory: [],
    collection: [],
    stats: {
      totalCatches: 0,
      totalSales: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      totalBaitTokensUsed: 0,
      rareCatches: 0
    },
    inventoryCapacity: 5,
    lastEventText: '欢迎来到钓鱼小游戏！每 1M token 会增加 1 个鱼饵，消耗鱼饵自动抛竿。',
    fishing: {
      status: 'idle',
      stage: null,
      startedAt: 0,
      endsAt: 0,
      durationMs: 0,
      lastEventAt: 0,
      eventText: ''
    }
  }
}

export function computeRodEffects(rod, level, accessories = []) {
  let successRate = rod.baseSuccessRate + (level - 1) * rod.successRatePerLevel
  let maxWeightMultiplier = 1 + (level - 1) * rod.maxWeightPerLevel
  let rareWeightBonus = 0
  for (const accessory of accessories) {
    successRate += accessory.successRateBonus ?? 0
    maxWeightMultiplier += accessory.maxWeightBonus ?? 0
    rareWeightBonus += accessory.rareWeightBonus ?? 0
  }
  return {
    rarityMultiplier: rod.rarityMultiplier + (level - 1) * 0.15,
    weightMultiplier: rod.weightMultiplier + (level - 1) * 0.05,
    successRate: clamp(successRate, 0, 0.95),
    maxWeightMultiplier,
    rareWeightBonus
  }
}

export function upgradeRodCost(rod, level) {
  return Math.round(rod.upgradeBasePrice * Math.pow(1.8, level - 1))
}

export function salePrice(species, fish) {
  const weightSpan = species.maxWeightGrams - species.minWeightGrams || 1
  const lengthSpan = species.maxLengthCm - species.minLengthCm || 1
  const weightFactor = 0.6 + 0.8 * (fish.weightGrams - species.minWeightGrams) / weightSpan
  const lengthFactor = 0.7 + 0.6 * (fish.lengthCm - species.minLengthCm) / lengthSpan
  const rarityFactor = RARITY_VALUE_FACTOR[species.rarity] ?? 1
  return Math.round(species.baseValue * weightFactor * lengthFactor * rarityFactor)
}

function ratingFor(species, fish, effects) {
  const weightSpan = species.maxWeightGrams - species.minWeightGrams || 1
  const lengthSpan = species.maxLengthCm - species.minLengthCm || 1
  const weightScore = (fish.weightGrams - species.minWeightGrams) / weightSpan
  const lengthScore = (fish.lengthCm - species.minLengthCm) / lengthSpan
  const rarityScore = RARITY_SCORE[species.rarity] ?? 0
  return clamp(
    Math.round(
      50 +
        weightScore * 20 +
        lengthScore * 15 +
        rarityScore * 10 +
        effects.weightMultiplier * 5
    ),
    0,
    100
  )
}

function collectionEntry(state, speciesId) {
  let entry = state.collection.find((item) => item.speciesId === speciesId)
  if (entry === undefined) {
    entry = { speciesId, catches: 0, maxWeightGrams: 0, maxLengthCm: 0 }
    state.collection.push(entry)
  }
  return entry
}

function normalizeState(state) {
  const base = createInitialState()
  for (const key of Object.keys(base)) {
    if (state[key] === undefined) state[key] = base[key]
  }

  // Normalize level and map state.
  if (!Number.isFinite(state.experience)) state.experience = 0
  if (state.mapTickets === null || typeof state.mapTickets !== 'object') state.mapTickets = {}
  for (const map of MAPS) {
    if (!Number.isFinite(state.mapTickets[map.id])) state.mapTickets[map.id] = 0
  }
  if (!MAPS_BY_ID.has(state.currentMapId)) state.currentMapId = 'beginner'
  if (state.currentMapId !== 'beginner' && !(state.mapTickets[state.currentMapId] > 0)) {
    state.currentMapId = 'beginner'
  }

  // Normalize the active fishing session. It may be absent in old saves.
  if (state.fishing === null || typeof state.fishing !== 'object') {
    state.fishing = { ...base.fishing }
  } else {
    for (const key of Object.keys(base.fishing)) {
      if (state.fishing[key] === undefined) state.fishing[key] = base.fishing[key]
    }
  }

  // Migrate old rod ids to the new hand/sea/lure rod set.
  if (state.ownedRods !== null && typeof state.ownedRods === 'object') {
    for (const [oldId, oldRod] of Object.entries(state.ownedRods)) {
      const newId = OLD_ROD_MIGRATION[oldId]
      if (newId === undefined || !RODS_BY_ID.has(newId)) continue
      const level = oldRod?.level ?? 1
      const existing = state.ownedRods[newId]
      if (existing === undefined || level > existing.level) {
        state.ownedRods[newId] = { rodId: newId, level }
      }
    }
    for (const id of Object.keys(state.ownedRods)) {
      if (!RODS_BY_ID.has(id)) delete state.ownedRods[id]
    }
  }
  if (typeof state.equippedRodId === 'string' && OLD_ROD_MIGRATION[state.equippedRodId] !== undefined) {
    state.equippedRodId = OLD_ROD_MIGRATION[state.equippedRodId]
  }
  if (!RODS_BY_ID.has(state.equippedRodId)) state.equippedRodId = RODS[0].id
  if (state.ownedRods[state.equippedRodId] === undefined) {
    state.ownedRods[state.equippedRodId] = { rodId: state.equippedRodId, level: 1 }
  }

  // Normalize baskets and derive inventory capacity from the equipped basket.
  if (state.ownedBaskets === null || typeof state.ownedBaskets !== 'object') state.ownedBaskets = {}
  if (state.ownedBaskets.small === undefined) {
    state.ownedBaskets.small = { basketId: 'small' }
  }
  if (!BASKETS_BY_ID.has(state.equippedBasketId)) state.equippedBasketId = 'small'
  if (state.ownedBaskets[state.equippedBasketId] === undefined) {
    state.ownedBaskets[state.equippedBasketId] = { basketId: state.equippedBasketId }
  }
  state.inventoryCapacity = BASKETS_BY_ID.get(state.equippedBasketId).capacity

  if (!Array.isArray(state.items)) state.items = []
  if (!Array.isArray(state.collection)) state.collection = []
  if (state.equippedAccessories === null || typeof state.equippedAccessories !== 'object') {
    state.equippedAccessories = Object.fromEntries(ACCESSORY_SLOTS.map((slot) => [slot.id, null]))
  }
  for (const slot of ACCESSORY_SLOTS) {
    if (state.equippedAccessories[slot.id] === undefined) state.equippedAccessories[slot.id] = null
  }

  // Remove the aquarium feature; move any old aquarium fish back to the basket.
  if (Array.isArray(state.aquariums)) {
    for (const aquarium of state.aquariums) {
      if (aquarium === null || typeof aquarium !== 'object' || !Array.isArray(aquarium.fish)) continue
      for (const fish of aquarium.fish) {
        if (fish === null || typeof fish !== 'object') continue
        fish.location = 'inventory'
        state.inventory.push(fish)
      }
    }
  }
  delete state.aquariums

  if (state.stats === null || typeof state.stats !== 'object') state.stats = { ...base.stats }
  for (const key of Object.keys(base.stats)) {
    if (state.stats[key] === undefined) state.stats[key] = base.stats[key]
  }
  if (!Number.isFinite(state.totalTokensConsumed)) state.totalTokensConsumed = 0
  if (!Number.isFinite(state.pendingBaitTokens)) state.pendingBaitTokens = 0
  if (!Number.isFinite(state.bait)) state.bait = 0
  if (state.pendingBaitTokens >= BAIT_TOKENS_PER_BAIT) {
    state.bait += Math.floor(state.pendingBaitTokens / BAIT_TOKENS_PER_BAIT)
    state.pendingBaitTokens %= BAIT_TOKENS_PER_BAIT
  }
  return state
}

export class FishingGame {
  constructor(state = createInitialState(), rng = Math.random) {
    this.state = normalizeState(state)
    this.rng = rng
  }

  static fromState(state) {
    return new FishingGame(state)
  }

  getState() {
    return this.state
  }

  equippedRod() {
    const rod = RODS_BY_ID.get(this.state.equippedRodId) ?? RODS[0]
    const level = this.state.ownedRods[rod.id]?.level ?? 1
    const accessories = Object.values(this.state.equippedAccessories ?? {})
      .map((itemId) => ACCESSORIES_BY_ID.get(itemId))
      .filter((accessory) => accessory !== undefined && accessory.rodTypes.includes(rod.id))
    return { rod, level, effects: computeRodEffects(rod, level, accessories), accessories }
  }

  equippedBasket() {
    const basket = BASKETS_BY_ID.get(this.state.equippedBasketId) ?? BASKETS[0]
    return basket
  }

  currentMapCandidates() {
    const rodId = this.state.equippedRodId
    return SPECIES.filter((species) => species.requiredRodId === rodId && (species.maps ?? []).includes(this.state.currentMapId))
  }

  handleTokensConsumed(amount, source = 'msg', ts = Date.now()) {
    const rounded = Math.max(0, Math.round(amount))
    this.state.totalTokensConsumed += rounded
    const pending = this.state.pendingBaitTokens + rounded
    this.state.bait += Math.floor(pending / BAIT_TOKENS_PER_BAIT)
    this.state.pendingBaitTokens = pending % BAIT_TOKENS_PER_BAIT
    return []
  }

  ensureCurrentMap(now = Date.now(), effects = []) {
    const currentMapId = this.state.currentMapId
    if (currentMapId === 'beginner') return effects
    const expiresAt = this.state.mapTickets?.[currentMapId] ?? 0
    if (expiresAt > now) return effects
    const wasFishing = this.state.fishing?.status === 'fishing'
    this.state.mapTickets[currentMapId] = 0
    this.state.currentMapId = 'beginner'
    if (wasFishing) {
      this.state.fishing.status = 'idle'
      this.state.fishing.stage = null
      this.state.fishing.startedAt = 0
      this.state.fishing.endsAt = 0
      this.state.fishing.durationMs = 0
      this.state.fishing.lastEventAt = 0
      this.state.fishing.eventText = ''
    }
    this.state.lastEventText = '门票已到期，已回到新手城市湖泊。'
    effects.push({ type: 'EventLine', text: this.state.lastEventText })
    return effects
  }

  cancelFishing({ refundBait = false } = {}) {
    if (this.state.fishing?.status !== 'fishing') return false
    const refund = refundBait === true
    this.state.fishing.status = 'idle'
    this.state.fishing.stage = null
    this.state.fishing.startedAt = 0
    this.state.fishing.endsAt = 0
    this.state.fishing.durationMs = 0
    this.state.fishing.lastEventAt = 0
    this.state.fishing.eventText = ''
    if (refund) this.state.bait += 1
    return true
  }

  tick(now = Date.now()) {
    const effects = []
    this.ensureCurrentMap(now, effects)

    // During an active cast, each tick may emit a random stage event. When the
    // current stage has elapsed, also progress through zero-duration transitions
    // immediately (e.g. 0s wait/reel).
    if (this.state.fishing.status === 'fishing' && now < this.state.fishing.endsAt) {
      this.advanceFishing(now, effects)
    }
    let advanceGuard = 0
    while (this.state.fishing.status === 'fishing' && now >= this.state.fishing.endsAt && advanceGuard < 3) {
      this.advanceFishing(now, effects)
      advanceGuard += 1
    }

    let guard = 0
    while (this.state.bait >= 1 && this.state.fishing.status === 'idle' && guard < 100) {
      if (this.state.inventory.length >= this.state.inventoryCapacity) {
        this.state.lastEventText = '鱼篓已满，停止钓鱼。'
        effects.push({ type: 'EventLine', text: this.state.lastEventText })
        break
      }
      if (this.currentMapCandidates().length === 0) {
        this.state.lastEventText = '当前鱼竿在这张地图钓不到鱼，请更换鱼竿或地图。'
        effects.push({ type: 'EventLine', text: this.state.lastEventText })
        break
      }
      this.state.bait -= 1
      effects.push(...this.cast(now))
      guard += 1

      // If both stages rolled 0s, finish immediately so remaining bait can proceed.
      let resolveGuard = 0
      while (this.state.fishing.status === 'fishing' && now >= this.state.fishing.endsAt && resolveGuard < 3) {
        this.advanceFishing(now, effects)
        resolveGuard += 1
      }
    }
    return effects
  }

  randomDuration(minMs, maxMs) {
    if (maxMs <= minMs) return minMs
    return Math.min(maxMs, minMs + Math.floor(this.rng() * (maxMs - minMs + 1)))
  }

  randomEvent(stage) {
    const pool = FISHING_EVENTS.filter((event) => event.stage === stage)
    if (pool.length === 0) return null
    return pool[Math.floor(this.rng() * pool.length)]
  }

  cast(now = Date.now()) {
    if (this.state.inventory.length >= this.state.inventoryCapacity) {
      this.state.lastEventText = '鱼篓已满，停止钓鱼。'
      return [{ type: 'EventLine', text: this.state.lastEventText }]
    }
    const { rod } = this.equippedRod()
    this.state.stats.totalBaitTokensUsed += BAIT_TOKENS_PER_BAIT

    const candidates = SPECIES.filter((species) => species.requiredRodId === rod.id && (species.maps ?? []).includes(this.state.currentMapId))
    if (candidates.length === 0) {
      this.state.bait += 1
      this.state.lastEventText = '当前鱼竿在这张地图钓不到鱼，请更换鱼竿或地图。'
      return [{ type: 'EventLine', text: this.state.lastEventText }]
    }

    const waitMs = this.randomDuration(FISHING_WAIT_MIN_MS, FISHING_WAIT_MAX_MS)
    const waitEvent = this.randomEvent('waiting')
    const fishing = this.state.fishing
    fishing.status = 'fishing'
    fishing.stage = 'waiting'
    fishing.startedAt = now
    fishing.endsAt = now + waitMs
    fishing.durationMs = waitMs
    fishing.lastEventAt = now
    fishing.eventText = waitEvent ? waitEvent.text : '正在等待鱼汛……'
    this.state.lastEventText = fishing.eventText
    return [{ type: 'EventLine', text: fishing.eventText }]
  }

  advanceFishing(now, effects) {
    const fishing = this.state.fishing
    if (fishing.status !== 'fishing') return

    if (now < fishing.endsAt) {
      if (this.rng() < FISHING_EVENT_TICK_CHANCE) {
        const event = this.randomEvent(fishing.stage)
        if (event !== null) {
          fishing.eventText = event.text
          fishing.lastEventAt = now
          this.state.lastEventText = event.text
          effects.push({ type: 'EventLine', text: event.text })
        }
      }
      return
    }

    if (fishing.stage === 'waiting') {
      const reelMs = this.randomDuration(FISHING_REEL_MIN_MS, FISHING_REEL_MAX_MS)
      const reelEvent = this.randomEvent('reeling')
      fishing.stage = 'reeling'
      fishing.startedAt = now
      fishing.endsAt = now + reelMs
      fishing.durationMs = reelMs
      fishing.lastEventAt = now
      fishing.eventText = reelEvent ? reelEvent.text : '有鱼咬钩了，开始收杆！'
      this.state.lastEventText = fishing.eventText
      effects.push({ type: 'EventLine', text: fishing.eventText })
      return
    }

    if (fishing.stage === 'reeling') {
      effects.push(...this.resolveCast(now))
    }
  }

  resolveCast(now = Date.now()) {
    const { rod, effects } = this.equippedRod()
    this.state.fishing.status = 'idle'
    this.state.fishing.stage = null
    this.state.fishing.startedAt = 0
    this.state.fishing.endsAt = 0
    this.state.fishing.durationMs = 0
    this.state.fishing.lastEventAt = 0
    this.state.fishing.eventText = ''

    const candidates = SPECIES.filter((species) => species.requiredRodId === rod.id && (species.maps ?? []).includes(this.state.currentMapId))
    if (candidates.length === 0) {
      this.state.lastEventText = '当前鱼竿还钓不到任何鱼。'
      return [{ type: 'EventLine', text: this.state.lastEventText }]
    }

    const successRate = effects.successRate
    const failureRate = 1 - successRate
    const outcomeRoll = this.rng()
    const nothingRate = failureRate * 0.45
    const escapeRate = failureRate * 0.30
    const junkRate = failureRate * 0.25

    let resultKind = null
    if (outcomeRoll < nothingRate) resultKind = 'nothing'
    else if (outcomeRoll < nothingRate + escapeRate) resultKind = 'escape'
    else if (outcomeRoll < nothingRate + escapeRate + junkRate) resultKind = 'junk'

    if (resultKind !== null) {
      const pool = FISHING_EVENTS.filter((event) => event.stage === 'result' && event.kind === resultKind)
      const event = pool.length > 0 ? pool[Math.floor(this.rng() * pool.length)] : null
      const fallback = resultKind === 'nothing' ? '什么也没钓到……' : resultKind === 'escape' ? '有鱼咬钩了，但挣脱了！' : '钓到了垃圾，扔掉了。'
      const text = event ? event.text : fallback
      this.state.lastEventText = text
      return [{ type: 'EventLine', text }]
    }

    const speciesWeight = (species) => {
      const rarityWeight = RARITY_CATCH_WEIGHT[species.rarity] ?? 1
      const rareBonus = species.rarity !== 'common' ? (1 + (effects.rareWeightBonus ?? 0)) : 1
      return rarityWeight * effects.rarityMultiplier * rareBonus
    }
    const totalWeight = candidates.reduce((sum, species) => sum + speciesWeight(species), 0)
    let speciesRoll = this.rng() * totalWeight
    let species = candidates[candidates.length - 1]
    for (const candidate of candidates) {
      speciesRoll -= speciesWeight(candidate)
      if (speciesRoll <= 0) {
        species = candidate
        break
      }
    }

    const lengthSpan = species.maxLengthCm - species.minLengthCm
    const maxWeightGrams = Math.round(species.maxWeightGrams * effects.maxWeightMultiplier)
    const weightGrams = clamp(
      Math.round(species.minWeightGrams + (maxWeightGrams - species.minWeightGrams) * this.rng() * effects.weightMultiplier),
      species.minWeightGrams,
      maxWeightGrams
    )
    const lengthCm = clamp(
      Math.round(species.minLengthCm + lengthSpan * this.rng() * (0.75 + effects.weightMultiplier * 0.25)),
      species.minLengthCm,
      species.maxLengthCm
    )

    const fish = {
      id: `${species.id}-${now}-${randomUUID().slice(0, 8)}`,
      speciesId: species.id,
      weightGrams,
      lengthCm,
      rating: ratingFor(species, { weightGrams, lengthCm }, effects),
      caughtAt: now,
      sold: false,
      location: 'inventory'
    }

    this.state.stats.totalCatches += 1
    if (species.rarity === 'rare' || species.rarity === 'epic' || species.rarity === 'legendary') {
      this.state.stats.rareCatches += 1
    }

    const expGain = experienceForSpecies(species)
    const oldLevel = levelFromExperience(this.state.experience)
    this.state.experience += expGain
    const newLevel = levelFromExperience(this.state.experience)

    const entry = collectionEntry(this.state, species.id)
    entry.catches += 1
    entry.maxWeightGrams = Math.max(entry.maxWeightGrams, fish.weightGrams)
    entry.maxLengthCm = Math.max(entry.maxLengthCm, fish.lengthCm)

    const kg = (fish.weightGrams / 1000).toFixed(1)
    const text = `钓到了 [${species.name}] ${kg}kg / ${fish.lengthCm}cm / 评分 ${fish.rating}`
    this.state.lastEventText = text

    const resultEffects = [{ type: 'FishCaught', fish }]
    if (newLevel > oldLevel) {
      const unlocked = MAPS.filter((map) => map.requiredLevel > oldLevel && map.requiredLevel <= newLevel)
      const unlockedText = unlocked.length > 0 ? `，解锁了${unlocked.map((map) => map.name).join('、')}` : ''
      const levelText = `🎉 升级到 Lv.${newLevel}！${unlockedText}`
      this.state.lastEventText = levelText
      resultEffects.push({ type: 'EventLine', text: levelText })
    }

    if (this.state.inventory.length >= this.state.inventoryCapacity) {
      resultEffects.push({ type: 'EventLine', text: `${text}，但鱼篓已满，鱼逃走了。` })
      return resultEffects
    }

    this.state.inventory.push(fish)
    resultEffects.push({ type: 'EventLine', text })
    return resultEffects
  }

  dispatch(command, now = Date.now()) {
    if (command === null || typeof command !== 'object' || typeof command.type !== 'string') {
      throw new Error('无效命令')
    }

    switch (command.type) {
      case 'SellFish': {
        const fish = this.findInventoryFish(command.fishId)
        if (fish === undefined) throw new Error('鱼不在鱼篓中')
        const species = SPECIES_BY_ID.get(fish.speciesId)
        if (species === undefined) throw new Error('未知鱼种')
        const coins = salePrice(species, fish)
        this.removeInventoryFish(fish.id)
        this.state.coins += coins
        this.state.stats.totalSales += 1
        this.state.stats.totalCoinsEarned += coins
        this.state.lastEventText = `出售了 ${species.name}，获得 ${coins} 金币。`
        return [{ type: 'FishSold', fishId: fish.id, coins }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'SellAllFish': {
        if (this.state.inventory.length === 0) throw new Error('鱼篓是空的')
        const fishes = [...this.state.inventory]
        let coins = 0
        for (const fish of fishes) {
          const species = SPECIES_BY_ID.get(fish.speciesId)
          if (species === undefined) continue
          coins += salePrice(species, fish)
          this.removeInventoryFish(fish.id)
        }
        this.state.coins += coins
        this.state.stats.totalSales += fishes.length
        this.state.stats.totalCoinsEarned += coins
        this.state.lastEventText = `出售了 ${fishes.length} 条鱼，获得 ${coins} 金币。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'BuyRod': {
        const rod = RODS_BY_ID.get(command.rodId)
        if (rod === undefined) throw new Error('未知鱼竿')
        if (this.state.ownedRods[rod.id] !== undefined) throw new Error('已经拥有这支鱼竿')
        if (this.state.coins < rod.basePrice) throw new Error('金币不足')
        this.state.coins -= rod.basePrice
        this.state.stats.totalCoinsSpent += rod.basePrice
        this.state.ownedRods[rod.id] = { rodId: rod.id, level: 1 }
        this.state.lastEventText = `购买了 ${rod.name}。`
        return [{ type: 'Purchase', kind: 'rod', id: rod.id, cost: rod.basePrice }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'UpgradeRod': {
        const rod = RODS_BY_ID.get(command.rodId)
        if (rod === undefined) throw new Error('未知鱼竿')
        const owned = this.state.ownedRods[rod.id]
        if (owned === undefined) throw new Error('尚未拥有这支鱼竿')
        if (owned.level >= rod.maxLevel) throw new Error('鱼竿已经满级')
        const cost = upgradeRodCost(rod, owned.level)
        if (this.state.coins < cost) throw new Error('金币不足')
        this.state.coins -= cost
        this.state.stats.totalCoinsSpent += cost
        owned.level += 1
        this.state.lastEventText = `${rod.name} 升级到了 Lv.${owned.level}。`
        return [{ type: 'Purchase', kind: 'rod', id: rod.id, cost }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'EquipRod': {
        const rod = RODS_BY_ID.get(command.rodId)
        if (rod === undefined) throw new Error('未知鱼竿')
        if (this.state.ownedRods[rod.id] === undefined) throw new Error('尚未拥有这支鱼竿')
        this.state.equippedRodId = rod.id
        for (const slot of ACCESSORY_SLOTS) {
          const itemId = this.state.equippedAccessories[slot.id]
          if (itemId === null || itemId === undefined) continue
          const accessory = ACCESSORIES_BY_ID.get(itemId)
          if (accessory !== undefined && !accessory.rodTypes.includes(rod.id)) {
            this.state.equippedAccessories[slot.id] = null
            for (const entry of this.state.items) {
              if (entry.itemId === itemId) entry.equipped = false
            }
          }
        }
        this.state.lastEventText = `装备了 ${rod.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'BuyBasket': {
        const basket = BASKETS_BY_ID.get(command.basketId)
        if (basket === undefined) throw new Error('未知鱼篓')
        if (this.state.ownedBaskets[basket.id] !== undefined) throw new Error('已经拥有这个鱼篓')
        if (this.state.coins < basket.basePrice) throw new Error('金币不足')
        this.state.coins -= basket.basePrice
        this.state.stats.totalCoinsSpent += basket.basePrice
        this.state.ownedBaskets[basket.id] = { basketId: basket.id }
        this.state.lastEventText = `购买了 ${basket.name}。`
        return [{ type: 'Purchase', kind: 'basket', id: basket.id, cost: basket.basePrice }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'EquipBasket': {
        const basket = BASKETS_BY_ID.get(command.basketId)
        if (basket === undefined) throw new Error('未知鱼篓')
        if (this.state.ownedBaskets[basket.id] === undefined) throw new Error('尚未拥有这个鱼篓')
        if (this.state.inventory.length > basket.capacity) throw new Error(`鱼篓里的鱼太多，无法换上 ${basket.name}。`)
        this.state.equippedBasketId = basket.id
        this.state.inventoryCapacity = basket.capacity
        this.state.lastEventText = `装备了 ${basket.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'BuyAccessory': {
        const accessory = ACCESSORIES_BY_ID.get(command.accessoryId)
        if (accessory === undefined) throw new Error('未知配件')
        if (this.state.items.some((item) => item.itemId === accessory.id)) throw new Error('已经拥有这个配件')
        if (this.state.coins < accessory.basePrice) throw new Error('金币不足')
        this.state.coins -= accessory.basePrice
        this.state.stats.totalCoinsSpent += accessory.basePrice
        this.state.items.push({ id: randomUUID().slice(0, 8), itemId: accessory.id, equipped: false })
        this.state.lastEventText = `购买了 ${accessory.name}。`
        return [{ type: 'Purchase', kind: 'accessory', id: accessory.id, cost: accessory.basePrice }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'EquipAccessory': {
        const accessory = ACCESSORIES_BY_ID.get(command.accessoryId)
        if (accessory === undefined) throw new Error('未知配件')
        const item = this.state.items.find((entry) => entry.itemId === accessory.id)
        if (item === undefined) throw new Error('尚未拥有这个配件')
        if (!accessory.rodTypes.includes(this.state.equippedRodId)) throw new Error('当前鱼竿无法装备这个配件')
        const slot = accessory.slot
        const previousId = this.state.equippedAccessories[slot]
        this.state.equippedAccessories[slot] = accessory.id
        for (const entry of this.state.items) {
          if (entry.itemId === accessory.id) entry.equipped = true
          else if (previousId !== null && entry.itemId === previousId) entry.equipped = false
        }
        this.state.lastEventText = `装备了 ${accessory.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'UnequipAccessory': {
        if (!ACCESSORY_SLOTS_BY_ID.has(command.slot)) throw new Error('未知配件槽位')
        const itemId = this.state.equippedAccessories[command.slot]
        if (itemId === null || itemId === undefined) throw new Error('该槽位没有装备配件')
        this.state.equippedAccessories[command.slot] = null
        for (const entry of this.state.items) {
          if (entry.itemId === itemId) entry.equipped = false
        }
        this.state.lastEventText = `卸下了 ${ACCESSORIES_BY_ID.get(itemId)?.name ?? '配件'}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'BuyTicket': {
        const map = MAPS_BY_ID.get(command.mapId)
        if (map === undefined) throw new Error('未知地图')
        if (map.id === 'beginner') throw new Error('新手地图无需购买门票')
        const days = Math.floor(Number(command.days))
        if (!Number.isFinite(days) || days <= 0) throw new Error('天数必须大于 0')
        if (levelFromExperience(this.state.experience) < map.requiredLevel) {
          throw new Error(`需要 Lv.${map.requiredLevel} 才能进入${map.name}`)
        }
        const cost = map.entryFee * days
        if (this.state.coins < cost) throw new Error('金币不足')
        const canceled = this.cancelFishing({ refundBait: true })
        const oldExpiry = this.state.mapTickets[map.id] ?? 0
        const base = Math.max(now, oldExpiry)
        const expiresAt = base + days * TICKET_DAY_MS
        this.state.coins -= cost
        this.state.stats.totalCoinsSpent += cost
        this.state.mapTickets[map.id] = expiresAt
        this.state.currentMapId = map.id
        const cancelText = canceled ? '已取消当前钓鱼并退还 1 个鱼饵。' : ''
        this.state.lastEventText = `${cancelText}购买了 ${map.name} ${days} 天门票，已进入${map.name}。`
        const effects = [
          { type: 'Purchase', kind: 'ticket', id: map.id, cost, days },
          { type: 'EventLine', text: this.state.lastEventText }
        ]
        return effects
      }

      case 'ChangeMap': {
        const map = MAPS_BY_ID.get(command.mapId)
        if (map === undefined) throw new Error('未知地图')
        if (levelFromExperience(this.state.experience) < map.requiredLevel) {
          throw new Error(`需要 Lv.${map.requiredLevel} 才能进入${map.name}`)
        }
        if (map.id !== 'beginner') {
          const expiresAt = this.state.mapTickets[map.id] ?? 0
          if (expiresAt <= now) throw new Error(`${map.name} 没有有效门票，请先购买`)
        }
        const canceled = this.cancelFishing({ refundBait: true })
        this.state.currentMapId = map.id
        const cancelText = canceled ? '已取消当前钓鱼并退还 1 个鱼饵。' : ''
        this.state.lastEventText = `${cancelText}已前往 ${map.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      default:
        throw new Error(`未知命令：${command.type}`)
    }
  }

  findInventoryFish(fishId) {
    return this.state.inventory.find((fish) => fish.id === fishId)
  }

  removeInventoryFish(fishId) {
    this.state.inventory = this.state.inventory.filter((fish) => fish.id !== fishId)
  }

  snapshot(now = Date.now()) {
    const state = this.state
    const equipped = this.equippedRod()
    const equippedBasket = this.equippedBasket()

    const inventory = state.inventory.map((fish) => this.fishView(fish))

    const rods = RODS.map((rod) => {
      const owned = state.ownedRods[rod.id]
      return {
        id: rod.id,
        name: rod.name,
        emoji: rod.emoji,
        basePrice: rod.basePrice,
        maxLevel: rod.maxLevel,
        owned: owned !== undefined,
        equipped: state.equippedRodId === rod.id,
        level: owned?.level ?? 0,
        upgradeCost: owned !== undefined && owned.level < rod.maxLevel ? upgradeRodCost(rod, owned.level) : null
      }
    })

    const baskets = BASKETS.map((basket) => {
      const owned = state.ownedBaskets[basket.id] !== undefined
      return {
        id: basket.id,
        name: basket.name,
        emoji: basket.emoji,
        capacity: basket.capacity,
        basePrice: basket.basePrice,
        owned,
        equipped: state.equippedBasketId === basket.id
      }
    })

    const items = state.items.map((item) => {
      const accessory = ACCESSORIES_BY_ID.get(item.itemId)
      if (accessory === undefined) return null
      return {
        id: item.id,
        itemId: accessory.id,
        name: accessory.name,
        emoji: accessory.emoji,
        slot: accessory.slot,
        slotName: ACCESSORY_SLOTS_BY_ID.get(accessory.slot)?.name ?? accessory.slot,
        basePrice: accessory.basePrice,
        rodTypes: accessory.rodTypes,
        equipped: item.equipped,
        canEquip: accessory.rodTypes.includes(state.equippedRodId)
      }
    }).filter((item) => item !== null)

    const equippedAccessories = ACCESSORY_SLOTS.map((slot) => {
      const itemId = state.equippedAccessories[slot.id]
      const accessory = itemId === null || itemId === undefined ? null : ACCESSORIES_BY_ID.get(itemId)
      return {
        slot: slot.id,
        name: slot.name,
        accessory: accessory === null || accessory === undefined ? null : { id: accessory.id, name: accessory.name, emoji: accessory.emoji }
      }
    })

    const shopItems = [
      ...RODS.map((rod) => ({
        kind: 'rod',
        category: '鱼竿',
        id: rod.id,
        name: rod.name,
        emoji: rod.emoji,
        price: rod.basePrice,
        owned: state.ownedRods[rod.id] !== undefined
      })),
      ...BASKETS.map((basket) => ({
        kind: 'basket',
        category: '鱼篓',
        id: basket.id,
        name: basket.name,
        emoji: basket.emoji,
        price: basket.basePrice,
        owned: state.ownedBaskets[basket.id] !== undefined
      })),
      ...ACCESSORIES.map((accessory) => {
        const slot = ACCESSORY_SLOTS_BY_ID.get(accessory.slot)
        return {
          kind: 'accessory',
          category: slot?.name ?? '配件',
          id: accessory.id,
          name: accessory.name,
          emoji: accessory.emoji,
          price: accessory.basePrice,
          slot: accessory.slot,
          owned: state.items.some((item) => item.itemId === accessory.id),
          canEquip: accessory.rodTypes.includes(state.equippedRodId)
        }
      })
    ]

    const level = levelFromExperience(state.experience)
    const currentMap = MAPS_BY_ID.get(state.currentMapId) ?? MAPS[0]
    const maps = MAPS.map((map) => {
      const ticketExpiresAt = state.mapTickets[map.id] ?? 0
      const remainingMs = Math.max(0, ticketExpiresAt - now)
      const locked = level < map.requiredLevel
      return {
        id: map.id,
        name: map.name,
        emoji: map.emoji,
        region: map.region,
        city: map.city,
        spot: map.spot,
        type: map.type,
        requiredLevel: map.requiredLevel,
        entryFee: map.entryFee,
        description: map.description,
        fishIntro: map.fishIntro,
        locked,
        current: state.currentMapId === map.id,
        hasTicket: remainingMs > 0,
        ticketExpiresAt,
        ticketRemainingMs: remainingMs,
        fish: SPECIES
          .filter((species) => (species.maps ?? []).includes(map.id))
          .map((species) => ({
            id: species.id,
            name: species.name,
            emoji: species.emoji,
            rarity: species.rarity,
            requiredRodId: species.requiredRodId,
            description: species.description ?? '',
            habitat: species.habitat ?? '',
            favoriteBait: species.favoriteBait ?? '',
            tips: species.tips ?? ''
          }))
      }
    })

    const shopCategories = ['鱼竿', '鱼篓', ...ACCESSORY_SLOTS.map((slot) => slot.name)]

    return {
      version: state.version,
      coins: state.coins,
      level,
      experience: state.experience,
      nextLevelExp: level < MAX_LEVEL ? expForLevel(level + 1) : null,
      currentMapId: state.currentMapId,
      currentMap: {
        id: currentMap.id,
        name: currentMap.name,
        emoji: currentMap.emoji,
        region: currentMap.region,
        city: currentMap.city,
        spot: currentMap.spot,
        type: currentMap.type,
        requiredLevel: currentMap.requiredLevel,
        entryFee: currentMap.entryFee,
        description: currentMap.description,
        fishIntro: currentMap.fishIntro
      },
      maps,
      totalTokensConsumed: state.totalTokensConsumed ?? 0,
      pendingBaitTokens: state.pendingBaitTokens ?? 0,
      bait: state.bait ?? 0,
      tokensPerBait: BAIT_TOKENS_PER_BAIT,
      equippedRod: {
        id: equipped.rod.id,
        name: equipped.rod.name,
        emoji: equipped.rod.emoji,
        level: equipped.level,
        rarityMultiplier: equipped.effects.rarityMultiplier,
        weightMultiplier: equipped.effects.weightMultiplier,
        accessorySlots: ACCESSORY_SLOTS
          .filter((slot) => ACCESSORIES.some((accessory) => accessory.slot === slot.id && accessory.rodTypes.includes(equipped.rod.id)))
          .map((slot) => ({ id: slot.id, name: slot.name }))
      },
      equippedBasket: {
        id: equippedBasket.id,
        name: equippedBasket.name,
        emoji: equippedBasket.emoji,
        capacity: equippedBasket.capacity
      },
      inventoryCapacity: state.inventoryCapacity,
      inventory,
      rods,
      baskets,
      items,
      equippedAccessories,
      shopCategories,
      shopItems,
      stats: state.stats,
      collection: state.collection,
      encyclopedia: SPECIES.map((species) => {
        const entry = (state.collection || []).find((item) => item.speciesId === species.id)
        return {
          id: species.id,
          name: species.name,
          emoji: species.emoji,
          rarity: species.rarity,
          baseValue: species.baseValue,
          minWeightGrams: species.minWeightGrams,
          maxWeightGrams: species.maxWeightGrams,
          minLengthCm: species.minLengthCm,
          maxLengthCm: species.maxLengthCm,
          requiredRodId: species.requiredRodId,
          rodName: RODS_BY_ID.get(species.requiredRodId)?.name ?? species.requiredRodId,
          maps: species.maps.map((mapId) => MAPS_BY_ID.get(mapId)?.name ?? mapId),
          description: species.description ?? '',
          habitat: species.habitat ?? '',
          favoriteBait: species.favoriteBait ?? '',
          tips: species.tips ?? '',
          unlocked: entry !== undefined,
          catches: entry?.catches ?? 0,
          maxCaughtWeightGrams: entry?.maxWeightGrams ?? 0,
          maxCaughtLengthCm: entry?.maxLengthCm ?? 0
        }
      }),
      lastEventText: state.lastEventText,
      fishing: {
        status: state.fishing.status ?? 'idle',
        stage: state.fishing.stage ?? null,
        remainingMs: state.fishing.status === 'fishing' ? Math.max(0, state.fishing.endsAt - now) : 0,
        durationMs: state.fishing.durationMs ?? 0,
        eventText: state.fishing.eventText ?? ''
      },
      now
    }
  }

  fishView(fish) {
    const species = SPECIES_BY_ID.get(fish.speciesId)
    if (species === undefined) return { ...fish, name: fish.speciesId, emoji: '🐟', value: 0 }
    return {
      ...fish,
      name: species.name,
      emoji: species.emoji,
      rarity: species.rarity,
      value: salePrice(species, fish)
    }
  }
}
