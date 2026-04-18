(function () {
    const gw = document.getElementById("gw");
    const cv = document.getElementById("c");
    const ctx = cv.getContext("2d");
    const scoreEl = document.getElementById("score");
    const overlay = document.getElementById("overlay");
    const card = document.getElementById("card");
    perfectEl = document.getElementById("perfect"),
        multiplierContainer = document.getElementById("multiplier-container"),
        multiplierBadge = document.getElementById("multiplier-badge"),
        multiplierTimeEl = document.getElementById("multiplier-time"),
        kofiBtn = document.getElementById("kofi-btn");

    let W,
        H,
        stack = [],
        mov = {},
        score = 0,
        running = false,
        raf,
        dir = 1,
        spd = 3,
        perfectTimeout,
        soundEnabled = true,
        totalCoins = parseInt(localStorage.getItem('slab_rush_coins') || '0'),
        totalGems = parseInt(localStorage.getItem('slab_rush_gems') || '0'),
        sessionCoins = 0,
        sessionGems = 0,
        lastSpeedScale = 0,
        multiplierTime = 0,
        multiplierValue = 1,
        consecutivePerfects = 0,
        lastLoopTime = 0;

    const SKINS = [
        { id: 'classic', name: 'Classic Teal', colors: ["#5ecfbe", "#4bbdac", "#3aab9a", "#2b9888", "#1d8576", "#117165", "#085e54"], price: 0 },
        { id: 'neon', name: 'Cyber Neon', colors: ["#ff2d55", "#ff3b30", "#ff9500", "#ffcc00", "#4cd964", "#5ac8fa", "#007aff"], price: 500 },
        { id: 'sunset', name: 'Sunset Vibe', colors: ["#ff9500", "#ff5e3a", "#ff2d55", "#c644fc", "#5856d6", "#007aff", "#5ac8fa"], price: 1000 },
        { id: 'monochrome', name: 'Noir Mode', colors: ["#ffffff", "#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040"], price: 2000 },
        {
            id: 'hologram', name: 'Holographic', price: 50, priceType: 'gem',
            colors: ["#7678ed", "#ffffff", "#a2d2ff", "#ffffff", "#7678ed"],
            bg: "repeating-linear-gradient(45deg, rgba(26, 27, 46, 0.9) 0, rgba(26, 27, 46, 0.9) 20px, rgba(37, 39, 77, 0.9) 20px, rgba(37, 39, 77, 0.9) 40px)"
        },
        {
            id: 'circuit', name: 'Circuit', price: 75, priceType: 'gem',
            colors: ["#00ff88", "#00d4ff", "#00ff88", "#00d4ff"],
            bg: "radial-gradient(rgba(0, 255, 136, 0.15) 0.5px, transparent 0.5px), radial-gradient(rgba(0, 255, 136, 0.15) 0.5px, #001219 0.5px)",
            bgSize: "30px 30px",
            bgPos: "0 0, 15px 15px"
        },
        {
            id: 'obsidian', name: 'Obsidian Gold', price: 100, priceType: 'gem',
            colors: ["#222", "#333", "#ffd700", "#222", "#ffd700"],
            bg: "radial-gradient(rgba(255, 215, 0, 0.1) 0.8px, #000 0.8px)",
            bgSize: "20px 20px"
        },
        {
            id: 'carbon', name: 'Carbon Fiber', price: 300, priceType: 'gem',
            colors: ["#1a1a1a", "#2a2a2a", "#333", "#2a2a2a", "#1a1a1a"],
            themeClass: 'carbon-theme'
        },
        {
            id: 'frost', name: 'Frost Nova', price: 200, priceType: 'gem',
            colors: ["#0c4a6e", "#0ea5e9", "#7dd3fc", "#0ea5e9", "#0c4a6e"],
            bg: "repeating-linear-gradient(0deg, rgba(14, 165, 233, 0.03), rgba(14, 165, 233, 0.03) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(14, 165, 233, 0.03), rgba(14, 165, 233, 0.03) 1px, #081b2b 1px, #081b2b 20px)"
        },
        {
            id: 'aether', name: 'Aether', price: 250, priceType: 'gem',
            colors: ["rgba(255, 255, 255, 0.7)", "rgba(186, 230, 253, 0.6)", "rgba(125, 211, 252, 0.5)"],
            bg: "radial-gradient(circle at 50% 0, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 15%, transparent 16%), radial-gradient(circle at 50% 100%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 15%, transparent 16%), radial-gradient(circle at 0 50%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 15%, transparent 16%), radial-gradient(circle at 100% 50%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 15%, transparent 16%)",
            bgSize: "60px 60px",
            background: "#0c4a6e"
        }
    ];

    const UPGRADES = [
        {
            id: 'coin_boost',
            name: 'Coin Booster',
            type: 'gem',
            levels: [
                { id: 'coin_boost_1', price: 100, effect: 1.2, label: 'LVL 1 (1.2x)' },
                { id: 'coin_boost_2', price: 250, effect: 1.5, label: 'LVL 2 (1.5x)' },
                { id: 'coin_boost_3', price: 500, effect: 2.0, label: 'LVL 3 (2.0x)' }
            ]
        },
        {
            id: 'speed_stabilizer',
            name: 'Speed Stabilizer',
            type: 'gem',
            levels: [
                { id: 'speed_stab_1', price: 150, effect: 0.8, label: 'LVL 1 (-20%)' },
                { id: 'speed_stab_2', price: 300, effect: 0.6, label: 'LVL 2 (-40%)' }
            ]
        },
        {
            id: 'time_machine',
            name: 'Time Machine',
            type: 'gem',
            price: 50,
            consumable: true,
            description: 'Rewind 3 blocks after failure'
        }
    ];

    let currentSkinId = localStorage.getItem('slab_rush_current_skin') || 'classic';
    let ownedSkins = JSON.parse(localStorage.getItem('slab_rush_owned_skins') || '["classic"]');
    let ownedUpgrades = JSON.parse(localStorage.getItem('slab_rush_owned_upgrades') || '[]');
    let timeMachineCount = parseInt(localStorage.getItem('slab_rush_time_machine_count') || '0');
    let hasUsedRevive = false;

    function getActivePalette() {
        const skin = SKINS.find(s => s.id === currentSkinId) || SKINS[0];
        return skin.colors;
    }

    function updateRewardDisplay() {
        document.getElementById("coin-val").textContent = Math.floor(totalCoins);
        document.getElementById("gem-val").textContent = Math.floor(totalGems);

        const boostBadge = document.getElementById("active-boost-badge");
        const boosterLevel = getCurrentBoosterLevel();
        if (boosterLevel > 0) {
            const boostVal = UPGRADES[0].levels[boosterLevel - 1].effect;
            boostBadge.textContent = boostVal + "x";
            boostBadge.classList.add("active");
        } else {
            boostBadge.classList.remove("active");
        }
    }

    function getCurrentBoosterLevel() {
        if (ownedUpgrades.includes('coin_boost_3')) return 3;
        if (ownedUpgrades.includes('coin_boost_2')) return 2;
        if (ownedUpgrades.includes('coin_boost_1')) return 1;
        return 0;
    }

    function getSpeedStabilizerLevel() {
        if (ownedUpgrades.includes('speed_stab_2')) return 2;
        if (ownedUpgrades.includes('speed_stab_1')) return 1;
        return 0;
    }

    const chime = new Audio("assets/audio/chime_sound.mp3");
    const gameOverSound = new Audio("assets/audio/game_over.mp3");
    const swooshSound = new Audio("assets/audio/swoosh.mp3");
    chime.volume = 0.5;
    gameOverSound.volume = 0.5;
    swooshSound.volume = 0.5;

    const ICON_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const ICON_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

    function updateSoundIcon() {
        document.getElementById("sound-btn").innerHTML = soundEnabled ? ICON_ON : ICON_OFF;
    }

    const BLOCK_H = 22,
        TILT = 8;
    function resize() {
        W = gw.clientWidth;
        H = gw.clientHeight;
        cv.width = W;
        cv.height = H;
    }

    function col(i) {
        const p = getActivePalette();
        return p[i % p.length];
    }

    function shade(color, a) {
        let r, g, b, alpha = 1.0;
        if (color.startsWith('#')) {
            r = parseInt(color.slice(1, 3), 16);
            g = parseInt(color.slice(3, 5), 16);
            b = parseInt(color.slice(5, 7), 16);
        } else if (color.startsWith('rgba')) {
            const parts = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (parts) {
                r = parseInt(parts[1]);
                g = parseInt(parts[2]);
                b = parseInt(parts[3]);
                alpha = parts[4] ? parseFloat(parts[4]) : 1.0;
            } else {
                return color;
            }
        } else {
            return color;
        }
        r = Math.max(0, Math.min(255, r + a));
        g = Math.max(0, Math.min(255, g + a));
        b = Math.max(0, Math.min(255, b + a));
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function drawBlock(x, y, w, h, color) {
        // Front face
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        // Right face
        ctx.beginPath();
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w + TILT, y - TILT);
        ctx.lineTo(x + w + TILT, y + h - TILT);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fillStyle = shade(color, -28);
        ctx.fill();
        // Top face
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w + TILT, y - TILT);
        ctx.lineTo(x + TILT, y - TILT);
        ctx.closePath();
        ctx.fillStyle = shade(color, 28);
        ctx.fill();
    }

    function playChime() {
        if (soundEnabled) {
            chime.currentTime = 0;
            chime.play().catch(() => { });
        }
    }

    function startGame() {
        overlay.style.display = "none";
        if (kofiBtn) kofiBtn.style.display = "none";
        document.getElementById("coin-counter").style.display = "flex";
        document.getElementById("gem-counter").style.display = "flex";
        score = 0;
        sessionCoins = 0;
        sessionGems = 0;
        lastSpeedScale = 0;
        scoreEl.textContent = "0";
        spd = 3;
        stack = [];
        dir = 1;
        updateRewardDisplay();
        multiplierTime = 0;
        multiplierValue = 1;
        consecutivePerfects = 0;
        lastLoopTime = performance.now();
        hasUsedRevive = false;
        let bw = Math.min(W * 0.52, 210);
        const bx = (W - bw) / 2;
        const by = H - BLOCK_H;
        for (let i = 0; i < 9; i++) {
            stack.push({ x: bx, y: by - i * BLOCK_H, w: bw, color: col(i) });
        }
        spawnMov();
        running = true;
        if (raf) cancelAnimationFrame(raf);
        requestAnimationFrame(loop);
    }

    function spawnMov() {
        const t = stack[stack.length - 1];
        mov = {
            x: dir > 0 ? -t.w - TILT : W + TILT,
            y: t.y - BLOCK_H,
            w: t.w,
            color: col(stack.length),
        };
    }

    function showPerfect() {
        clearTimeout(perfectTimeout);
        perfectEl.style.opacity = "1";
        perfectTimeout = setTimeout(
            () => (perfectEl.style.opacity = "0"),
            700
        );
    }

    function place() {
        if (!running) return;
        const t = stack[stack.length - 1];
        const l = Math.max(mov.x, t.x);
        const r = Math.min(mov.x + mov.w, t.x + t.w);
        const ov = r - l;
        if (ov <= 0) {
            endGame();
            return;
        }
        if (Math.abs(ov - t.w) < 5) {
            mov.x = t.x;
            mov.w = t.w;
            showPerfect();

            if (multiplierTime <= 0) {
                multiplierTime = 5;
                multiplierValue = 2;
                consecutivePerfects = 1;
            } else {
                consecutivePerfects++;
                multiplierValue *= 2;
                multiplierTime += 1.5;
            }
            multiplierBadge.textContent = multiplierValue + "X";
            multiplierBadge.classList.remove("multiplier-bump");
            void multiplierBadge.offsetWidth;
            multiplierBadge.classList.add("multiplier-bump");
        } else {
            consecutivePerfects = 0;
        }

        const trimmed = {
            x: Math.max(mov.x, t.x),
            y: mov.y,
            w: Math.min(mov.x + mov.w, t.x + t.w) - Math.max(mov.x, t.x),
            color: mov.color,
        };
        stack.push(trimmed);
        score++;
        scoreEl.textContent = score;
        playChime();

        // Speed scaling with Stabilizer
        const stabLevel = getSpeedStabilizerLevel();
        const stabEffect = stabLevel > 0 ? UPGRADES[1].levels[stabLevel - 1].effect : 1.0;
        const currentScale = Math.floor(score / (10 / stabEffect));

        if (currentScale > lastSpeedScale) {
            if (soundEnabled) swooshSound.play().catch(() => { });
            lastSpeedScale = currentScale;
        }
        spd += 0.5 * currentScale;
        spd = Math.min(spd, 16);

        // Reward system with Booster
        let gain = 1 * (score / 5);
        if (multiplierTime > 0) {
            gain *= multiplierValue;
        }
        const boosterLevel = getCurrentBoosterLevel();
        if (boosterLevel > 0) {
            gain *= UPGRADES[0].levels[boosterLevel - 1].effect;
        }
        sessionCoins += gain;
        totalCoins += gain;
        updateRewardDisplay();

        dir *= -1;
        scrollUp();
        spawnMov();
    }


    function scrollUp() {
        const ty = stack[stack.length - 1].y;
        const thresh = H * 0.36;
        if (ty < thresh) stack.forEach((b) => (b.y += thresh - ty));
    }

    function endGame() {
        running = false;
        cancelAnimationFrame(raf);

        sessionGems = Math.floor(score / 10);
        totalGems += sessionGems;

        localStorage.setItem('slab_rush_coins', Math.floor(totalCoins));
        localStorage.setItem('slab_rush_gems', Math.floor(totalGems));

        if (soundEnabled) gameOverSound.play().catch(() => { });

        const canRevive = timeMachineCount > 0 && !hasUsedRevive && stack.length > 5;
        const isSmallScreen = window.innerWidth <= 400;

        card.innerHTML = `
            <h2>Slab Rush!</h2>
            <div class="big">${score}</div>
            <div class="sub">blocks stacked</div>
            <div style="margin: 10px 0; font-weight: 400; color: #ffd700; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffd700" stroke="#b8860b" stroke-width="1.5">
                <circle cx="12" cy="12" r="9"></circle>
                <text x="50%" y="54%" text-anchor="middle" font-size="10" dy=".3em" fill="#b8860b" font-weight="bold">$</text>
              </svg>
              <span>+${Math.floor(sessionCoins)}${isSmallScreen ? '' : ' earned'}</span>
              ${isSmallScreen ? `<span style="color: rgba(255,255,255,0.3); margin: 0 2px;">·</span>
              <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Total: ${Math.floor(totalCoins)}</span>` : ''}
            </div>
            <div style="margin: 2px 0; font-weight: 400; color: #00ff88; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#00ff88" stroke="#008844" stroke-width="1.5">
                <path d="M6 3L2 9l10 12L22 9l-4-6H6z"></path>
                <path d="M2 9h20M6 3l4 6m8-6l-4 6m-6 0l4 12m4-12l-4 12"></path>
              </svg>
              <span>+${sessionGems}${isSmallScreen ? '' : ' gems earned'}</span>
              ${isSmallScreen ? `<span style="color: rgba(255,255,255,0.3); margin: 0 2px;">·</span>
              <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Total: ${Math.floor(totalGems)}</span>` : ''}
            </div>
            ${canRevive ? `
                <button id="revive-btn">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                    </svg>
                    REWIND (${timeMachineCount})
                </button>
            ` : ''}
            <button id="play-btn">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"></path>
                </svg>
                Play Again
            </button>
            <button id="shop-btn-end" class="secondary-btn">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Shop
            </button>
            <div class="support-msg">
                Enjoying the game? <a href="https://ko-fi.com/naik_kaushik" target="_blank">Buy me a coffee ☕️</a>
            </div>
          `;
        overlay.style.display = "flex";
        if (kofiBtn) kofiBtn.style.display = "flex";
        if (isSmallScreen) {
            document.getElementById("coin-counter").style.display = "none";
            document.getElementById("gem-counter").style.display = "none";
        }

        const playBtn = document.getElementById("play-btn");
        playBtn.disabled = true;
        playBtn.style.opacity = "0.4";
        playBtn.style.pointerEvents = "none";
        setTimeout(() => {
            playBtn.disabled = false;
            playBtn.style.opacity = "1";
            playBtn.style.pointerEvents = "auto";
        }, 1500);
        playBtn.addEventListener("click", startGame);
        document.getElementById("shop-btn-end").addEventListener("click", openShop);
        if (canRevive) {
            document.getElementById("revive-btn").addEventListener("click", rewindGame);
        }
        const supportLink = document.querySelector(".support-msg a");
        if (supportLink) {
            supportLink.addEventListener("click", (e) => {
                e.preventDefault();
                document.getElementById("kofi-modal").style.display = "flex";
            });
        }
    }

    function rewindGame() {
        if (timeMachineCount <= 0) return;
        timeMachineCount--;
        hasUsedRevive = true;
        localStorage.setItem('slab_rush_time_machine_count', timeMachineCount);

        // Rewind stack by 3
        stack = stack.slice(0, Math.max(1, stack.length - 3));
        score = stack.length - 1; // Assuming initial stack is 9, wait...
        // Actually score was incremented per place. Initial stack has 9 blocks but score is 0.
        // So score = stack.length - 9? No, let's just use the score calculation that was there.
        // Looking at startGame: stack has 9 blocks, score starts at 0.
        score = Math.max(0, stack.length - 9);
        scoreEl.textContent = score;

        overlay.style.display = "none";
        if (kofiBtn) kofiBtn.style.display = "none";
        document.getElementById("coin-counter").style.display = "flex";
        document.getElementById("gem-counter").style.display = "flex";
        running = true;
        spawnMov();
        requestAnimationFrame(loop);
    }

    document.getElementById("play-btn").addEventListener("click", startGame);
    document.getElementById("shop-btn").addEventListener("click", openShop);
    document.getElementById("close-shop").addEventListener("click", closeShop);
    document.getElementById("sound-btn").addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        updateSoundIcon();
    });

    const fullscreenBtn = document.getElementById("fullscreen-btn");
    fullscreenBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });
    document.addEventListener("fullscreenchange", () => {
        fullscreenBtn.classList.toggle("active", !!document.fullscreenElement);
    });
    const kofiModal = document.getElementById("kofi-modal");
    const closeKofiBtn = document.getElementById("close-kofi");

    if (kofiBtn) {
        kofiBtn.addEventListener("click", () => {
            kofiModal.style.display = "flex";
        });
    }
    if (closeKofiBtn) {
        closeKofiBtn.addEventListener("click", () => {
            kofiModal.style.display = "none";
        });
    }
    document.querySelectorAll(".shop-tab").forEach(tab => {
        tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    function openShop() {
        renderShop();
        document.getElementById("shop-modal").classList.add("active");
    }

    function closeShop() {
        document.getElementById("shop-modal").classList.remove("active");
    }

    function switchTab(tabId) {
        document.querySelectorAll(".shop-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
        document.querySelectorAll(".shop-grid").forEach(g => g.classList.toggle("active", g.id === `${tabId}-grid`));
    }

    function getUpgradeState(u) {
        if (u.consumable) {
            return { count: timeMachineCount, nextPrice: u.price, canBuy: true };
        }
        const level = (u.id === 'coin_boost') ? getCurrentBoosterLevel() : getSpeedStabilizerLevel();
        const next = u.levels[level];
        return { level, next, isMax: level >= u.levels.length };
    }

    function renderShop() {
        const skinsGrid = document.getElementById("skins-grid");
        const upgradesGrid = document.getElementById("upgrades-grid");

        skinsGrid.innerHTML = SKINS.map(skin => {
            const isOwned = ownedSkins.includes(skin.id);
            const isEquipped = currentSkinId === skin.id;
            const isGemPrice = skin.priceType === 'gem';
            const priceIcon = isGemPrice ?
                `<svg class="price-icon" viewBox="0 0 24 24" fill="#00ff88"><path d="M6 3L2 9l10 12L22 9l-4-6H6z"></path></svg>` :
                `<svg class="price-icon" viewBox="0 0 24 24" fill="#ffd700"><circle cx="12" cy="12" r="9"></circle></svg>`;

            return `
                <div class="shop-item ${isEquipped ? 'equipped' : ''}" onclick="window.buySkin('${skin.id}')">
                    <div class="item-preview">
                        ${skin.colors.slice(0, 3).map(c => `<div class="preview-rect" style="background: ${c}"></div>`).join('')}
                    </div>
                    <div class="item-info">
                        <span class="item-name">${skin.name}</span>
                        ${isEquipped ? '<span class="equipped-badge">Equipped</span>' :
                    isOwned ? '<span class="item-price" style="color: #fff">Equip</span>' :
                        `<span class="item-price ${isGemPrice ? 'gem-price' : 'coin-price'}">${skin.price} ${priceIcon}</span>`}
                    </div>
                </div>
            `;
        }).join('');

        upgradesGrid.innerHTML = UPGRADES.map(u => {
            const state = getUpgradeState(u);
            let actionHtml = '';
            if (u.consumable) {
                actionHtml = `<span class="item-price gem-price">${u.price} <svg class="price-icon" viewBox="0 0 24 24" fill="#00ff88"><path d="M6 3L2 9l10 12L22 9l-4-6H6z"></path></svg></span>
                              <div class="equipped-badge">Owned: ${state.count}</div>
                              <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 4px;">${u.description}</div>`;
            } else if (state.isMax) {
                actionHtml = `<span class="equipped-badge">MAX LEVEL</span>`;
            } else {
                actionHtml = `<span class="item-price gem-price">${state.next.price} <svg class="price-icon" viewBox="0 0 24 24" fill="#00ff88"><path d="M6 3L2 9l10 12L22 9l-4-6H6z"></path></svg></span>
                              <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 4px;">Next: ${state.next.label}</div>`;
            }
            return `
                <div class="shop-item" onclick="window.buyUpgrade('${u.id}')">
                    <div class="item-info">
                        <span class="item-name">${u.name}</span>
                        ${actionHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.buySkin = (id) => {
        const skin = SKINS.find(s => s.id === id);
        if (ownedSkins.includes(id)) {
            currentSkinId = id;
            localStorage.setItem('slab_rush_current_skin', id);
        } else {
            const isGem = skin.priceType === 'gem';
            const balance = isGem ? totalGems : totalCoins;
            if (balance >= skin.price) {
                if (isGem) {
                    totalGems -= skin.price;
                    localStorage.setItem('slab_rush_gems', totalGems);
                } else {
                    totalCoins -= skin.price;
                    localStorage.setItem('slab_rush_coins', Math.floor(totalCoins));
                }
                ownedSkins.push(id);
                currentSkinId = id;
                localStorage.setItem('slab_rush_owned_skins', JSON.stringify(ownedSkins));
                localStorage.setItem('slab_rush_current_skin', id);
                updateRewardDisplay();
            }
        }
        renderShop();
        updateThemeClass();
    };

    function updateThemeClass() {
        const skin = SKINS.find(s => s.id === currentSkinId) || SKINS[0];

        // Background handling
        if (skin.bg) {
            gw.style.backgroundImage = skin.bg;
            gw.style.backgroundSize = skin.bgSize || 'auto';
            gw.style.backgroundPosition = skin.bgPos || '0 0';
        } else {
            gw.style.backgroundImage = '';
            gw.style.backgroundSize = '';
            gw.style.backgroundPosition = '';
        }

        // Theme Classes
        gw.classList.remove('noir-active', 'carbon-theme');
        if (currentSkinId === 'monochrome') {
            gw.classList.add('noir-active');
        } else if (skin.themeClass) {
            gw.classList.add(skin.themeClass);
        }
    }
    updateThemeClass();

    window.buyUpgrade = (id) => {
        const u = UPGRADES.find(item => item.id === id);
        const state = getUpgradeState(u);
        if (!u.consumable && state.isMax) return;

        const cost = u.consumable ? u.price : state.next.price;
        if (totalGems >= cost) {
            totalGems -= cost;
            if (u.consumable) {
                timeMachineCount++;
                localStorage.setItem('slab_rush_time_machine_count', timeMachineCount);
            } else {
                ownedUpgrades.push(state.next.id);
                localStorage.setItem('slab_rush_owned_upgrades', JSON.stringify(ownedUpgrades));
            }
            localStorage.setItem('slab_rush_gems', totalGems);
            updateRewardDisplay();
            renderShop();
        }
    };

    updateSoundIcon();
    updateRewardDisplay();

    function loop(now) {
        if (!running) return;
        raf = requestAnimationFrame(loop);

        const dt = (now - lastLoopTime) / 1000;
        lastLoopTime = now;

        if (multiplierTime > 0) {
            multiplierTime = Math.max(0, multiplierTime - dt);
            multiplierContainer.classList.add("active");
            multiplierTimeEl.textContent = multiplierTime.toFixed(1) + "s";
        } else {
            multiplierContainer.classList.remove("active");
            multiplierValue = 1;
        }

        ctx.clearRect(0, 0, W, H);
        stack.forEach((b) => {
            if (b.y < H + 30) drawBlock(b.x, b.y, b.w, BLOCK_H, b.color);
        });
        mov.x += dir * spd;
        if (mov.x > W) dir = -1;
        if (mov.x + mov.w < 0) dir = 1;
        drawBlock(mov.x, mov.y, mov.w, BLOCK_H, mov.color);
    }
    window.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            e.preventDefault();
            place();
        }
    });
    cv.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        place();
    });
    window.addEventListener("resize", resize);
    resize();
})();
