(function () {
    const gw = document.getElementById("gw");
    const cv = document.getElementById("c");
    const ctx = cv.getContext("2d");
    const scoreEl = document.getElementById("score");
    const overlay = document.getElementById("overlay");
    const card = document.getElementById("card");
    const perfectEl = document.getElementById("perfect");

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
        sessionCoins = 0,
        lastSpeedScale = 0;

    function updateCoinDisplay() {
        document.getElementById("coin-val").textContent = Math.floor(totalCoins);
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
    const PALETTE = [
        "#5ecfbe",
        "#4bbdac",
        "#3aab9a",
        "#2b9888",
        "#1d8576",
        "#117165",
        "#085e54",
    ];

    function resize() {
        W = gw.clientWidth;
        H = gw.clientHeight;
        cv.width = W;
        cv.height = H;
    }

    function col(i) {
        return PALETTE[i % PALETTE.length];
    }

    function shade(hex, a) {
        let r = parseInt(hex.slice(1, 3), 16) + a;
        let g = parseInt(hex.slice(3, 5), 16) + a;
        let b = parseInt(hex.slice(5, 7), 16) + a;
        return `rgb(${Math.max(0, Math.min(255, r))},${Math.max(
            0,
            Math.min(255, g)
        )},${Math.max(0, Math.min(255, b))})`;
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
        score = 0;
        sessionCoins = 0;
        lastSpeedScale = 0;
        scoreEl.textContent = "0";
        spd = 3;
        stack = [];
        dir = 1;
        updateCoinDisplay();
        const bw = Math.min(W * 0.52, 210);
        const bx = (W - bw) / 2;
        const by = H - BLOCK_H;
        for (let i = 0; i < 9; i++) {
            stack.push({ x: bx, y: by - i * BLOCK_H, w: bw, color: col(i) });
        }
        spawnMov();
        running = true;
        if (raf) cancelAnimationFrame(raf);
        loop();
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

        // Speed scaling
        const currentScale = Math.floor(score / 10);
        if (currentScale > lastSpeedScale) {
            if (soundEnabled) swooshSound.play().catch(() => { });
            lastSpeedScale = currentScale;
        }
        spd += 0.5 * currentScale;
        spd = Math.min(spd, 16);

        // Reward system
        const gain = 1 * (score / 5);
        sessionCoins += gain;
        totalCoins += gain;
        updateCoinDisplay();

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
        localStorage.setItem('slab_rush_coins', Math.floor(totalCoins));
        if (soundEnabled) gameOverSound.play().catch(() => { });
        card.innerHTML = `
            <h2>Slab Rush!</h2>
            <div class="big">${score}</div>
            <div class="sub">blocks stacked</div>
            <div style="margin: 10px 0; font-weight: 400; color: #ffd700; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffd700" stroke="#b8860b" stroke-width="1.5">
                <circle cx="12" cy="12" r="9"></circle>
                <text x="50%" y="54%" text-anchor="middle" font-size="10" dy=".3em" fill="#b8860b" font-weight="bold">$</text>
              </svg>
              <span>+${Math.floor(sessionCoins)} earned</span>
            </div>
            <button id="play-btn">Play Again</button>
          `;
        overlay.style.display = "flex";
        document
            .getElementById("play-btn")
            .addEventListener("click", startGame);
    }

    document.getElementById("play-btn").addEventListener("click", startGame);

    document.getElementById("sound-btn").addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        updateSoundIcon();
    });

    updateSoundIcon();
    updateCoinDisplay();

    function loop() {
        if (!running) return;
        raf = requestAnimationFrame(loop);
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
