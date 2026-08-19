window.__ModuleLoader__.load({
  id: "@gitsang/dsh-fishing",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { useCallback, useEffect, useRef, useState } = React;

    // ── CSS ─────────────────────────────────────────────────────────────────
    const css = `
.dshFishing_root{position:absolute;right:16px;bottom:16px;z-index:30;pointer-events:auto;font-family:var(--dsw-font-family-ui,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);color:var(--dsw-alias-label-primary,#1f2329)}
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
.dshFishing_anim{position:relative;height:118px;border-radius:10px;overflow:hidden;background:#0b1b2b;box-shadow:inset 0 -8px 16px rgba(2,132,199,.15)}
.dshFishing_pixelCanvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}
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

    // ── SVG/CSS fishing animation ──────────────────────────────────────────
    const FISH_RARITY_COLORS = {
      common: "#94a3b8",
      uncommon: "#22c55e",
      rare: "#3b82f6",
      epic: "#a855f7",
      legendary: "#f59e0b"
    };

    function FishingAnimation({ lastFish }) {
      const canvasRef = useRef(null);
      const fishColorRef = useRef("#f97316");

      const fishColor =
        lastFish !== null && lastFish !== undefined && FISH_RARITY_COLORS[lastFish.rarity] !== undefined
          ? FISH_RARITY_COLORS[lastFish.rarity]
          : "#f97316";

      useEffect(() => {
        fishColorRef.current = fishColor;
      }, [fishColor]);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas === null) return undefined;
        const ctx = canvas.getContext("2d");
        if (ctx === null) return undefined;
        ctx.imageSmoothingEnabled = false;

        const W = 160;
        const H = 64;
        const waterY = 40;
        const bobberX = 124;
        const bobberBaseY = waterY + 3;
        const rodTipX = 110;
        const rodTipY = waterY - 15;
        let timerId = null;

        const draw = (now) => {
          const t = now / 1000;

          // Sky bands
          ctx.fillStyle = "#0b1b2b";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#0e2638";
          ctx.fillRect(0, 0, W, waterY - 6);
          ctx.fillStyle = "#123a4d";
          ctx.fillRect(0, waterY - 6, W, 6);

          // Stars
          ctx.fillStyle = "rgba(255,255,255,.65)";
          for (let i = 0; i < 14; i += 1) {
            const sx = (i * 37 + 11) % W;
            const sy = (i * 13 + 5) % (waterY - 12);
            ctx.fillRect(sx, sy, 1, 1);
          }

          // Water body
          ctx.fillStyle = "#0e4d66";
          ctx.fillRect(0, waterY, W, H - waterY);

          // Back wave
          ctx.fillStyle = "#116b8b";
          ctx.beginPath();
          ctx.moveTo(0, waterY + 2);
          for (let x = 0; x <= W; x += 1) {
            const y = waterY + 2 + Math.sin(x * 0.13 + t * 1.7) * 1.5;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H);
          ctx.lineTo(0, H);
          ctx.closePath();
          ctx.fill();

          // Front wave
          ctx.fillStyle = "#1b8aae";
          ctx.beginPath();
          ctx.moveTo(0, waterY + 7);
          for (let x = 0; x <= W; x += 1) {
            const y = waterY + 7 + Math.sin(x * 0.17 + t * 2.3 + 1.2) * 1.6;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H);
          ctx.lineTo(0, H);
          ctx.closePath();
          ctx.fill();

          // Ripples around the bobber
          const ripple = (phase) => {
            if (phase <= 0 || phase >= 1) return;
            const rx = 5 + phase * 14;
            const alpha = 1 - phase;
            ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.7).toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(bobberX, waterY + 4, rx, rx * 0.28, 0, 0, Math.PI * 2);
            ctx.stroke();
          };
          const ripplePhase = (t % 2.2) / 2.2;
          ripple(ripplePhase);
          ripple((ripplePhase + 0.5) % 1);

          // Boat hull (drawn over the water, then seated with a waterline stripe)
          ctx.fillStyle = "#7c4a1e";
          ctx.beginPath();
          ctx.moveTo(44, 34);
          ctx.lineTo(86, 34);
          ctx.lineTo(80, 46);
          ctx.lineTo(50, 46);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#3f2a12";
          ctx.fillRect(48, 31, 34, 4);

          ctx.fillStyle = "rgba(27,138,174,.85)";
          ctx.fillRect(48, 43, 32, 2);

          // Fisherman in the boat
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(56, 24, 6, 7);
          ctx.fillStyle = "#f6c78c";
          ctx.fillRect(57, 20, 4, 4);
          ctx.fillStyle = "#d97706";
          ctx.fillRect(55, 18, 8, 2);
          ctx.fillRect(57, 16, 4, 2);

          // Fishing rod held by the fisherman
          ctx.strokeStyle = "#7c4a1e";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(62, 26);
          ctx.quadraticCurveTo(92, 18, rodTipX, rodTipY);
          ctx.stroke();

          const bobPhase = (t % 1.6) / 1.6;
          const bobOffset = Math.sin(bobPhase * Math.PI * 2) * 2;
          const bobberCy = bobberBaseY + bobOffset;

          ctx.strokeStyle = "rgba(220,240,255,.8)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rodTipX, rodTipY);
          ctx.lineTo(bobberX, bobberCy);
          ctx.stroke();

          // Bobber (red top, cream bottom)
          ctx.fillStyle = "#e23b3b";
          ctx.beginPath();
          ctx.arc(bobberX, bobberCy - 2, 3, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = "#f6f1e7";
          ctx.fillRect(bobberX - 3, bobberCy - 1, 6, 4);
          ctx.fillStyle = "#e23b3b";
          ctx.fillRect(bobberX - 1, bobberCy - 6, 2, 4);

          // Fish leap on a quadratic arc
          const cycle = 4.4;
          const p = (t % cycle) / cycle;
          const sx = bobberX - 26;
          const sy = waterY + 3;
          const cx = bobberX - 2;
          const cy = waterY - 26;
          const ex = bobberX + 26;
          const ey = waterY + 3;
          const u = p;
          const fx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cx + u * u * ex;
          const fy = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cy + u * u * ey;
          const ddx = 2 * (1 - u) * (cx - sx) + 2 * u * (ex - cx);
          const ddy = 2 * (1 - u) * (cy - sy) + 2 * u * (ey - cy);
          const angle = Math.atan2(ddy, ddx);
          const fishAlpha =
            p < 0.06 || p > 0.94
              ? Math.max(0, Math.min(1, p / 0.06, (1 - p) / 0.06))
              : 1;

          if (fishAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = fishAlpha;
            ctx.translate(fx, fy);
            ctx.rotate(angle);

            ctx.fillStyle = fishColorRef.current;
            ctx.beginPath();
            ctx.moveTo(-7, 0);
            ctx.lineTo(-12, -5);
            ctx.lineTo(-10, 0);
            ctx.lineTo(-12, 5);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255,.45)";
            ctx.beginPath();
            ctx.ellipse(1, 1.5, 4, 1.6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#0f172a";
            ctx.fillRect(4, -1, 1, 1);
            ctx.restore();
          }

          // Splash pixels where the fish enters/exits the water
          const splash = (phase, startX, startY) => {
            if (phase <= 0 || phase >= 1) return;
            ctx.fillStyle = `rgba(255,255,255,${(1 - phase).toFixed(2)})`;
            for (let i = 0; i < 5; i += 1) {
              const a = (i / 5) * Math.PI * 2;
              const r = 2 + phase * 9;
              ctx.fillRect(
                Math.round(startX + Math.cos(a) * r),
                Math.round(startY + Math.sin(a) * r * 0.5),
                1,
                1
              );
            }
          };
          splash(p < 0.12 ? p / 0.12 : 0, sx, sy);
          splash(p > 0.88 ? (1 - p) / 0.12 : 0, ex, ey);

        };

        const step = () => draw(Date.now());
        step();
        timerId = setInterval(step, 500);
        return () => clearInterval(timerId);
      }, []);

      return React.createElement("canvas", {
        ref: canvasRef,
        className: "dshFishing_pixelCanvas",
        width: 160,
        height: 64
      });
    }

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
      const lastFish = snap.inventory.length > 0 ? snap.inventory[snap.inventory.length - 1] : null;

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
          React.createElement(FishingAnimation, { lastFish }),
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
