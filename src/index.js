/**
 * dsh-fishing host plugin.
 *
 * - Subscribes to `session/event` and converts assistant/compaction token
 *   usage into stamina (1M tokens = 1 stamina).
 * - Runs the fishing game core on a 500ms tick.
 * - Persists state under `$DSH_HOME/storages/dsh-fishing/`.
 * - Serves `/fishing/snapshot` (GET) and `/fishing/command` (POST) for the
 *   browser client widget.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { FishingGame, tokenAmountFromUsage } from './game.js'
import { FishingStore } from './store.js'

export const name = 'dsh-fishing'
export const inject = ['webServer']

const TICK_INTERVAL_MS = 500
const SAVE_DEBOUNCE_MS = 1000

function dataDir() {
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(dshHome, 'storages', 'dsh-fishing')
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body)
  })
  res.end(body)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1024 * 1024) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

export function apply(ctx) {
  const store = new FishingStore(dataDir())
  const game = store.load()

  let saveTimer = null

  const saveNow = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    try {
      store.save(game.getState())
    } catch (error) {
      ctx.logger.warn(`dsh-fishing: save failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const scheduleSave = () => {
    if (saveTimer !== null) return
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveNow()
    }, SAVE_DEBOUNCE_MS)
  }

  const recordTokens = (amount, source, ts) => {
    if (!(amount > 0)) return
    game.handleTokensConsumed(amount, source, ts)
    store.appendEvent({ kind: 'event', event: { type: 'TokensConsumed', amount, source, ts } })
    scheduleSave()
  }

  ctx.effect(() => {
    const off = ctx.on('session/event', (_session, event) => {
      if (event === null || typeof event !== 'object' || event.data === null || event.data === undefined) return
      const usage = event.data.usage
      if (usage === null || typeof usage !== 'object') return

      if (event.type === 'assistant/message') {
        recordTokens(tokenAmountFromUsage(usage), 'msg', event.time ?? Date.now())
      } else if (event.type === 'compaction/summary') {
        recordTokens(tokenAmountFromUsage(usage), 'compact', event.time ?? Date.now())
      }
    })
    return () => off()
  }, 'dsh-fishing: session token listener')

  ctx.effect(() => {
    const timer = setInterval(() => {
      const effects = game.tick(Date.now())
      if (effects.length > 0) scheduleSave()
    }, TICK_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      saveNow()
    }
  }, 'dsh-fishing: tick timer')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/fishing/snapshot',
    handler: (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      sendJson(res, 200, { ok: true, snapshot: game.snapshot(Date.now()) })
    }
  }), 'dsh-fishing: snapshot route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/fishing/command',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }

      let command
      try {
        command = await readJsonBody(req)
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
        return
      }

      try {
        const effects = game.dispatch(command, Date.now())
        store.appendEvent({ kind: 'command', command, ts: Date.now() })
        scheduleSave()
        sendJson(res, 200, { ok: true, effects, snapshot: game.snapshot(Date.now()) })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : '命令执行失败' })
      }
    }
  }), 'dsh-fishing: command route')
}
