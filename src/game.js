/**
 * Pure-ish fishing game core. The host adapter feeds it token events and
 * commands; the web client renders snapshots. It intentionally does not import
 * any deepseek-harness or pi-fishing code.
 */

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

function loadJson(file) {
  return JSON.parse(readFileSync(new URL(`./data/${file}`, import.meta.url), 'utf8'))
}

export const GAME_VERSION = 1
export const TOKENS_PER_STAMINA = 1_000_000
export const BAIT_TOKENS_PER_BAIT = TOKENS_PER_STAMINA

export const SPECIES = loadJson('species.json')
export const MAPS = loadJson('maps.json')
export const RODS = loadJson('rods.json')
export const BASKETS = loadJson('baskets.json')
export const ACCESSORY_SLOTS = loadJson('accessorySlots.json')
export const ACCESSORIES = loadJson('accessories.json')
export const BAITS = loadJson('baits.json')
export const LURES = loadJson('lures.json')
export const JUNK_ITEMS = loadJson('junkItems.json')
export const FISHING_EVENTS = loadJson('fishingEvents.json')
export const FISHING_WAIT_MIN_MS = 0
export const FISHING_WAIT_MAX_MS = 60_000
export const FISHING_REEL_MIN_MS = 0
export const FISHING_REEL_MAX_MS = 60_000
export const FISHING_EVENT_TICK_CHANCE = 0.15

const INITIAL_STATE = loadJson('initialState.json')

const SPECIES_BY_ID = new Map(SPECIES.map((species) => [species.id, species]))
const RODS_BY_ID = new Map(RODS.map((rod) => [rod.id, rod]))
const BASKETS_BY_ID = new Map(BASKETS.map((basket) => [basket.id, basket]))
const ACCESSORIES_BY_ID = new Map(ACCESSORIES.map((accessory) => [accessory.id, accessory]))
const BAITS_BY_ID = new Map(BAITS.map((bait) => [bait.id, bait]))
const LURES_BY_ID = new Map(LURES.map((lure) => [lure.id, lure]))
const ACCESSORY_SLOTS_BY_ID = new Map(ACCESSORY_SLOTS.map((slot) => [slot.id, slot]))
const OLD_ROD_MIGRATION = loadJson('oldRodMigration.json')
const MAPS_BY_ID = new Map(MAPS.map((map) => [map.id, map]))
const LEVEL_EXP = loadJson('levelExp.json')
const ROD_TYPE_NAMES = Object.fromEntries(loadJson('rodTypes.json').map((item) => [item.id, item.name]))

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
  if (!species) return 10
  const value = species.baseValue || 10
  if (value >= 2000) return 60
  if (value >= 800) return 45
  if (value >= 250) return 30
  if (value >= 80) return 20
  return 12
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
  const state = structuredClone(INITIAL_STATE)
  state.version = GAME_VERSION
  return state
}

export function computeRodEffects(rod, accessories = []) {
  let successRate = rod.baseSuccessRate || 0.5
  let maxWeightMultiplier = 1
  let catchMultiplier = rod.catchMultiplier ?? 1
  for (const accessory of accessories) {
    successRate += accessory.successRateBonus ?? 0
    maxWeightMultiplier += accessory.maxWeightBonus ?? 0
    catchMultiplier += (accessory.catchBonus ?? 0) * 0.1
  }
  return {
    catchMultiplier,
    weightMultiplier: rod.weightMultiplier ?? 1,
    successRate: clamp(successRate, 0, 0.95),
    maxWeightMultiplier
  }
}

export function computeEffectiveMaxLoadKg(rod, accessories = []) {
  const parts = []
  if (rod?.maxLoadKg) parts.push(rod.maxLoadKg)
  for (const accessory of accessories) {
    if (accessory?.maxLoadKg) parts.push(accessory.maxLoadKg)
  }
  return parts.length > 0 ? Math.min(...parts) : Infinity
}

export function salePrice(species, fish) {
  const weightSpan = species.maxWeightGrams - species.minWeightGrams || 1
  const lengthSpan = species.maxLengthCm - species.minLengthCm || 1
  const weightFactor = 0.6 + 0.8 * (fish.weightGrams - species.minWeightGrams) / weightSpan
  const lengthFactor = 0.7 + 0.6 * (fish.lengthCm - species.minLengthCm) / lengthSpan
  return Math.round(species.baseValue * weightFactor * lengthFactor)
}

