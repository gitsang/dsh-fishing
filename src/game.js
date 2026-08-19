/**
 * Pure-ish fishing game core. The host adapter feeds it token events and
 * commands; the web client renders snapshots. It intentionally does not import
 * any deepseek-harness or pi-fishing code.
 */

import { randomUUID } from 'node:crypto'

export const GAME_VERSION = 1

export const SPECIES = [
  { id: 'carp', name: '鲫鱼', emoji: '🐟', rarity: 'common', minWeightGrams: 200, maxWeightGrams: 800, minLengthCm: 15, maxLengthCm: 30, baseValue: 12, requiredRodId: 'bamboo', aquariumCompatible: true, scoreWeight: 1 },
  { id: 'crucian', name: '鲤鱼', emoji: '🐠', rarity: 'common', minWeightGrams: 500, maxWeightGrams: 1500, minLengthCm: 20, maxLengthCm: 40, baseValue: 20, requiredRodId: 'bamboo', aquariumCompatible: true, scoreWeight: 1 },
  { id: 'bass', name: '鲈鱼', emoji: '🐟', rarity: 'uncommon', minWeightGrams: 800, maxWeightGrams: 2500, minLengthCm: 30, maxLengthCm: 55, baseValue: 45, requiredRodId: 'carbon', aquariumCompatible: true, scoreWeight: 1 },
  { id: 'trout', name: '鳟鱼', emoji: '🐠', rarity: 'uncommon', minWeightGrams: 600, maxWeightGrams: 1800, minLengthCm: 25, maxLengthCm: 45, baseValue: 50, requiredRodId: 'carbon', aquariumCompatible: true, scoreWeight: 1 },
  { id: 'catfish', name: '鲶鱼', emoji: '🐡', rarity: 'rare', minWeightGrams: 2000, maxWeightGrams: 6000, minLengthCm: 40, maxLengthCm: 80, baseValue: 120, requiredRodId: 'long_cast', aquariumCompatible: true, scoreWeight: 1 },
  { id: 'mandarin', name: '鳜鱼', emoji: '🐟', rarity: 'rare', minWeightGrams: 1000, maxWeightGrams: 3500, minLengthCm: 30, maxLengthCm: 60, baseValue: 150, requiredRodId: 'long_cast', aquariumCompatible: true, scoreWeight: 1 },
  { id: 'koi', name: '锦鲤', emoji: '🐠', rarity: 'epic', minWeightGrams: 1500, maxWeightGrams: 5000, minLengthCm: 35, maxLengthCm: 70, baseValue: 400, requiredRodId: 'golden', aquariumCompatible: true, scoreWeight: 1 },
  { id: 'arowana', name: '龙鱼', emoji: '🐉', rarity: 'legendary', minWeightGrams: 3000, maxWeightGrams: 9000, minLengthCm: 50, maxLengthCm: 90, baseValue: 1200, requiredRodId: 'golden', aquariumCompatible: true, scoreWeight: 1 }
]

export const RODS = [
  { id: 'bamboo', name: '竹竿', emoji: '🎋', basePrice: 0, upgradeBasePrice: 80, maxLevel: 5, rarityMultiplier: 1.0, weightMultiplier: 1.0, baitTokensPerCast: 2000 },
  { id: 'carbon', name: '碳素竿', emoji: '🎣', basePrice: 300, upgradeBasePrice: 200, maxLevel: 5, rarityMultiplier: 1.5, weightMultiplier: 1.1, baitTokensPerCast: 1500 },
  { id: 'long_cast', name: '远投竿', emoji: '🎣', basePrice: 900, upgradeBasePrice: 500, maxLevel: 5, rarityMultiplier: 2.5, weightMultiplier: 1.2, baitTokensPerCast: 1200 },
  { id: 'golden', name: '黄金竿', emoji: '✨', basePrice: 3000, upgradeBasePrice: 1000, maxLevel: 5, rarityMultiplier: 5.0, weightMultiplier: 1.4, baitTokensPerCast: 1000 }
]

