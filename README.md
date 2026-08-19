# @gitsang/dsh-fishing

A floating fishing game for the deepseek-harness **web** surface.

While you use the agent, token usage is collected as bait: every 1M consumed
tokens add 1 bait. Each cast consumes 1 bait, so the game casts the equipped
rod once per 1M tokens and catches a fish. Fish can be sold for coins; coins
buy and upgrade rods. Rods are divided into hand rods, sea rods, and lure rods,
and each type can catch different fish. Upgrading a rod increases the chance of
landing a fish and raises the maximum weight of caught fish.

The widget lives in the bottom-left corner of the web UI (`shell.overlay`), so
it floats above the conversation and can be collapsed to a small bobber.

## How it works

- **Host half** (`src/index.js`): subscribes to `session/event`, reads
  `usage` from `assistant/message` and `compaction/summary` events, and feeds
  the game core. It exposes two HTTP endpoints:
  - `GET /fishing/snapshot` — current game snapshot JSON.
  - `POST /fishing/command` — send a command such as `{"type":"SellFish","fishId":"..."}`.
- **Game core** (`src/game.js`): species, rods, timed catch flow,
  catch/sell/upgrade rules. Each cast first enters a random 0-60s waiting
  stage, then a random 0-60s reeling stage; stage flavor/result events are read
  from the `FISHING_EVENTS` config table. It follows the same core model as the
  pi-fishing design doc, but does not import or depend on pi-fishing.
- **Browser half** (`src/client.js`): a `dsh.client` web plugin that registers
  a React widget into the layout's `shell.overlay` slot and polls the snapshot
  endpoint.

## Install into a web profile

Add this package to the web profile's dependencies and bundles, for example in
`~/.dsh/profiles/web/package.json`:

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

Then install and launch:

```bash
cd ~/.dsh/profiles/web
pnpm install
dsh web
```

The host plugin's row is inserted by `cordis.patch.yml`; the browser plugin is
discovered automatically from the package's `dsh.client` declaration.

## State

State is stored under `$DSH_HOME/storages/dsh-fishing/` (default
`~/.dsh/storages/dsh-fishing/`):

- `state.json` — atomic snapshot, debounced writes.
- `events.jsonl` — append-only event/command log, used to rebuild best-effort
  state when `state.json` is missing or unreadable.

## Commands

The web widget exposes the common actions in its panel. The raw HTTP API
accepts these command types:

- `SellFish` / `SellAllFish`
- `BuyRod` / `UpgradeRod` / `EquipRod`
- `BuyBasket` / `EquipBasket`
- `BuyAccessory` / `EquipAccessory` / `UnequipAccessory`

## Development notes

- The game tick interval is 500ms; the browser polls the snapshot every 500ms.
- Token count formula: `inputTokens + outputTokens + cacheReadTokens +
  cacheWriteTokens` (falling back to `input/output/cacheRead/cacheWrite` field
  names when present).
- The widget is intentionally self-contained: the client only talks to
  `/fishing/*`; it does not import any pi-fishing code.
