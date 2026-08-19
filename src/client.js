window.__ModuleLoader__.load({
  id: "@gitsang/dsh-fishing",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { useCallback, useEffect, useState } = React;

    // ── CSS ─────────────────────────────────────────────────────────────────
    const css = `
.dshFishing_root{position:absolute;left:16px;bottom:16px;z-index:30;pointer-events:auto;font-family:var(--dsw-font-family-ui,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);color:var(--dsw-alias-label-primary,#1f2329)}
.dshFishing_bobber{width:46px;height:46px;border-radius:50%;background:var(--dsw-alias-bg-elevated,#ffffff);border:1px solid var(--dsw-alias-border-l2,#e5e6eb);box-shadow:0 8px 24px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;transition:transform .12s ease}
.dshFishing_bobber:hover{transform:translateY(-2px)}
.dshFishing_bobberBadge{position:absolute;right:-2px;bottom:-2px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:var(--dsw-alias-state-business-primary,#3b82f6);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.dshFishing_panel{width:320px;max-height:min(560px,calc(100vh - 32px));overflow:auto;background:var(--dsw-alias-bg-elevated,#ffffff);border:1px solid var(--dsw-alias-border-l2,#e5e6eb);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.20);padding:12px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box}
.dshFishing_header{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dshFishing_title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:6px}
.dshFishing_close{border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#8a919f);cursor:pointer;font-size:14px;line-height:1;padding:4px;border-radius:6px}
.dshFishing_close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#1f2329)}
.dshFishing_bar{height:8px;border-radius:999px;background:var(--dsw-alias-interactive-bg,#f0f1f4);overflow:hidden}
.dshFishing_barFill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--dsw-alias-state-business-primary,#3b82f6),var(--dsw-alias-state-business-primary,#60a5fa));transition:width .25s ease}
.dshFishing_row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;line-height:1.4}
.dshFishing_muted{color:var(--dsw-alias-label-tertiary,#8a919f)}
.dshFishing_event{min-height:18px;font-size:12px;color:var(--dsw-alias-label-secondary,#4e5969);background:var(--dsw-specific-tip,var(--dsw-alias-interactive-bg,#f7f8fa));border-radius:8px;padding:6px 8px;white-space:pre-wrap;word-break:break-all}
.dshFishing_anim{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.35;white-space:pre;background:var(--dsw-specific-tip,var(--dsw-alias-interactive-bg,#f7f8fa));border-radius:10px;padding:8px;text-align:center;overflow:hidden}
.dshFishing_section{display:flex;flex-direction:column;gap:6px}
.dshFishing_sectionTitle{font-size:12px;font-weight:700;color:var(--dsw-alias-label-secondary,#4e5969)}
.dshFishing_fishRow{display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 6px;border:1px solid var(--dsw-alias-border-l1,#eef0f3);border-radius:8px;background:var(--dsw-alias-bg-base,#ffffff)}
.dshFishing_fishMain{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshFishing_btn{border:1px solid var(--dsw-alias-border-l2,#d8dbe2);background:var(--dsw-alias-bg-base,#ffffff);color:var(--dsw-alias-label-primary,#1f2329);border-radius:7px;padding:3px 8px;font-size:12px;cursor:pointer;white-space:nowrap}
.dshFishing_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}
.dshFishing_btn:disabled{opacity:.45;cursor:default}
.dshFishing_primary{background:var(--dsw-alias-state-business-primary,#3b82f6);border-color:transparent;color:#fff}
.dshFishing_primary:hover:not(:disabled){background:var(--dsw-alias-state-business-primary-hover,#2f6fe0)}
.dshFishing_details{border:1px solid var(--dsw-alias-border-l1,#eef0f3);border-radius:8px;padding:4px 6px}
.dshFishing_summary{font-size:12px;font-weight:700;cursor:pointer;color:var(--dsw-alias-label-secondary,#4e5969);padding:2px 0}
.dshFishing_list{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.dshFishing_empty{font-size:12px;color:var(--dsw-alias-label-caption,#a8adb8);padding:4px 2px}
.dshFishing_error{font-size:12px;color:var(--dsw-alias-state-error-primary,#d93026);padding:4px 2px}
`;
    const tagId = "@gitsang/dsh-fishing/style.css";
    if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "@gitsang/dsh-fishing";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // ── 8-frame ASCII/emoji fishing animation ──────────────────────────────
    const FRAMES = [
      ["    🎣", "     |", "  ~~~~~", "  ~~~~~", "  ~~~~~"],
      ["    🎣", "     |", "  ~~~~~", "  ~ o ~", "  ~~~~~"],
      ["    🎣", "     |", "  ~~~~~", "  ~><> ~", "  ~~~~~"],
      ["    🎣", "     \\", "  ~~~~~", "   ><>", "  ~~~~~"],
      ["    🎣", "     \\", "  ~~~~~", "   ><>", "   💦"],
      ["    🎣", "     |", "  ~~~~~", "   🐟", "   💦"],
      ["    🎣", "     |", "  ~~~~~", "   🧺", "  ~~~~~"],
      ["    🎣", "     |", "  ~~~~~", "  ~~~~~", "  ~~~~~"]
    ];

    function formatTokens(value) {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
      return String(value);
    }

    function formatKg(grams) {
      return `${(grams / 1000).toFixed(2)}kg`;
    }

    function FishRow({ fish, onSell, disabled }) {
      return React.createElement(
        "div",
        { className: "dshFishing_fishRow" },
        React.createElement("span", null, fish.emoji),
        React.createElement(
          "span",
          { className: "dshFishing_fishMain" },
          `${fish.name} ${formatKg(fish.weightGrams)} ${fish.lengthCm}cm · ${fish.rating}分 · ${fish.value}G`
        ),
        React.createElement(
          "button",
          { className: "dshFishing_btn dshFishing_primary", disabled, onClick: () => onSell(fish.id) },
          "卖"
        )
      );
    }

    function FishingWidget() {
      const [snap, setSnap] = useState(null);
      const [expanded, setExpanded] = useState(true);
      const [frame, setFrame] = useState(0);
      const [busy, setBusy] = useState(false);
      const [loadError, setLoadError] = useState(null);
      const [actionError, setActionError] = useState(null);

      useEffect(() => {
        let disposed = false;
        const poll = async () => {
          try {
            const res = await fetch("/fishing/snapshot", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!disposed && data.ok) {
              setSnap(data.snapshot);
              setLoadError(null);
            }
          } catch (error) {
            if (!disposed) setLoadError(error instanceof Error ? error.message : String(error));
          }
        };
        poll();
        const timer = setInterval(poll, 500);
        return () => {
          disposed = true;
          clearInterval(timer);
        };
      }, []);

      useEffect(() => {
        if (!expanded) return undefined;
        const timer = setInterval(() => setFrame((value) => (value + 1) % FRAMES.length), 200);
        return () => clearInterval(timer);
      }, [expanded]);

      const send = useCallback(async (command) => {
        setBusy(true);
        setActionError(null);
        try {
          const res = await fetch("/fishing/command", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(command)
          });
          const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
          if (data.ok) {
            setSnap(data.snapshot);
            return true;
          }
          setActionError(data.error || "命令执行失败");
          return false;
        } catch (error) {
          setActionError(error instanceof Error ? error.message : String(error));
          return false;
        } finally {
          setBusy(false);
        }
      }, []);

      if (!expanded) {
        return React.createElement(
          "div",
          { className: "dshFishing_root" },
          React.createElement(
            "button",
            {
              className: "dshFishing_bobber",
              title: "打开钓鱼游戏",
              onClick: () => setExpanded(true)
            },
            "🎣",
            snap !== null
              ? React.createElement(
                  "span",
                  { className: "dshFishing_bobberBadge" },
                  snap.inventory.length > 0 ? snap.inventory.length : "🎣"
                )
              : null
          )
        );
      }

      if (snap === null) {
        return React.createElement(
          "div",
          { className: "dshFishing_root" },
          React.createElement(
            "div",
            { className: "dshFishing_panel" },
            React.createElement(
              "div",
              { className: "dshFishing_header" },
              React.createElement("span", { className: "dshFishing_title" }, "🎣 钓鱼游戏"),
              React.createElement("button", { className: "dshFishing_close", onClick: () => setExpanded(false) }, "—")
            ),
            loadError !== null
              ? React.createElement("div", { className: "dshFishing_error" }, `无法连接游戏服务：${loadError}`)
              : React.createElement("div", { className: "dshFishing_muted" }, "加载中…")
          )
        );
      }

      const baitPercent = Math.max(0, Math.min(100, Math.round((snap.pendingBaitTokens / snap.baitTokensPerCast) * 100)));
      const frameLines = FRAMES[frame % FRAMES.length].join("\n");

      return React.createElement(
        "div",
        { className: "dshFishing_root" },
        React.createElement(
          "div",
          { className: "dshFishing_panel" },
          React.createElement(
            "div",
            { className: "dshFishing_header" },
            React.createElement(
              "span",
              { className: "dshFishing_title" },
              "🎣 钓鱼游戏"
            ),
            React.createElement(
              "button",
              { className: "dshFishing_close", title: "收起", onClick: () => setExpanded(false) },
              "—"
            )
          ),
          React.createElement(
            "div",
            { className: "dshFishing_row" },
            React.createElement(
              "span",
              null,
              `鱼饵 ${formatTokens(snap.pendingBaitTokens)}/${formatTokens(snap.baitTokensPerCast)}`
            ),
            React.createElement(
              "span",
              null,
              `金币 ${snap.coins}`
            )
          ),
          React.createElement(
            "div",
            { className: "dshFishing_bar" },
            React.createElement("div", { className: "dshFishing_barFill", style: { width: `${baitPercent}%` } })
          ),
          React.createElement(
            "div",
            { className: "dshFishing_row" },
            React.createElement("span", null, `${snap.equippedRod.emoji} ${snap.equippedRod.name} Lv.${snap.equippedRod.level}`),
            React.createElement(
              "span",
              { className: "dshFishing_muted" },
              `鱼篓 ${snap.inventory.length}/${snap.inventoryCapacity} · 鱼缸 ${snap.aquariums.length}`
            )
          ),
          React.createElement("pre", { className: "dshFishing_anim" }, frameLines),
          React.createElement("div", { className: "dshFishing_event" }, snap.lastEventText || "等待鱼汛…"),
          actionError !== null
            ? React.createElement("div", { className: "dshFishing_error" }, actionError)
            : null,
          React.createElement(
            "div",
            { className: "dshFishing_section" },
            React.createElement(
              "div",
              { className: "dshFishing_row" },
              React.createElement("span", { className: "dshFishing_sectionTitle" }, `鱼篓 (${snap.inventory.length}/${snap.inventoryCapacity})`),
              React.createElement(
                "button",
                { className: "dshFishing_btn", disabled: busy || snap.inventory.length === 0, onClick: () => send({ type: "SellAllFish" }) },
                "卖全部"
              )
            ),
            snap.inventory.length === 0
              ? React.createElement("div", { className: "dshFishing_empty" }, "鱼篓空空如也，等待抛竿…")
              : React.createElement(
                  "div",
                  { className: "dshFishing_list" },
                  snap.inventory.map((fish) =>
                    React.createElement(FishRow, {
                      key: fish.id,
                      fish,
                      disabled: busy,
                      onSell: (fishId) => send({ type: "SellFish", fishId })
                    })
                  )
                )
          ),
          React.createElement(
            "details",
            { className: "dshFishing_details" },
            React.createElement("summary", { className: "dshFishing_summary" }, "🎣 鱼竿"),
            React.createElement(
              "div",
              { className: "dshFishing_list" },
              snap.rods.map((rod) =>
                React.createElement(
                  "div",
                  { key: rod.id, className: "dshFishing_row" },
                  React.createElement(
                    "span",
                    null,
                    `${rod.emoji} ${rod.name}${rod.equipped ? " · 装备中" : ""}${rod.owned ? ` Lv.${rod.level}` : ""}`
                  ),
                  rod.owned
                    ? React.createElement(
                        "div",
                        { style: { display: "flex", gap: "4px" } },
                        !rod.equipped
                          ? React.createElement(
                              "button",
                              { className: "dshFishing_btn", disabled: busy, onClick: () => send({ type: "EquipRod", rodId: rod.id }) },
                              "装备"
                            )
                          : null,
                        rod.level < rod.maxLevel
                          ? React.createElement(
                              "button",
                              { className: "dshFishing_btn", disabled: busy, onClick: () => send({ type: "UpgradeRod", rodId: rod.id }) },
                              `升级 ${rod.upgradeCost}G`
                            )
                          : null
                      )
                    : React.createElement(
                        "button",
                        { className: "dshFishing_btn", disabled: busy, onClick: () => send({ type: "BuyRod", rodId: rod.id }) },
                        `购买 ${rod.basePrice}G`
                      )
                )
              )
            )
          ),
          React.createElement(
            "details",
            { className: "dshFishing_details" },
            React.createElement("summary", { className: "dshFishing_summary" }, "🐠 鱼缸"),
            React.createElement(
              "div",
              { className: "dshFishing_list" },
              snap.aquariumsCatalog.map((aquarium) =>
                React.createElement(
                  "div",
                  { key: aquarium.id, className: "dshFishing_row" },
                  React.createElement(
                    "span",
                    null,
                    `${aquarium.emoji} ${aquarium.name}${aquarium.owned ? ` ${aquarium.capacity}/${aquarium.maxCapacity}格` : ""}`
                  ),
                  aquarium.owned
                    ? aquarium.capacity < aquarium.maxCapacity
                      ? React.createElement(
                          "button",
                          { className: "dshFishing_btn", disabled: busy, onClick: () => send({ type: "UpgradeAquarium", aquariumId: aquarium.id }) },
                          `扩容 ${aquarium.upgradeCost}G`
                        )
                      : React.createElement("span", { className: "dshFishing_muted" }, "已满")
                    : React.createElement(
                        "button",
                        { className: "dshFishing_btn", disabled: busy, onClick: () => send({ type: "BuyAquarium", aquariumId: aquarium.id }) },
                        `购买 ${aquarium.basePrice}G`
                      )
                )
              )
            )
          )
        )
      );
    }

    // ── client plugin exports ──────────────────────────────────────────────
    const inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("shell.overlay", () =>
        ctx.slots.register(
          {
            name: "shell.overlay",
            id: "dsh-fishing",
            order: 100
          },
          FishingWidget
        )
      );
    }

    exports.FishingWidget = FishingWidget;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