export const AQUARIUMS = [
  { id: 'small', name: '小型鱼缸', emoji: '🐠', basePrice: 200, baseCapacity: 3, maxCapacity: 6, upgradeBasePrice: 100, allowedSpecies: ['carp', 'crucian'] },
  { id: 'medium', name: '中型鱼缸', emoji: '🐟', basePrice: 600, baseCapacity: 5, maxCapacity: 10, upgradeBasePrice: 300, allowedSpecies: ['carp', 'crucian', 'bass', 'trout'] },
  { id: 'large', name: '大型鱼缸', emoji: '🐡', basePrice: 1500, baseCapacity: 8, maxCapacity: 16, upgradeBasePrice: 700, allowedSpecies: ['carp', 'crucian', 'bass', 'trout', 'catfish', 'mandarin', 'koi', 'arowana'] }
]

export const RARITY_SCORE = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
export const RARITY_VALUE_FACTOR = { common: 1.0, uncommon: 1.5, rare: 2.5, epic: 5.0, legendary: 10.0 }
export const RARITY_CATCH_WEIGHT = { common: 100, uncommon: 40, rare: 15, epic: 5, legendary: 1 }

const SPECIES_BY_ID = new Map(SPECIES.map((species) => [species.id, species]))
const RODS_BY_ID = new Map(RODS.map((rod) => [rod.id, rod]))
const AQUARIUMS_BY_ID = new Map(AQUARIUMS.map((aquarium) => [aquarium.id, aquarium]))

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function rodTier(rodId) {
  return RODS.findIndex((rod) => rod.id === rodId)
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
    totalTokensConsumed: 0,
    pendingBaitTokens: 0,
    equippedRodId: 'bamboo',
    ownedRods: { bamboo: { rodId: 'bamboo', level: 1 } },
    aquariums: [],
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
    inventoryCapacity: 10,
    lastEventText: '欢迎来到钓鱼小游戏！token 会自动变成鱼饵。'
  }
}

export function computeRodEffects(rod, level) {
  return {
    rarityMultiplier: rod.rarityMultiplier + (level - 1) * 0.15,
    weightMultiplier: rod.weightMultiplier + (level - 1) * 0.05,
    baitTokensPerCast: Math.max(200, Math.round(rod.baitTokensPerCast * Math.pow(0.95, level - 1)))
  }
}

export function upgradeRodCost(rod, level) {
  return Math.round(rod.upgradeBasePrice * Math.pow(1.8, level - 1))
}