function ratingFor(species, fish, effects) {
  const weightSpan = species.maxWeightGrams - species.minWeightGrams || 1
  const lengthSpan = species.maxLengthCm - species.minLengthCm || 1
  const weightScore = (fish.weightGrams - species.minWeightGrams) / weightSpan
  const lengthScore = (fish.lengthCm - species.minLengthCm) / lengthSpan
  return clamp(
    Math.round(
      50 +
        weightScore * 25 +
        lengthScore * 20 +
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
  // Keep old bait-era fields for migration before base defaults overwrite them.
  const oldBait = state.bait
  const oldPendingBaitTokens = state.pendingBaitTokens
  const oldTotalBaitTokensUsed = state.stats?.totalBaitTokensUsed
  delete state.bait
  delete state.pendingBaitTokens

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

  // Migrate old rod ids to branded rod models.
  if (state.ownedRods !== null && typeof state.ownedRods === 'object') {
    for (const [oldId, oldRod] of Object.entries(state.ownedRods)) {
      const newId = OLD_ROD_MIGRATION[oldId]
      if (newId === undefined || !RODS_BY_ID.has(newId)) continue
      if (state.ownedRods[newId] === undefined) {
        state.ownedRods[newId] = { rodId: newId, condition: 100 }
      }
    }
    for (const id of Object.keys(state.ownedRods)) {
      if (!RODS_BY_ID.has(id)) delete state.ownedRods[id]
      else state.ownedRods[id] = { rodId: id, condition: state.ownedRods[id]?.condition ?? 100 }
    }
  }
  if (typeof state.equippedRodId === 'string' && OLD_ROD_MIGRATION[state.equippedRodId] !== undefined) {
    state.equippedRodId = OLD_ROD_MIGRATION[state.equippedRodId]
  }
  if (!RODS_BY_ID.has(state.equippedRodId)) state.equippedRodId = RODS[0].id
  if (state.ownedRods[state.equippedRodId] === undefined) {
    state.ownedRods[state.equippedRodId] = { rodId: state.equippedRodId, condition: 100 }
  }
  for (const rodId of Object.keys(state.ownedRods)) {
    if (!Number.isFinite(state.ownedRods[rodId].condition)) state.ownedRods[rodId].condition = 100
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
  for (const item of state.items) {
    if (!Number.isFinite(item.condition)) item.condition = 100
  }
  if (!Array.isArray(state.collection)) state.collection = []
  if (state.ownedBaits === null || typeof state.ownedBaits !== 'object') state.ownedBaits = {}
  for (const bait of BAITS) {
    if (!Number.isFinite(state.ownedBaits[bait.id])) state.ownedBaits[bait.id] = 0
  }
  if (!BAITS_BY_ID.has(state.equippedBaitId)) state.equippedBaitId = BAITS[0]?.id ?? null
  if (!Array.isArray(state.ownedLures)) state.ownedLures = []
  if (state.equippedLureId !== null && state.equippedLureId !== undefined && !LURES_BY_ID.has(state.equippedLureId)) {
    state.equippedLureId = null
  }
  if (state.fishingDepthM !== null && state.fishingDepthM !== undefined && !Number.isFinite(state.fishingDepthM)) {
    state.fishingDepthM = null
  }
  if (state.equippedAccessories === null || typeof state.equippedAccessories !== 'object') {
    state.equippedAccessories = Object.fromEntries(ACCESSORY_SLOTS.map((slot) => [slot.id, null]))
  }
  for (const slot of ACCESSORY_SLOTS) {
    if (state.equippedAccessories[slot.id] === undefined) state.equippedAccessories[slot.id] = null
  }

  // Clear accessories that are not compatible with the currently equipped rod.
  const normalizedRod = RODS_BY_ID.get(state.equippedRodId)
  if (normalizedRod !== undefined) {
    for (const slot of ACCESSORY_SLOTS) {
      const itemId = state.equippedAccessories[slot.id]
      if (itemId === null || itemId === undefined) continue
      const accessory = ACCESSORIES_BY_ID.get(itemId)
      if (accessory === undefined || !accessory.rodTypes.includes(normalizedRod.rodType)) {
        state.equippedAccessories[slot.id] = null
        for (const entry of state.items) {
          if (entry.itemId === itemId) entry.equipped = false
        }
      }
    }
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
  // Migrate old bait-era fields to stamina.
  if (oldBait !== undefined) state.stamina = oldBait
  if (oldPendingBaitTokens !== undefined) state.pendingStaminaTokens = oldPendingBaitTokens
  if (oldTotalBaitTokensUsed !== undefined) state.stats.totalStaminaUsed = oldTotalBaitTokensUsed
  delete state.stats.totalBaitTokensUsed
  if (!Number.isFinite(state.stamina)) state.stamina = 0
  if (!Number.isFinite(state.pendingStaminaTokens)) state.pendingStaminaTokens = 0
  if (state.pendingStaminaTokens >= TOKENS_PER_STAMINA) {
    state.stamina += Math.floor(state.pendingStaminaTokens / TOKENS_PER_STAMINA)
    state.pendingStaminaTokens %= TOKENS_PER_STAMINA
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
    const accessories = Object.values(this.state.equippedAccessories ?? {})
      .map((itemId) => ACCESSORIES_BY_ID.get(itemId))
      .filter((accessory) => accessory !== undefined && accessory.rodTypes.includes(rod.rodType))
    return {
      rod,
      effects: computeRodEffects(rod, accessories),
      accessories,
      maxLoadKg: computeEffectiveMaxLoadKg(rod, accessories)
    }
  }

  equippedBasket() {
    const basket = BASKETS_BY_ID.get(this.state.equippedBasketId) ?? BASKETS[0]
    return basket
  }

  currentMap() {
    return MAPS_BY_ID.get(this.state.currentMapId) ?? MAPS[0]
  }

  currentMapHour(now = Date.now()) {
    const timeZone = this.currentMap().timezone || 'Asia/Shanghai'
    try {
      return Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now))
    } catch {
      return new Date(now).getHours()
    }
  }

  currentWaterTemp(now = Date.now()) {
    const timeZone = this.currentMap().timezone || 'Asia/Shanghai'
    let month = 1
    try {
      month = Number(new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric' }).format(now))
    } catch {
      month = new Date(now).getMonth() + 1
    }
    const seasonal = [5, 5, 8, 14, 19, 24, 27, 27, 22, 16, 10, 6][month - 1] ?? 15
    const latitude = this.currentMap().latitude ?? 30
    return clamp(seasonal + (30 - latitude) * 0.1, -5, 35)
  }

  currentLightLevel(now = Date.now()) {
    const hour = this.currentMapHour(now)
    if (hour >= 7 && hour < 17) return 80
    if (hour >= 5 && hour < 7) return 30
    if (hour >= 17 && hour < 20) return 30
    return 10
  }

  isTimeInRanges(hour, ranges) {
    if (!Array.isArray(ranges) || ranges.length === 0) return true
    return ranges.some((range) => hour >= (range.startHour ?? 0) && hour < (range.endHour ?? 24))
  }

  currentFoodMode() {
    const rod = this.equippedRod().rod
    if (rod.rodType === 'lure' && this.state.equippedLureId !== null && this.state.equippedLureId !== undefined) {
      return { mode: 'lure', id: this.state.equippedLureId }
    }
    return { mode: 'bait', id: this.state.equippedBaitId }
  }

  currentMapCandidates(now = Date.now()) {
    const mapId = this.state.currentMapId
    const food = this.currentFoodMode()
    if (!food.id) return []
    const hour = this.currentMapHour(now)
    const waterTemp = this.currentWaterTemp(now)
    const light = this.currentLightLevel(now)
    const rod = this.equippedRod().rod
    const depth = rod.depthControl === 'bottom'
      ? (this.currentMap().maxDepthM ?? 10)
      : this.state.fishingDepthM
    return SPECIES.filter((species) => {
      const areas = species.activeAreas ?? species.maps ?? []
      if (!areas.includes(mapId)) return false
      if (food.mode === 'lure') {
        if (!(species.lureIds ?? []).includes(food.id)) return false
      } else {
        if (!(species.baitIds ?? []).includes(food.id)) return false
      }
      if (!this.isTimeInRanges(hour, species.activeTimeRanges)) return false
      if (species.waterTempRange) {
        const temp = species.waterTempRange
        if (waterTemp < (temp.minC ?? -99) || waterTemp > (temp.maxC ?? 99)) return false
      }
      if (Array.isArray(species.lightRanges) && species.lightRanges.length > 0) {
        const ok = species.lightRanges.some((range) => light >= (range.min ?? 0) && light <= (range.max ?? 100))
        if (!ok) return false
      }
      if (depth !== null && depth !== undefined && species.depthRange) {
        const range = species.depthRange
        if (depth < (range.minM ?? 0) || depth > (range.maxM ?? 999)) return false
      }
      return true
    })
  }

  handleTokensConsumed(amount, source = 'msg', ts = Date.now()) {
    const rounded = Math.max(0, Math.round(amount))
    this.state.totalTokensConsumed += rounded
    const pending = this.state.pendingStaminaTokens + rounded
    this.state.stamina += Math.floor(pending / TOKENS_PER_STAMINA)
    this.state.pendingStaminaTokens = pending % TOKENS_PER_STAMINA
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

  currentMapStaminaCost() {
    return MAPS_BY_ID.get(this.state.currentMapId)?.staminaCost ?? 1
  }

  damageEquippedGear() {
    const rodId = this.state.equippedRodId
    const rodEntry = this.state.ownedRods[rodId]
    const parts = []
    if (rodEntry) parts.push({ kind: '鱼竿', id: rodId, ref: rodEntry, maxLoadKg: RODS_BY_ID.get(rodId)?.maxLoadKg ?? Infinity })
    for (const slot of ACCESSORY_SLOTS) {
      const itemId = this.state.equippedAccessories?.[slot.id]
      if (!itemId) continue
      const entry = this.state.items.find((item) => item.itemId === itemId)
      const accessory = ACCESSORIES_BY_ID.get(itemId)
      if (entry && accessory) {
        parts.push({ kind: ACCESSORY_SLOTS_BY_ID.get(slot.id)?.name ?? slot.id, id: itemId, ref: entry, maxLoadKg: accessory.maxLoadKg ?? Infinity })
      }
    }
    parts.sort((a, b) => (a.maxLoadKg || Infinity) - (b.maxLoadKg || Infinity))
    const part = parts[0]
    if (!part) return null
    const damage = Math.max(1, Math.floor(this.rng() * 15) + 5)
    part.ref.condition = Math.max(0, (part.ref.condition ?? 100) - damage)
    this.state.lastEventText = `${part.kind}因超过钓重受损，耐久度 -${damage}（当前 ${part.ref.condition}）。`
    return part
  }

  cancelFishing({ refundStamina = false } = {}) {
    if (this.state.fishing?.status !== 'fishing') return false
    const refund = refundStamina === true
    this.state.fishing.status = 'idle'
    this.state.fishing.stage = null
    this.state.fishing.startedAt = 0
    this.state.fishing.endsAt = 0
    this.state.fishing.durationMs = 0
    this.state.fishing.lastEventAt = 0
    this.state.fishing.eventText = ''
    if (refund) this.state.stamina += this.currentMapStaminaCost()
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
    const staminaCost = this.currentMapStaminaCost()
    while (this.state.stamina >= staminaCost && this.state.fishing.status === 'idle' && guard < 100) {
      if (this.state.inventory.length >= this.state.inventoryCapacity) {
        this.state.lastEventText = '鱼篓已满，停止钓鱼。'
        effects.push({ type: 'EventLine', text: this.state.lastEventText })
        break
      }
      const food = this.currentFoodMode()
      if (food.mode === 'bait' && (this.state.ownedBaits[food.id] ?? 0) <= 0) {
        this.state.lastEventText = '饵料不足，请先购买或更换饵料。'
        effects.push({ type: 'EventLine', text: this.state.lastEventText })
        break
      }
      if (food.mode === 'lure' && !this.state.ownedLures.includes(food.id)) {
        this.state.lastEventText = '尚未拥有当前假饵，请先购买或更换。'
        effects.push({ type: 'EventLine', text: this.state.lastEventText })
        break
      }
      if (this.currentMapCandidates(now).length === 0) {
        this.state.lastEventText = '当前条件下没有鱼开口，请更换饵料、时间或水深后再试。'
        effects.push({ type: 'EventLine', text: this.state.lastEventText })
        break
      }
      this.state.stamina -= staminaCost
      if (food.mode === 'bait') this.state.ownedBaits[food.id] -= 1
      effects.push(...this.cast(now))
      guard += 1

      // If both stages rolled 0s, finish immediately so remaining stamina can proceed.
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
    const staminaCost = this.currentMapStaminaCost()
    this.state.stats.totalStaminaUsed = (this.state.stats.totalStaminaUsed ?? 0) + staminaCost

    const candidates = this.currentMapCandidates(now)
    if (candidates.length === 0) {
      this.state.stamina += staminaCost
      this.state.lastEventText = '当前条件下没有鱼开口，请更换饵料、时间或水深后再试。'
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
    const { effects } = this.equippedRod()
    this.state.fishing.status = 'idle'
    this.state.fishing.stage = null
    this.state.fishing.startedAt = 0
    this.state.fishing.endsAt = 0
    this.state.fishing.durationMs = 0
    this.state.fishing.lastEventAt = 0
    this.state.fishing.eventText = ''

    const candidates = this.currentMapCandidates(now)
    if (candidates.length === 0) {
      this.state.lastEventText = '当前条件下没有鱼开口。'
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
      const baseWeight = Math.max(1, species.baseValue || 1)
      return baseWeight * effects.catchMultiplier
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

    // Landing check by tackle load (钓重).
    const equipped = this.equippedRod()
    const maxLoadKg = Number.isFinite(equipped.maxLoadKg) ? equipped.maxLoadKg : 999
    const loadRatio = (fish.weightGrams / 1000) / maxLoadKg
    let hookChance = 1
    if (loadRatio > 1) {
      const damageChance = Math.min(0.8, (loadRatio - 1) * 1.5)
      if (this.rng() < damageChance) this.damageEquippedGear()
    }
    if (loadRatio > 1.2) {
      this.state.lastEventText = `[${species.name}] 太重了，超出钓重${(loadRatio * 100).toFixed(0)}%，线组承受不住，鱼逃走了！`
      return [{ type: 'EventLine', text: this.state.lastEventText }]
    }
    if (loadRatio > 1) {
      hookChance = clamp(0.5 - (loadRatio - 1) * 2.5, 0, 0.5)
    } else if (loadRatio > 0.5) {
      hookChance = clamp(0.9 - (loadRatio - 0.5) * 0.8, 0.05, 0.98)
    }
    if (this.rng() > hookChance) {
      this.state.lastEventText = `[${species.name}] 在搏鱼时挣脱了（当前钓重利用率 ${(loadRatio * 100).toFixed(0)}%）。`
      return [{ type: 'EventLine', text: this.state.lastEventText }]
    }

    const fightStaminaCost = Math.max(1, Math.ceil(fish.weightGrams / 1000 / (species.staminaPerKg || 2)))
    if (this.state.stamina < fightStaminaCost) {
      this.state.lastEventText = `体力不足，[${species.name}] 挣脱了……`
      return [{ type: 'EventLine', text: this.state.lastEventText }]
    }
    this.state.stamina -= fightStaminaCost

    this.state.stats.totalCatches += 1

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
        this.state.ownedRods[rod.id] = { rodId: rod.id, condition: 100 }
        this.state.lastEventText = `购买了 ${rod.name}。`
        return [{ type: 'Purchase', kind: 'rod', id: rod.id, cost: rod.basePrice }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'UpgradeRod': {
        throw new Error('鱼竿已取消升级，请直接购买更高型号的鱼竿')
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
          if (accessory !== undefined && !accessory.rodTypes.includes(rod.rodType)) {
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
        this.state.items.push({ id: randomUUID().slice(0, 8), itemId: accessory.id, equipped: false, condition: 100 })
        this.state.lastEventText = `购买了 ${accessory.name}。`
        return [{ type: 'Purchase', kind: 'accessory', id: accessory.id, cost: accessory.basePrice }, { type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'EquipAccessory': {
        const accessory = ACCESSORIES_BY_ID.get(command.accessoryId)
        if (accessory === undefined) throw new Error('未知配件')
        const item = this.state.items.find((entry) => entry.itemId === accessory.id)
        if (item === undefined) throw new Error('尚未拥有这个配件')
        if (!accessory.rodTypes.includes(this.equippedRod().rod.rodType)) throw new Error('当前鱼竿无法装备这个配件')
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

      case 'RepairGear': {
        const kind = command.kind
        const id = command.id
        let target = null
        let price = 0
        let name = ''
        if (kind === 'rod') {
          const rod = RODS_BY_ID.get(id)
          if (rod === undefined) throw new Error('未知鱼竿')
          const entry = this.state.ownedRods[id]
          if (entry === undefined) throw new Error('尚未拥有这支鱼竿')
          target = entry
          price = rod.basePrice
          name = rod.name
        } else if (kind === 'accessory') {
          const accessory = ACCESSORIES_BY_ID.get(id)
          if (accessory === undefined) throw new Error('未知配件')
          const entry = this.state.items.find((item) => item.itemId === id)
          if (entry === undefined) throw new Error('尚未拥有这个配件')
          target = entry
          price = accessory.basePrice
          name = accessory.name
        } else {
          throw new Error('未知维修类型')
        }
        const current = target.condition ?? 100
        if (current >= 100) throw new Error(`${name}不需要维修`)
        const cost = Math.max(1, Math.ceil(price * (100 - current) / 100 * 0.5))
        if (this.state.coins < cost) throw new Error('金币不足')
        this.state.coins -= cost
        this.state.stats.totalCoinsSpent += cost
        target.condition = 100
        this.state.lastEventText = `维修了 ${name}，花费 ${cost} 金币。`
        return [
          { type: 'Repair', kind, id, cost },
          { type: 'EventLine', text: this.state.lastEventText }
        ]
      }

      case 'BuyBait': {
        const bait = BAITS_BY_ID.get(command.baitId)
        if (bait === undefined) throw new Error('未知饵料')
        if (levelFromExperience(this.state.experience) < (bait.unlockLevel ?? 1)) {
          throw new Error(`需要 Lv.${bait.unlockLevel} 才能购买${bait.name}`)
        }
        const packs = Math.max(1, Math.floor(Number(command.quantity) || 1))
        const cost = bait.price * packs
        if (this.state.coins < cost) throw new Error('金币不足')
        this.state.coins -= cost
        this.state.stats.totalCoinsSpent += cost
        const amount = packs * (bait.packSize || 1)
        this.state.ownedBaits[bait.id] = (this.state.ownedBaits[bait.id] ?? 0) + amount
        this.state.lastEventText = `购买了 ${bait.name} ×${amount}，花费 ${cost} 金币。`
        return [
          { type: 'Purchase', kind: 'bait', id: bait.id, cost, quantity: amount },
          { type: 'EventLine', text: this.state.lastEventText }
        ]
      }

      case 'EquipBait': {
        const bait = BAITS_BY_ID.get(command.baitId)
        if (bait === undefined) throw new Error('未知饵料')
        if ((this.state.ownedBaits[bait.id] ?? 0) <= 0) throw new Error(`尚未拥有${bait.name}`)
        this.state.equippedBaitId = bait.id
        this.state.lastEventText = `装备了饵料 ${bait.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'BuyLure': {
        const lure = LURES_BY_ID.get(command.lureId)
        if (lure === undefined) throw new Error('未知假饵')
        if (levelFromExperience(this.state.experience) < (lure.unlockLevel ?? 1)) {
          throw new Error(`需要 Lv.${lure.unlockLevel} 才能购买${lure.name}`)
        }
        if (this.state.ownedLures.includes(lure.id)) throw new Error('已经拥有这个假饵')
        if (this.state.coins < lure.price) throw new Error('金币不足')
        this.state.coins -= lure.price
        this.state.stats.totalCoinsSpent += lure.price
        this.state.ownedLures.push(lure.id)
        this.state.lastEventText = `购买了假饵 ${lure.name}。`
        return [
          { type: 'Purchase', kind: 'lure', id: lure.id, cost: lure.price },
          { type: 'EventLine', text: this.state.lastEventText }
        ]
      }

      case 'EquipLure': {
        const lure = LURES_BY_ID.get(command.lureId)
        if (lure === undefined) throw new Error('未知假饵')
        if (!this.state.ownedLures.includes(lure.id)) throw new Error('尚未拥有这个假饵')
        if (this.equippedRod().rod.rodType !== 'lure') throw new Error('只有路亚竿可以装配假饵')
        this.state.equippedLureId = lure.id
        this.state.lastEventText = `装备了假饵 ${lure.name}。`
        return [{ type: 'EventLine', text: this.state.lastEventText }]
      }

      case 'SetDepth': {
        const map = MAPS_BY_ID.get(this.state.currentMapId)
        const rod = this.equippedRod().rod
        const depthM = command.depthM === null || command.depthM === undefined || command.depthM === 'auto' ? null : Number(command.depthM)
        if (rod.depthControl === 'bottom' && depthM !== null) {
          throw new Error(`${rod.name}是沉底钓法，不能手动调节水深`)
        }
        if (depthM !== null && (!Number.isFinite(depthM) || depthM < 0)) throw new Error('水深必须是非负数字')
        if (depthM !== null && map !== undefined && depthM > (map.maxDepthM ?? 100)) {
          throw new Error(`该地图最大水深为 ${map.maxDepthM}m`)
        }
        this.state.fishingDepthM = depthM
        this.state.lastEventText = depthM === null ? '已切换为自动水深。' : `已设置钓深 ${depthM}m。`
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
        const canceled = this.cancelFishing({ refundStamina: true })
        const oldExpiry = this.state.mapTickets[map.id] ?? 0
        const base = Math.max(now, oldExpiry)
        const expiresAt = base + days * TICKET_DAY_MS
        this.state.coins -= cost
        this.state.stats.totalCoinsSpent += cost
        this.state.mapTickets[map.id] = expiresAt
        this.state.currentMapId = map.id
        const cancelText = canceled ? `已取消当前钓鱼并退还 ${this.currentMapStaminaCost()} 点体力。` : ''
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
        const canceled = this.cancelFishing({ refundStamina: true })
        this.state.currentMapId = map.id
        const cancelText = canceled ? `已取消当前钓鱼并退还 ${this.currentMapStaminaCost()} 点体力。` : ''
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
        brand: rod.brand,
        model: rod.model,
        name: rod.name,
        icon: rod.icon,
        rodType: rod.rodType,
        type: rod.type,
        material: rod.material,
        length: rod.length,
        sections: rod.sections,
        power: rod.power,
        action: rod.action,
        weight: rod.weight,
        lureWeight: rod.lureWeight,
        lineWeight: rod.lineWeight,
        closedLength: rod.closedLength,
        tipDiameter: rod.tipDiameter,
        buttDiameter: rod.buttDiameter,
        basePrice: rod.basePrice,
        unlockLevel: rod.unlockLevel ?? 1,
        baseSuccessRate: rod.baseSuccessRate,
        weightMultiplier: rod.weightMultiplier,
        catchMultiplier: rod.catchMultiplier,
        maxLoadKg: rod.maxLoadKg ?? null,
        depthControl: rod.depthControl ?? 'adjust',
        depthRangeM: rod.depthRangeM ?? null,
        owned: owned !== undefined,
        equipped: state.equippedRodId === rod.id,
        condition: owned?.condition ?? 100
      }
    })

    const baskets = BASKETS.map((basket) => {
      const owned = state.ownedBaskets[basket.id] !== undefined
      return {
        id: basket.id,
        brand: basket.brand,
        model: basket.model,
        name: basket.name,
        icon: basket.icon,
        material: basket.material,
        spec: basket.spec,
        capacity: basket.capacity,
        basePrice: basket.basePrice,
        unlockLevel: basket.unlockLevel ?? 1,
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
        brand: accessory.brand,
        model: accessory.model,
        name: accessory.name,
        icon: accessory.icon,
        slot: accessory.slot,
        slotName: ACCESSORY_SLOTS_BY_ID.get(accessory.slot)?.name ?? accessory.slot,
        material: accessory.material,
        spec: accessory.spec,
        basePrice: accessory.basePrice,
        unlockLevel: accessory.unlockLevel ?? 1,
        maxLoadKg: accessory.maxLoadKg ?? null,
        rodTypes: accessory.rodTypes,
        equipped: item.equipped,
        condition: item.condition ?? 100,
        canEquip: accessory.rodTypes.includes(equipped.rod.rodType)
      }
    }).filter((item) => item !== null)

    const equippedAccessories = ACCESSORY_SLOTS.map((slot) => {
      const itemId = state.equippedAccessories[slot.id]
      const accessory = itemId === null || itemId === undefined ? null : ACCESSORIES_BY_ID.get(itemId)
      return {
        slot: slot.id,
        name: slot.name,
        accessory: accessory === null || accessory === undefined ? null : { id: accessory.id, name: accessory.name, icon: accessory.icon }
      }
    })

    const shopItems = [
      ...RODS.map((rod) => ({
        kind: 'rod',
        category: '鱼竿',
        id: rod.id,
        brand: rod.brand,
        model: rod.model,
        name: rod.name,
        icon: rod.icon,
        rodType: rod.rodType,
        type: rod.type,
        material: rod.material,
        length: rod.length,
        sections: rod.sections,
        power: rod.power,
        action: rod.action,
        weight: rod.weight,
        lureWeight: rod.lureWeight,
        lineWeight: rod.lineWeight,
        closedLength: rod.closedLength,
        tipDiameter: rod.tipDiameter,
        buttDiameter: rod.buttDiameter,
        price: rod.basePrice,
        unlockLevel: rod.unlockLevel ?? 1,
        baseSuccessRate: rod.baseSuccessRate,
        weightMultiplier: rod.weightMultiplier,
        catchMultiplier: rod.catchMultiplier,
        maxLoadKg: rod.maxLoadKg ?? null,
        depthControl: rod.depthControl ?? 'adjust',
        depthRangeM: rod.depthRangeM ?? null,
        owned: state.ownedRods[rod.id] !== undefined
      })),
      ...BASKETS.map((basket) => ({
        kind: 'basket',
        category: '鱼篓',
        id: basket.id,
        brand: basket.brand,
        model: basket.model,
        name: basket.name,
        icon: basket.icon,
        material: basket.material,
        spec: basket.spec,
        capacity: basket.capacity,
        price: basket.basePrice,
        unlockLevel: basket.unlockLevel ?? 1,
        owned: state.ownedBaskets[basket.id] !== undefined
      })),
      ...ACCESSORIES.map((accessory) => {
        const slot = ACCESSORY_SLOTS_BY_ID.get(accessory.slot)
        return {
          kind: 'accessory',
          category: slot?.name ?? '配件',
          id: accessory.id,
          brand: accessory.brand,
          model: accessory.model,
          name: accessory.name,
          icon: accessory.icon,
          slot: accessory.slot,
          material: accessory.material,
          spec: accessory.spec,
          price: accessory.basePrice,
          unlockLevel: accessory.unlockLevel ?? 1,
          maxLoadKg: accessory.maxLoadKg ?? null,
          owned: state.items.some((item) => item.itemId === accessory.id),
          canEquip: accessory.rodTypes.includes(equipped.rod.rodType)
        }
      }),
      ...BAITS.map((bait) => ({
        kind: 'bait',
        category: '饵料',
        id: bait.id,
        name: bait.name,
        icon: bait.icon,
        price: bait.price,
        packSize: bait.packSize ?? 1,
        unlockLevel: bait.unlockLevel ?? 1,
        owned: (state.ownedBaits[bait.id] ?? 0) > 0,
        quantity: state.ownedBaits[bait.id] ?? 0
      })),
      ...LURES.map((lure) => ({
        kind: 'lure',
        category: '假饵',
        id: lure.id,
        name: lure.name,
        icon: lure.icon,
        price: lure.price,
        unlockLevel: lure.unlockLevel ?? 1,
        owned: state.ownedLures.includes(lure.id),
        canEquip: equipped.rod.rodType === 'lure'
      }))
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
        icon: map.icon,
        region: map.region,
        city: map.city,
        spot: map.spot,
        type: map.type,
        requiredLevel: map.requiredLevel,
        entryFee: map.entryFee,
        staminaCost: map.staminaCost ?? 1,
        maxDepthM: map.maxDepthM ?? null,
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
            icon: species.icon,
            requiredRodId: species.requiredRodId,
            description: species.description ?? '',
            habitat: species.habitat ?? '',
            favoriteBait: species.favoriteBait ?? '',
            tips: species.tips ?? ''
          }))
      }
    })

    const shopCategories = [...new Set(['鱼竿', '鱼篓', ...ACCESSORY_SLOTS.map((slot) => slot.name), '饵料', '假饵'])]

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
        icon: currentMap.icon,
        region: currentMap.region,
        city: currentMap.city,
        spot: currentMap.spot,
        type: currentMap.type,
        requiredLevel: currentMap.requiredLevel,
        entryFee: currentMap.entryFee,
        staminaCost: currentMap.staminaCost ?? 1,
        maxDepthM: currentMap.maxDepthM ?? null,
        description: currentMap.description,
        fishIntro: currentMap.fishIntro
      },
      maps,
      totalTokensConsumed: state.totalTokensConsumed ?? 0,
      pendingStaminaTokens: state.pendingStaminaTokens ?? 0,
      stamina: state.stamina ?? 0,
      tokensPerStamina: TOKENS_PER_STAMINA,
      equippedRod: {
        id: equipped.rod.id,
        brand: equipped.rod.brand,
        model: equipped.rod.model,
        name: equipped.rod.name,
        icon: equipped.rod.icon,
        rodType: equipped.rod.rodType,
        type: equipped.rod.type,
        material: equipped.rod.material,
        length: equipped.rod.length,
        sections: equipped.rod.sections,
        power: equipped.rod.power,
        action: equipped.rod.action,
        weight: equipped.rod.weight,
        lureWeight: equipped.rod.lureWeight,
        lineWeight: equipped.rod.lineWeight,
        closedLength: equipped.rod.closedLength,
        tipDiameter: equipped.rod.tipDiameter,
        buttDiameter: equipped.rod.buttDiameter,
        baseSuccessRate: equipped.rod.baseSuccessRate,
        weightMultiplier: equipped.effects.weightMultiplier,
        catchMultiplier: equipped.effects.catchMultiplier,
        maxLoadKg: equipped.maxLoadKg,
        depthControl: equipped.rod.depthControl ?? 'adjust',
        depthRangeM: equipped.rod.depthRangeM ?? null,
        accessorySlots: ACCESSORY_SLOTS
          .filter((slot) => ACCESSORIES.some((accessory) => accessory.slot === slot.id && accessory.rodTypes.includes(equipped.rod.rodType)))
          .map((slot) => ({ id: slot.id, name: slot.name }))
      },
      equippedBasket: {
        id: equippedBasket.id,
        brand: equippedBasket.brand,
        model: equippedBasket.model,
        name: equippedBasket.name,
        icon: equippedBasket.icon,
        material: equippedBasket.material,
        spec: equippedBasket.spec,
        capacity: equippedBasket.capacity
      },
      inventoryCapacity: state.inventoryCapacity,
      inventory,
      rods,
      baskets,
      items,
      equippedAccessories,
      baits: BAITS.map((bait) => ({ ...bait, quantity: state.ownedBaits[bait.id] ?? 0, equipped: state.equippedBaitId === bait.id })),
      equippedBaitId: state.equippedBaitId ?? null,
      lures: LURES.map((lure) => ({ ...lure, owned: state.ownedLures.includes(lure.id), equipped: state.equippedLureId === lure.id })),
      equippedLureId: state.equippedLureId ?? null,
      ownedBaits: state.ownedBaits,
      ownedLures: state.ownedLures,
      fishingDepthM: state.fishingDepthM ?? null,
      shopCategories,
      shopItems,
      stats: state.stats,
      collection: state.collection,
      encyclopedia: SPECIES.map((species) => {
        const entry = (state.collection || []).find((item) => item.speciesId === species.id)
        return {
          id: species.id,
          name: species.name,
          icon: species.icon,
          baseValue: species.baseValue,
          minWeightGrams: species.minWeightGrams,
          maxWeightGrams: species.maxWeightGrams,
          minLengthCm: species.minLengthCm,
          maxLengthCm: species.maxLengthCm,
          requiredRodId: species.requiredRodId,
          rodName: ROD_TYPE_NAMES[species.requiredRodId] ?? species.requiredRodId,
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
    if (species === undefined) return { ...fish, name: fish.speciesId, icon: 'assets/fish/unknown.svg', value: 0 }
    return {
      ...fish,
      name: species.name,
      icon: species.icon,
      value: salePrice(species, fish)
    }
  }
}
