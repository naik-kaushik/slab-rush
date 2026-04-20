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

    const SecureStorage = {
        _key: '_sr_data',
        _salt: 'v1_slab_rush_secure',

        _hash(str) {
            let h = 0;
            for (let i = 0; i < str.length; i++) {
                h = ((h << 5) - h) + str.charCodeAt(i);
                h |= 0;
            }
            return h.toString(36);
        },

        _cipher(str) {
            const k = this._salt;
            let res = "";
            for (let i = 0; i < str.length; i++) {
                res += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
            }
            return btoa(res);
        },

        _decipher(str) {
            try {
                const k = this._salt;
                const d = atob(str);
                let res = "";
                for (let i = 0; i < d.length; i++) {
                    res += String.fromCharCode(d.charCodeAt(i) ^ k.charCodeAt(i % k.length));
                }
                return res;
            } catch (e) { return null; }
        },

        save(state) {
            const data = JSON.stringify(state);
            const packet = JSON.stringify({
                d: data,
                h: this._hash(data + this._salt)
            });
            localStorage.setItem(this._key, this._cipher(packet));
        },

        load() {
            const raw = localStorage.getItem(this._key);
            if (!raw) return null;
            const unscrambled = this._decipher(raw);
            if (!unscrambled) return { corrupted: true };
            try {
                const packet = JSON.parse(unscrambled);
                if (this._hash(packet.d + this._salt) !== packet.h) {
                    return { corrupted: true };
                }
                return JSON.parse(packet.d);
            } catch (e) { return { corrupted: true }; }
        }
    };

    const DEFAULT_STATE = {
        totalCoins: 0,
        totalGems: 0,
        highScore: 0,
        currentSkinId: 'classic',
        ownedSkins: ['classic'],
        ownedUpgrades: [],
        timeMachineCount: 0,
        multiplierStartCount: 0,
        sessionCount: 0,
        lastVisit: 0,
        a2hsOptOut: false
    };

    let gameState = SecureStorage.load();
    let cheatDetected = false;

    if (gameState && !gameState.corrupted) {
        if (gameState.multiplierStartCount === undefined) {
            gameState.multiplierStartCount = 0;
            SecureStorage.save(gameState);
        }
    }

    if (!gameState) {
        // New player or no data
        gameState = { ...DEFAULT_STATE };
        // Check for migration
        const legacyCoins = localStorage.getItem('slab_rush_coins');
        if (legacyCoins !== null) {
            gameState.totalCoins = parseInt(legacyCoins) || 0;
            gameState.totalGems = parseInt(localStorage.getItem('slab_rush_gems')) || 0;
            gameState.highScore = parseInt(localStorage.getItem('slab_rush_highscore')) || 0;
            gameState.currentSkinId = localStorage.getItem('slab_rush_current_skin') || 'classic';
            gameState.ownedSkins = JSON.parse(localStorage.getItem('slab_rush_owned_skins') || '["classic"]');
            gameState.ownedUpgrades = JSON.parse(localStorage.getItem('slab_rush_owned_upgrades') || '[]');
            gameState.timeMachineCount = parseInt(localStorage.getItem('slab_rush_time_machine_count') || '0');

            // Clear legacy keys
            ['slab_rush_coins', 'slab_rush_gems', 'slab_rush_highscore', 'slab_rush_current_skin',
                'slab_rush_owned_skins', 'slab_rush_owned_upgrades', 'slab_rush_time_machine_count'].forEach(k => localStorage.removeItem(k));
            SecureStorage.save(gameState);
        }
    } else if (gameState.corrupted) {
        gameState = { ...DEFAULT_STATE };
        cheatDetected = true;
        SecureStorage.save(gameState);
    }

    // Initialize/Update Session Info
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const isReturningUser = gameState.lastVisit > 0 && (now - gameState.lastVisit) < oneDay;

    gameState.lastVisit = now;
    // We'll increment sessionCount in startGame to count "plays" as requested by user
    // However, the user said "if user plays the game more than 5 times".
    // Let's increment it here for "visits" or in startGame for "plays"?
    // The prompt says "if user plays the game more than 5 times". So I'll do it in startGame.
    SecureStorage.save(gameState);

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;

        // Check if we should show our custom prompt
        if (shouldShowA2HSPrompt()) {
            setTimeout(showA2HSPrompt, 2000); // Show after 2 seconds
        }
    });

    function shouldShowA2HSPrompt() {
        if (!deferredPrompt) return false;
        if (gameState.a2hsOptOut) return false;

        // Show if plays > 5 (meaning 6th play onwards)
        if (gameState.sessionCount >= 5) {
            // User said "After that we can show it if the user visits the game back before 24hrs"
            // This implies the 24h check is for the "recurring" part.
            // Let's interpret "After that" as "for subsequent visits".
            // So: 
            // 1. If sessionCount === 5 (just finished 5th play), show it.
            // 2. If sessionCount > 5, show it ONLY if returning within 24h.

            if (gameState.sessionCount === 5) return true;
            if (gameState.sessionCount > 5 && isReturningUser) return true;
        }

        return false;
    }

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
        sessionCoins = 0,
        sessionGems = 0,
        lastSpeedScale = 0,
        multiplierTime = 0,
        multiplierValue = 1,
        consecutivePerfects = 0,
        hasCelebratedPB = false,
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
        },
        {
            id: 'phantom', name: 'Phantom Void', price: 5000,
            colors: ["#111", "#000", "#111", "#050505"],
            themeClass: 'phantom-theme'
        },
        {
            id: 'gold_glimmer', name: 'Golden Glimmer', price: 15000,
            colors: ["#ffd700", "#ffcc33", "#e6b800", "#ffcc33"],
            themeClass: 'gold-theme'
        },
        {
            id: 'prismatic', name: 'Prismatic Flow', price: 50000,
            colors: ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8b00ff"],
            themeClass: 'prismatic-theme'
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
                { id: 'speed_stab_1', price: 150, effect: 0.85, label: 'LVL 1 (-15%)' },
                { id: 'speed_stab_2', price: 300, effect: 0.70, label: 'LVL 2 (-30%)' },
                { id: 'speed_stab_3', price: 600, effect: 0.60, label: 'LVL 3 (-40%)' }
            ]
        },
        {
            id: 'time_machine',
            name: 'Time Machine',
            type: 'gem',
            price: 50,
            consumable: true,
            description: 'Rewind 3 blocks after failure'
        },
        {
            id: 'multiplier_start',
            name: 'Multiplier Start',
            type: 'coin',
            price: 500,
            consumable: true,
            description: 'Start next game with 2x Multiplier (10s)'
        },
        {
            id: 'gem_exchange',
            name: 'Gem Exchange',
            type: 'coin',
            price: 10000,
            consumable: true,
            description: 'Buy 25 Gems with Coins'
        }
    ];

    // Anti-Cheat Modal Logic
    if (cheatDetected) {
        const acModal = document.getElementById("anticheat-modal");
        acModal.classList.add("active");
        document.getElementById("close-anticheat").addEventListener("click", () => {
            acModal.classList.remove("active");
        });
    }
    let hasUsedRevive = false;

    function getActivePalette() {
        const skin = SKINS.find(s => s.id === gameState.currentSkinId) || SKINS[0];
        return skin.colors;
    }

    function updateRewardDisplay() {
        document.getElementById("coin-val").textContent = Math.floor(gameState.totalCoins);
        document.getElementById("gem-val").textContent = Math.floor(gameState.totalGems);

        const pbDisplay = document.getElementById("pb-display");
        if (pbDisplay) {
            if (gameState.highScore > 0) {
                pbDisplay.style.display = "block";
                pbDisplay.querySelector(".pb-val").textContent = gameState.highScore;
            } else {
                pbDisplay.style.display = "none";
            }
        }

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
        if (gameState.ownedUpgrades.includes('coin_boost_3')) return 3;
        if (gameState.ownedUpgrades.includes('coin_boost_2')) return 2;
        if (gameState.ownedUpgrades.includes('coin_boost_1')) return 1;
        return 0;
    }

    function getSpeedStabilizerLevel() {
        if (gameState.ownedUpgrades.includes('speed_stab_3')) return 3;
        if (gameState.ownedUpgrades.includes('speed_stab_2')) return 2;
        if (gameState.ownedUpgrades.includes('speed_stab_1')) return 1;
        return 0;
    }

    const chime = new Audio("assets/audio/chime_sound.mp3");
    const gameOverSound = new Audio("assets/audio/game_over.mp3");
    const swooshSound = new Audio("assets/audio/swoosh.mp3");
    const pbSound = new Audio("assets/audio/personal-best.mp3");
    chime.volume = 0.5;
    gameOverSound.volume = 0.5;
    swooshSound.volume = 0.5;
    pbSound.volume = 0.6;

    const ICON_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const ICON_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

    function updateSoundIcon() {
        document.getElementById("sound-btn").innerHTML = soundEnabled ? ICON_ON : ICON_OFF;
    }

    function showToast(msg) {
        let t = document.getElementById("toast");
        if (!t) {
            t = document.createElement("div");
            t.id = "toast";
            t.className = "toast";
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add("active");
        setTimeout(() => t.classList.remove("active"), 3000);
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

        const baseStartSpd = 1.8 * (W / 800);
        const stabLevel = getSpeedStabilizerLevel();
        const stabEffect = stabLevel > 0 ? UPGRADES[1].levels[stabLevel - 1].effect : 1.0;
        // Apply Global Speed Multiplier with Safety Floor (min 60% of base speed)
        spd = Math.max(baseStartSpd * stabEffect, baseStartSpd * 0.6);

        stack = [];
        dir = 1;
        updateRewardDisplay();
        multiplierValue = 1;
        multiplierTime = 0;
        consecutivePerfects = 0;

        // Increment session count (plays)
        gameState.sessionCount = (gameState.sessionCount || 0) + 1;
        SecureStorage.save(gameState);

        // Check for A2HS prompt on the 5th play (meaning they have played 5 times and are starting the 6th)
        if (shouldShowA2HSPrompt()) {
            setTimeout(showA2HSPrompt, 1000);
        }

        // Apply Multiplier Start power-up
        if (gameState.multiplierStartCount > 0) {
            gameState.multiplierStartCount--;
            multiplierTime = 10;
            multiplierValue = 2;
            SecureStorage.save(gameState);
        }

        lastLoopTime = performance.now();
        hasUsedRevive = false;
        hasCelebratedPB = false;
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
                multiplierValue = 2;
                multiplierTime += 5;
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

        // Celebration for Personal Best!
        if (gameState.highScore > 0 && score > gameState.highScore && !hasCelebratedPB) {
            hasCelebratedPB = true;
            if (soundEnabled) pbSound.play().catch(() => { });
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    zIndex: 1000
                });
            }
        }

        playChime();

        // Speed scaling with Global Stabilizer
        const stabLevel = getSpeedStabilizerLevel();
        const stabEffect = stabLevel > 0 ? UPGRADES[1].levels[stabLevel - 1].effect : 1.0;
        const speedFactor = W / 800; // Reference width for 1x speed
        const currentScale = Math.floor(score / 10); // Back to fixed 10-block intervals

        if (currentScale > lastSpeedScale) {
            if (soundEnabled) swooshSound.play().catch(() => { });
            lastSpeedScale = currentScale;
            // Apply modifier to the increment as well
            spd += (0.25 * speedFactor) * stabEffect;
        }
        spd = Math.min(spd, 12 * speedFactor);

        // Reward system with Booster
        let gain = 1 + Math.floor(score / 25);
        if (multiplierTime > 0) {
            gain *= multiplierValue;
        }
        const boosterLevel = getCurrentBoosterLevel();
        if (boosterLevel > 0) {
            gain *= UPGRADES[0].levels[boosterLevel - 1].effect;
        }
        sessionCoins += gain;
        gameState.totalCoins += gain;
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

        sessionGems = Math.floor(score / 10) + Math.floor(score / 25) + Math.floor(score / 50);
        gameState.totalGems += sessionGems;

        if (soundEnabled) gameOverSound.play().catch(() => { });

        let isNewBest = false;
        if (score > gameState.highScore) {
            gameState.highScore = score;
            isNewBest = true;
        }

        // Save state at end of game
        SecureStorage.save(gameState);

        const canRevive = gameState.timeMachineCount > 0 && !hasUsedRevive && stack.length > 5;
        const isSmallScreen = window.innerWidth <= 400;

        card.innerHTML = `
            <h2>Slab Rush!</h2>
            ${isNewBest ? '<div class="new-best-badge">NEW BEST!</div>' : ''}
            <div class="big">${score}</div>
            <div class="sub">blocks stacked</div>
            ${!isNewBest && gameState.highScore > 0 ? `<div class="pb-small">Best: ${gameState.highScore}</div>` : ''}
            <div style="margin: 10px 0; font-weight: 400; color: #ffd700; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffd700" stroke="#b8860b" stroke-width="1.5">
                <circle cx="12" cy="12" r="9"></circle>
                <text x="50%" y="54%" text-anchor="middle" font-size="10" dy=".3em" fill="#b8860b" font-weight="bold">$</text>
              </svg>
              <span>+${Math.floor(sessionCoins)}${isSmallScreen ? '' : ' earned'}</span>
              ${isSmallScreen ? `<span style="color: rgba(255,255,255,0.3); margin: 0 2px;">·</span>
              <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Total: ${Math.floor(gameState.totalCoins)}</span>` : ''}
            </div>
            <div style="margin: 2px 0; font-weight: 400; color: #00ff88; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#00ff88" stroke="#008844" stroke-width="1.5">
                <path d="M6 3L2 9l10 12L22 9l-4-6H6z"></path>
                <path d="M2 9h20M6 3l4 6m8-6l-4 6m-6 0l4 12m4-12l-4 12"></path>
              </svg>
              <span>+${sessionGems}${isSmallScreen ? '' : ' gems earned'}</span>
              ${isSmallScreen ? `<span style="color: rgba(255,255,255,0.3); margin: 0 2px;">·</span>
              <span style="color: rgba(255,255,255,0.5); font-size: 12px;">Total: ${Math.floor(gameState.totalGems)}</span>` : ''}
            </div>
            ${canRevive ? `
                <button id="revive-btn">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                    </svg>
                    REWIND (${gameState.timeMachineCount})
                </button>
            ` : ''}
            <button id="play-btn">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"></path>
                </svg>
                Play Again
            </button>
            ${isNewBest ? `
                <div class="share-row">
                    <button id="share-btn" title="Share on X">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.18l4.73 6.261 5.334-6.261zm-1.16 17.52h1.833L7.084 4.126H5.117L17.084 19.77z"></path>
                        </svg>
                    </button>
                    <button id="native-share-btn" title="More Options">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                </div>
            ` : ''}
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
        if (isNewBest) {
            document.getElementById("share-btn").addEventListener("click", async () => {
                const btn = document.getElementById("share-btn");
                btn.disabled = true;

                try {
                    const text = `🏗️ SLAB RUSH! 🏗️\nI just stacked a massive tower of ${score} blocks! 🚀✨\n\nCan you beat my record? Try it at https://naik-kaushik.github.io/slab-rush/ 🏆\n#SlabRush #Gaming #Highscore`;
                    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;

                    showToast("Opening X...");
                    window.open(tweetUrl, '_blank');
                    btn.disabled = false;
                } catch (err) {
                    console.error(err);
                    showToast("Failed to copy image.");
                    btn.disabled = false;
                }
            });

            document.getElementById("native-share-btn").addEventListener("click", async () => {
                const text = `🏗️ SLAB RUSH! 🏗️\nI just stacked a massive tower of ${score} blocks! 🚀✨\n\nCan you beat my record? Try it at https://naik-kaushik.github.io/slab-rush/ 🏆\n#SlabRush #Gaming #Highscore`;

                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Slab Rush!',
                            text: text,
                            url: window.location.href
                        });
                    } catch (err) {
                        console.error("Native share failed", err);
                    }
                } else {
                    // Fallback to clipboard
                    try {
                        await navigator.clipboard.writeText(text);
                        showToast("Message copied to clipboard!");
                    } catch (err) {
                        showToast("Sharing not supported.");
                    }
                }
            });
        }
        const supportLink = document.querySelector(".support-msg a");
        if (supportLink) {
            supportLink.style.pointerEvents = "none";
            supportLink.style.opacity = "0.5";
            setTimeout(() => {
                supportLink.style.pointerEvents = "auto";
                supportLink.style.opacity = "1";
            }, 1500);
            supportLink.addEventListener("click", (e) => {
                e.preventDefault();
                document.getElementById("kofi-modal").style.display = "flex";
            });
        }
    }

    function rewindGame() {
        if (gameState.timeMachineCount <= 0) return;
        gameState.timeMachineCount--;
        hasUsedRevive = true;
        SecureStorage.save(gameState);

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
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            document.exitFullscreen().catch(() => { });
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
            let count = 0;
            if (u.id === 'time_machine') count = gameState.timeMachineCount;
            if (u.id === 'multiplier_start') count = gameState.multiplierStartCount;
            return { count, nextPrice: u.price, canBuy: true };
        }
        const level = (u.id === 'coin_boost') ? getCurrentBoosterLevel() : getSpeedStabilizerLevel();
        const next = u.levels[level];
        return { level, next, isMax: level >= u.levels.length };
    }

    function renderShop() {
        const skinsGrid = document.getElementById("skins-grid");
        const upgradesGrid = document.getElementById("upgrades-grid");

        skinsGrid.innerHTML = SKINS.map(skin => {
            const isOwned = gameState.ownedSkins.includes(skin.id);
            const isEquipped = gameState.currentSkinId === skin.id;
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
            const isGemPrice = u.type !== 'coin';
            const priceIcon = isGemPrice ?
                `<svg class="price-icon" viewBox="0 0 24 24" fill="#00ff88"><path d="M6 3L2 9l10 12L22 9l-4-6H6z"></path></svg>` :
                `<svg class="price-icon" viewBox="0 0 24 24" fill="#ffd700"><circle cx="12" cy="12" r="9"></circle></svg>`;

            let actionHtml = '';
            if (u.consumable) {
                if (u.id === 'gem_exchange') {
                    actionHtml = `<span class="item-price coin-price">${u.price} ${priceIcon}</span>
                                  <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 4px;">Get 25 Gems</div>`;
                } else {
                    actionHtml = `<span class="item-price ${isGemPrice ? 'gem-price' : 'coin-price'}">${u.price} ${priceIcon}</span>
                                  <div class="equipped-badge">Owned: ${state.count}</div>
                                  <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 4px;">${u.description}</div>`;
                }
            } else if (state.isMax) {
                actionHtml = `<span class="equipped-badge">MAX LEVEL</span>`;
            } else {
                actionHtml = `<span class="item-price ${isGemPrice ? 'gem-price' : 'coin-price'}">${state.next.price} ${priceIcon}</span>
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
        if (gameState.ownedSkins.includes(id)) {
            gameState.currentSkinId = id;
            SecureStorage.save(gameState);
        } else {
            const isGem = skin.priceType === 'gem';
            const balance = isGem ? gameState.totalGems : gameState.totalCoins;
            if (balance >= skin.price) {
                if (isGem) {
                    gameState.totalGems -= skin.price;
                } else {
                    gameState.totalCoins -= skin.price;
                }
                gameState.ownedSkins.push(id);
                gameState.currentSkinId = id;
                SecureStorage.save(gameState);
                updateRewardDisplay();
            }
        }
        renderShop();
        updateThemeClass();
    };

    function updateThemeClass() {
        const skin = SKINS.find(s => s.id === gameState.currentSkinId) || SKINS[0];

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
        SKINS.forEach(s => {
            if (s.themeClass) gw.classList.remove(s.themeClass);
        });
        gw.classList.remove('noir-active');

        if (gameState.currentSkinId === 'monochrome') {
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
        const isCoin = u.type === 'coin';
        const balance = isCoin ? gameState.totalCoins : gameState.totalGems;

        if (balance >= cost) {
            if (isCoin) {
                gameState.totalCoins -= cost;
            } else {
                gameState.totalGems -= cost;
            }

            if (u.consumable) {
                if (u.id === 'time_machine') gameState.timeMachineCount++;
                if (u.id === 'multiplier_start') gameState.multiplierStartCount++;
                if (u.id === 'gem_exchange') {
                    gameState.totalGems += 25;
                    showToast("Exchanged 10k Coins for 25 Gems! ✨");
                }
            } else {
                gameState.ownedUpgrades.push(state.next.id);
            }
            SecureStorage.save(gameState);
            updateRewardDisplay();
            renderShop();
        } else {
            showToast(`Not enough ${isCoin ? 'Coins' : 'Gems'}!`);
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

    // A2HS Interaction Logic
    function showA2HSPrompt() {
        const modal = document.getElementById('a2hs-modal');
        if (modal) modal.classList.add('active');
    }

    function hideA2HSPrompt() {
        const modal = document.getElementById('a2hs-modal');
        if (modal) modal.classList.remove('active');
    }

    document.getElementById('install-btn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        hideA2HSPrompt();
        // Show the browser's install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
    });

    document.getElementById('a2hs-ignore').addEventListener('click', () => {
        hideA2HSPrompt();
    });

    document.getElementById('a2hs-opt-out').addEventListener('click', () => {
        gameState.a2hsOptOut = true;
        SecureStorage.save(gameState);
        hideA2HSPrompt();
        showToast("We won't show this again.");
    });
})();
