/**
 * Small JSONL event log + atomic JSON state persistence. State is the primary
 * load; when state.json is missing or unreadable the store replays events.jsonl
 * to rebuild a best-effort state.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { FishingGame, GAME_VERSION } from './game.js'

export class FishingStore {
  constructor(dataDir) {
    this.dir = dataDir
    this.statePath = join(dataDir, 'state.json')
    this.eventsPath = join(dataDir, 'events.jsonl')
    mkdirSync(this.dir, { recursive: true })
  }

  load() {
    try {
      if (existsSync(this.statePath)) {
        const parsed = JSON.parse(readFileSync(this.statePath, 'utf8'))
        if (parsed !== null && typeof parsed === 'object' && parsed.version === GAME_VERSION) {
          return FishingGame.fromState(parsed)
        }
      }
    } catch {
      // Fall through to event-log replay.
    }

    try {
      if (existsSync(this.eventsPath)) {
        return this.replay(readFileSync(this.eventsPath, 'utf8'))
      }
    } catch {
      // Fall through to a fresh game.
    }

    return new FishingGame()
  }

  replay(contents) {
    const game = new FishingGame()
    for (const line of contents.split('\n')) {
      const trimmed = line.trim()
      if (trimmed === '') continue
      let record
      try {
        record = JSON.parse(trimmed)
      } catch {
        continue
      }
      if (record === null || typeof record !== 'object') continue

      if (record.kind === 'event' && record.event?.type === 'TokensConsumed') {
        game.handleTokensConsumed(record.event.amount, record.event.source, record.event.ts)
      } else if (record.kind === 'command' && record.command !== null && typeof record.command === 'object') {
        try {
          game.dispatch(record.command, record.ts)
        } catch {
          // A command that is invalid during replay (for example a duplicate
          // purchase after a crash) is skipped; the event log is best-effort.
        }
      }
    }
    // Settle any available bait into catches so the rebuilt state is current.
    game.tick(Date.now())
    return game
  }

  save(state) {
    const payload = { ...state, savedAt: Date.now() }
    const tmpPath = `${this.statePath}.tmp`
    writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8')
    renameSync(tmpPath, this.statePath)
  }

  appendEvent(record) {
    appendFileSync(this.eventsPath, `${JSON.stringify(record)}\n`, 'utf8')
  }
}