export function upgradeAquariumCost(aquarium, capacity) {
  return Math.round(aquarium.upgradeBasePrice * Math.pow(1.7, capacity - aquarium.baseCapacity))
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

export class FishingGame {
  constructor(state = createInitialState(), rng = Math.random) {
    this.state = state
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
    return { rod, level, effects: computeRodEffects(rod, level) }
  }

  handleTokensConsumed(amount, source = 'msg', ts = Date.now()) {
    const rounded = Math.max(0, Math.round(amount))
    this.state.totalTokensConsumed += rounded
    this.state.pendingBaitTokens += rounded
    return []
  }

  tick(now = Date.now()) {
    const effects = []
    let guard = 0
    const { effects: rodEffects } = this.equippedRod()
    while (this.state.pendingBaitTokens >= rodEffects.baitTokensPerCast && guard < 100) {
      this.state.pendingBaitTokens -= rodEffects.baitTokensPerCast
      effects.push(...this.cast(now))
      guard += 1
    }
    return effects
  }

  cast(now = Date.now()) {
    const { rod, level, effects } = this.equippedRod()
    const tier = rodTier(rod.id)
    const candidates = SPECIES.filter((species) => rodTier(species.requiredRodId) <= tier)
    if (candidates.length === 0) {
      return [{ type: 'EventLine', text: '当前鱼竿还钓不到任何鱼。' }]
    }

    const totalWeight = candidates.reduce(
      (sum, species) => sum + (RARITY_CATCH_WEIGHT[species.rarity] ?? 1) * effects.rarityMultiplier,
      0
    )
    let roll = this.rng() * totalWeight
    let species = candidates[candidates.length - 1]
    for (const candidate of candidates) {
      roll -= (RARITY_CATCH_WEIGHT[candidate.rarity] ?? 1) * effects.rarityMultiplier
      if (roll <= 0) {
        species = candidate
        break
      }
    }

    const weightSpan = species.maxWeightGrams - species.minWeightGrams
    const lengthSpan = species.maxLengthCm - species.minLengthCm
    const weightGrams = clamp(
      Math.round(species.minWeightGrams + weightSpan * this.rng() * effects.weightMultiplier),
      species.minWeightGrams,
      species.maxWeightGrams
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

    this.state.stats.totalBaitTokensUsed += effects.baitTokensPerCast
    this.state.stats.totalCatches += 1
    if (species.rarity === 'rare' || species.rarity === 'epic' || species.rarity === 'legendary') {
      this.state.stats.rareCatches += 1
    }

    const entry = collectionEntry(this.state, species.id)
    entry.catches += 1
    entry.maxWeightGrams = Math.max(entry.maxWeightGrams, fish.weightGrams)
    entry.maxLengthCm = Math.max(entry.maxLengthCm, fish.lengthCm)

    const kg = (fish.weightGrams / 1000).toFixed(1)
    const text = `钓到了 [${species.name}] ${kg}kg / ${fish.lengthCm}cm / 评分 ${fish.rating}`
    this.state.lastEventText = text

    if (this.state.inventory.length >= this.state.inventoryCapacity) {
      return [
        { type: 'FishCaught', fish },
        { type: 'EventLine', text: `${text}，但鱼篓已满，鱼逃走了。` }
      ]
    }

    this.state.inventory.push(fish)
    return [{ type: 'FishCaught', fish }, { type: 'EventLine', text }]
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
        this.state.lastEventText = `装备了 ${rod.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'BuyAquarium': {
        const aquarium = AQUARIUMS_BY_ID.get(command.aquariumId)
        if (aquarium === undefined) throw new Error('未知鱼缸')
        if (this.state.aquariums.some((item) => item.aquariumId === aquarium.id)) throw new Error('已经拥有这个鱼缸')
        if (this.state.coins < aquarium.basePrice) throw new Error('金币不足')
        this.state.coins -= aquarium.basePrice
        this.state.stats.totalCoinsSpent += aquarium.basePrice
        this.state.aquariums.push({ aquariumId: aquarium.id, capacity: aquarium.baseCapacity, fish: [] })
        this.state.lastEventText = `购买了 ${aquarium.name}。`
        return [{ type: 'Purchase', kind: 'aquarium', id: aquarium.id, cost: aquarium.basePrice }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'UpgradeAquarium': {
        const aquarium = AQUARIUMS_BY_ID.get(command.aquariumId)
        if (aquarium === undefined) throw new Error('未知鱼缸')
        const owned = this.state.aquariums.find((item) => item.aquariumId === aquarium.id)
        if (owned === undefined) throw new Error('尚未拥有这个鱼缸')
        if (owned.capacity >= aquarium.maxCapacity) throw new Error('鱼缸已经最大容量')
        const cost = upgradeAquariumCost(aquarium, owned.capacity)
        if (this.state.coins < cost) throw new Error('金币不足')
        this.state.coins -= cost
        this.state.stats.totalCoinsSpent += cost
        owned.capacity += 1
        this.state.lastEventText = `${aquarium.name} 扩容到了 ${owned.capacity} 格。`
        return [{ type: 'Purchase', kind: 'aquarium', id: aquarium.id, cost }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'AssignFishToAquarium': {
        const fish = this.findInventoryFish(command.fishId)
        if (fish === undefined) throw new Error('鱼不在鱼篓中')
        const species = SPECIES_BY_ID.get(fish.speciesId)
        if (species === undefined || species.aquariumCompatible !== true) throw new Error('这种鱼不能入缸')
        const aquarium = AQUARIUMS_BY_ID.get(command.aquariumId)
        if (aquarium === undefined) throw new Error('未知鱼缸')
        const owned = this.state.aquariums.find((item) => item.aquariumId === aquarium.id)
        if (owned === undefined) throw new Error('尚未拥有这个鱼缸')
        if (!aquarium.allowedSpecies.includes(species.id)) throw new Error('这个鱼缸不能养这种鱼')
        if (owned.fish.length >= owned.capacity) throw new Error('鱼缸已经满了')
        this.removeInventoryFish(fish.id)
        fish.location = 'aquarium'
        owned.fish.push(fish)
        this.state.lastEventText = `把 ${species.name} 放进了 ${aquarium.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'RemoveFishFromAquarium': {
        const aquarium = this.state.aquariums.find((item) => item.fish.some((fish) => fish.id === command.fishId))
        if (aquarium === undefined) throw new Error('鱼不在任何鱼缸中')
        const fish = aquarium.fish.find((item) => item.id === command.fishId)
        if (fish === undefined) throw new Error('鱼不在任何鱼缸中')
        if (this.state.inventory.length >= this.state.inventoryCapacity) throw new Error('鱼篓已经满了')
        aquarium.fish = aquarium.fish.filter((item) => item.id !== fish.id)
        fish.location = 'inventory'
        this.state.inventory.push(fish)
        this.state.lastEventText = `把 ${SPECIES_BY_ID.get(fish.speciesId)?.name ?? '鱼'} 取回了鱼篓。`
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

    const inventory = state.inventory.map((fish) => this.fishView(fish))
    const aquariums = state.aquariums.map((aquarium) => ({
      ...aquarium,
      name: AQUARIUMS_BY_ID.get(aquarium.aquariumId)?.name ?? aquarium.aquariumId,
      emoji: AQUARIUMS_BY_ID.get(aquarium.aquariumId)?.emoji ?? '🐠',
      fish: aquarium.fish.map((fish) => this.fishView(fish))
    }))

    const rods = RODS.map((rod) => {
      const owned = state.ownedRods[rod.id]
      const level = owned?.level ?? 0
      const effects = owned !== undefined ? computeRodEffects(rod, owned.level) : null
      return {
        id: rod.id,
        name: rod.name,
        emoji: rod.emoji,
        basePrice: rod.basePrice,
        maxLevel: rod.maxLevel,
        owned: owned !== undefined,
        equipped: state.equippedRodId === rod.id,
        level,
        baitTokensPerCast: effects?.baitTokensPerCast ?? rod.baitTokensPerCast,
        upgradeCost: owned !== undefined && owned.level < rod.maxLevel ? upgradeRodCost(rod, owned.level) : null
      }
    })

    const aquariumsCatalog = AQUARIUMS.map((aquarium) => {
      const owned = state.aquariums.find((item) => item.aquariumId === aquarium.id)
      return {
        id: aquarium.id,
        name: aquarium.name,
        emoji: aquarium.emoji,
        basePrice: aquarium.basePrice,
        owned: owned !== undefined,
        capacity: owned?.capacity ?? aquarium.baseCapacity,
        maxCapacity: aquarium.maxCapacity,
        upgradeCost: owned !== undefined && owned.capacity < aquarium.maxCapacity
          ? upgradeAquariumCost(aquarium, owned.capacity)
          : null
      }
    })

    return {
      version: state.version,
      coins: state.coins,
      totalTokensConsumed: state.totalTokensConsumed,
      pendingBaitTokens: state.pendingBaitTokens,
      baitTokensPerCast: equipped.effects.baitTokensPerCast,
      equippedRod: {
        id: equipped.rod.id,
        name: equipped.rod.name,
        emoji: equipped.rod.emoji,
        level: equipped.level,
        rarityMultiplier: equipped.effects.rarityMultiplier,
        weightMultiplier: equipped.effects.weightMultiplier
      },
      inventoryCapacity: state.inventoryCapacity,
      inventory,
      aquariums,
      rods,
      aquariumsCatalog,
      stats: state.stats,
      collection: state.collection,
      lastEventText: state.lastEventText,
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
