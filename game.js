const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bootScreen = document.getElementById('bootScreen');
const bsod = document.getElementById('bsod');
const gameUI = document.getElementById('gameUI');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const bossHpContainer = document.getElementById('boss-hp-container');
const bossHpBar = document.getElementById('boss-hp-bar');
const bgm = document.getElementById('bgm');

const bulletBlueImg = new Image();
bulletBlueImg.src = 'piso biru.png';
const bulletRedImg = new Image();
bulletRedImg.src = 'piso merah.png';

document.getElementById('terminalInput').focus();

let gameLoop;
let isPlaying = false;
let score = 0;
let lives = 1;

// Image Loading (with fallback)
const playerImg = new Image();
let playerImgLoaded = false;
playerImg.onload = () => { playerImgLoaded = true; };
playerImg.src = typeof GensokyoConfig !== 'undefined' ? GensokyoConfig.playerSpritePath : 'player.png';

const bossImg = new Image();
let bossImgLoaded = false;
bossImg.onload = () => { bossImgLoaded = true; };
bossImg.src = typeof GensokyoConfig !== 'undefined' ? GensokyoConfig.villainSpritePath : 'villain.png';

// Input handling
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, a: false, s: false, d: false,
    ' ': false, Shift: false
};

window.addEventListener('keydown', e => {
    if (isPlaying && (keys.hasOwnProperty(e.key) || e.key === ' ' || e.key === 'Shift')) {
        keys[e.key] = true;
        if(['ArrowUp', 'ArrowDown', ' ', 'Spacebar', 'Shift'].indexOf(e.key) > -1) {
            e.preventDefault();
        }
    }
});

window.addEventListener('keyup', e => {
    if (isPlaying && (keys.hasOwnProperty(e.key) || e.key === ' ' || e.key === 'Shift')) {
        keys[e.key] = false;
    }
});

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.radius = 3; // LUNATIC: Tiny physical hitbox
        this.speed = 4.0; // Reduced from 5.5 for easier control
        this.color = '#00ffff';
        this.lastShotTime = 0;
        this.shotDelay = 60; // Faster shooting
        this.invulnerableTime = 0;
    }

    update(dt) {
        let dx = 0; let dy = 0;
        if (keys.ArrowLeft || keys.a) dx -= 1;
        if (keys.ArrowRight || keys.d) dx += 1;
        if (keys.ArrowUp || keys.w) dy -= 1;
        if (keys.ArrowDown || keys.s) dy += 1;

        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length; dy /= length;
        }

        // Focus Mode: hold Shift to slow down and weave between tight bullet patterns
        let currentSpeed = keys.Shift ? this.speed * 0.45 : this.speed;

        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;

        this.x = Math.max(15, Math.min(canvas.width - 15, this.x));
        this.y = Math.max(15, Math.min(canvas.height - 15, this.y));

        if (keys[' '] && Date.now() - this.lastShotTime > this.shotDelay) {
            playerBullets.push(new Bullet(this.x, this.y, 0, -18, '#bbbbff', 5, true, bulletBlueImg));

            if (!keys.Shift) {
                // Wide spread
                playerBullets.push(new Bullet(this.x-8, this.y+5, -2, -16, '#bbbbff', 3, true, bulletBlueImg));
                playerBullets.push(new Bullet(this.x+8, this.y+5, 2, -16, '#bbbbff', 3, true, bulletBlueImg));
            } else {
                // Focus
                playerBullets.push(new Bullet(this.x-5, this.y, 0, -18, '#ffffff', 4, true, bulletBlueImg));
                playerBullets.push(new Bullet(this.x+5, this.y, 0, -18, '#ffffff', 4, true, bulletBlueImg));
            }

            this.lastShotTime = Date.now();
        }
        
        if (this.invulnerableTime > 0) {
            this.invulnerableTime -= dt;
        }
    }

    draw(ctx) {

        if (this.invulnerableTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
        
        if (playerImgLoaded) {
            const drawSize = 48;
            ctx.drawImage(playerImg, this.x - drawSize/2, this.y - drawSize/2, drawSize, drawSize);
        } else {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 14);
            ctx.lineTo(this.x - 14, this.y + 14);
            ctx.lineTo(this.x + 14, this.y + 14);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
}

class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = 120;
        this.width = 64;
        this.height = 64;
        this.color = '#ff0000';
        this.maxHp = 4000;
        this.hp = this.maxHp;
        this.time = 0;
        this.attackPhase = 0;
        this.lastAttackTime = 0;
        this.targetX = this.x;
        this.moveTimer = 0;
        this.timeStopActive = false;
        this.timeStopTimer = 0;
        this.timeStopCooldown = 0;
        this.prevPhase = 0;
        this.timeStopState = 0;
                
    }

    update(dt) {
        this.time += dt;

        // ===== PHASE CHANGE SYSTEM (FIXED) =====
        let newPhase = 0;

        if (this.hp < this.maxHp * 0.3) newPhase = 2;
        else if (this.hp < this.maxHp * 0.6) newPhase = 1;

        if (newPhase !== this.prevPhase) {
            this.attackPhase = newPhase;
            this.prevPhase = newPhase;

            // 💥 EFFECT PUTIH (TOUHOU STYLE)
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 💥 CLEAR BULLET
            enemyBullets.forEach(b => {
                b.dying = true;
                b.isStar = true;
                b.vx = 0;
                b.vy = 0;
            });
            playerBullets = [];

            // 🔁 RESET TIMESTOP
            this.timeStopActive = false;
            this.timeStopState = 0;
        }
        
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.targetX = 80 + Math.random() * (canvas.width - 160);
            this.moveTimer = 2000 + Math.random() * 1500; // Slower repositioning pauses
        }
        
        this.x += (this.targetX - this.x) * 0.03; // Smoother, slower movement to target

        if (this.hp < this.maxHp * 0.3) {
            this.attackPhase = 2; // Final desperation
        } else if (this.hp < this.maxHp * 0.6) {
             if (this.attackPhase === 0) this.attackPhase = 1;
        }

        // ===== LUNATIC MODE PATTERNS =====
       if (this.attackPhase === 0) {
        if (Math.random() < 0.12) {
            const numBullets = 28;

            for (let i = 0; i < numBullets; i++) {
                const angle1 = (Math.PI * 2 / numBullets) * i + (this.time * 0.004);
                const vx1 = Math.cos(angle1) * 1.5;
                const vy1 = Math.sin(angle1) * 1.5;

                enemyBullets.push(
                    new Bullet(this.x, this.y, vx1, vy1, '#ff0000', 5, false, bulletBlueImg)
                );

                const angle2 = (Math.PI * 2 / numBullets) * i - (this.time * 0.003);
                const vx2 = Math.cos(angle2) * 1.0;
                const vy2 = Math.sin(angle2) * 1.0;

                enemyBullets.push(
                    new Bullet(this.x, this.y, vx2, vy2, '#ff0000', 5, false, bulletRedImg)
                        );
                    }
                }
        }else if (this.attackPhase === 1) {

        // =========================
        // TIME STOP LOGIC (PRIORITY)
        // =========================
        this.timeStopCooldown -= dt;

        if (!this.timeStopActive && this.timeStopCooldown <= 0 && Math.random() < 0.05) {
            this.timeStopActive = true;
            this.timeStopState = 1; // mulai dari nembak dulu
            this.timeStopTimer = 1500; // durasi spam peluru (1.5 detik)
            this.timeStopCooldown = 6000;
        }
    if (this.timeStopActive) {
        this.timeStopTimer -= dt;

        // ======================
        // STATE 1: CHARGE (NEMBAK)
        // ======================
        if (this.timeStopState === 1) {
            // if (Math.floor(Date.now() / 100) % 2 === 0) return;

            if (Math.random() < 0.25) {
                const angle = Math.random() * Math.PI * 2;

                enemyBullets.push(new Bullet(
                    this.x,
                    this.y,
                    Math.cos(angle) * 3,
                    Math.sin(angle) * 3,
                    '#ffffff',
                    5,
                    false,
                    bulletRedImg
                ));
            }

            // kalau waktunya habis → masuk freeze
            if (this.timeStopTimer <= 0) {
                this.timeStopState = 2;
                this.timeStopTimer = 2000; // durasi freeze

                // 🔒 freeze semua peluru yang SUDAH ADA
                enemyBullets.forEach(b => b.frozen = true);
            }
        }

        // ======================
        // STATE 2: FREEZE
        // ======================
        else if (this.timeStopState === 2) {

            // opsional: spawn peluru tambahan yang langsung beku
            if (Math.random() < 0.1) {
                const angle = Math.random() * Math.PI * 2;

                const b = new Bullet(
                    this.x,
                    this.y,
                    Math.cos(angle) * 3,
                    Math.sin(angle) * 3,
                    '#ff00ff',
                    5,
                    false,
                    bulletBlueImg
                );

                b.frozen = true;
                enemyBullets.push(b);
            }

            // selesai timestop → release semua
            if (this.timeStopTimer <= 0) {
                this.timeStopActive = false;
                this.timeStopState = 0;

                enemyBullets.forEach(b =>{
                    b.frozen = false;  
                    b.vx *= 1.5;
                    b.vy *= 1.5;
                });
            }
        }

        return;
    }

    // =========================
    // NORMAL ATTACK (kalau gak timestop)
    // =========================
    if (Math.random() < 0.08) {
        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);

        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                enemyBullets.push(new Bullet(this.x, this.y,
                    Math.cos(baseAngle - 0.15) * 2.0,
                    Math.sin(baseAngle - 0.15) * 2.0,
                    '#ffaa00', 5, false, bulletRedImg
                ));

                enemyBullets.push(new Bullet(this.x, this.y,
                    Math.cos(baseAngle) * 2.5,
                    Math.sin(baseAngle) * 2.5,
                    '#ffffff', 6, false, bulletBlueImg
                ));

                enemyBullets.push(new Bullet(this.x, this.y,
                    Math.cos(baseAngle + 0.15) * 2.0,
                    Math.sin(baseAngle + 0.15) * 2.0,
                    '#ffaa00', 5, false, bulletBlueImg
                ));
            }, i * 60);
        }
    }
} else if (this.attackPhase === 2) {
             // Hell Phase: Thick walls and fast rains
             if (Math.random() < 0.7) {
                 const angle = Math.PI/2 + (Math.random()-0.5) * 2.8;
                 enemyBullets.push(
                    new Bullet(this.x, this.y,
                        Math.cos(angle)*1.8,
                        Math.sin(angle)*1.8,
                        '#00ff00', 5, false, bulletBlueImg
                    ));    
        }
             if (Math.random() < 0.3) {
                 enemyBullets.push(
                    new Bullet(Math.random() * canvas.width, -10,
                        0,
                        1.5 + Math.random()*1.5,
                        '#ff0000', 5, false, bulletRedImg
                    ));
             }
        }
        // =================================
        
        bossHpBar.style.width = `${(this.hp / this.maxHp) * 100}%`;
    }

    draw(ctx) {
        if (bossImgLoaded) {
            ctx.drawImage(bossImg, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - this.width/2 - 2, this.y - this.height/2 - 2, this.width + 4, this.height + 4);
        }
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
    }
}

class Bullet {
    constructor(x, y, vx, vy, color, radius, isPlayerBullet, img = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.radius = radius;
        this.isPlayerBullet = isPlayerBullet;
        this.img = img;
        this.frozen = false;
        this.alpha = 1;
        this.dying = false;
        this.isStar = false;
        this.rotation = 0;
    }

    update(dt) {

        if (this.dying) {
        this.alpha -= 0.05 * dt;
        this.radius += 0.4 * dt;
        this.rotation += 0.2 * dt;

        if (this.alpha <= 0) {
            this.dead = true;
        }
        return;
        }

        if (this.frozen) return;

        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);

    if (this.isStar) {
        ctx.rotate(this.rotation);

        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(0, this.radius * 2);
            ctx.translate(0, this.radius * 2);
            ctx.rotate((Math.PI * 2) / 10);
            ctx.lineTo(0, -this.radius * 2);
            ctx.translate(0, -this.radius * 2);
            ctx.rotate(-(Math.PI * 6) / 10);
        }
        ctx.closePath();

        ctx.fillStyle = '#ffff66';
        ctx.fill();
    } else if (this.img) {
        const size = 32;
        ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI/2);
        ctx.drawImage(this.img, -size/2, -size/2, size, size);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    ctx.restore();
} 
}

let player;
let boss;
let playerBullets = [];
let enemyBullets = [];
let lastTime = 0;

function resetGame() {
    player = new Player();
    boss = new Boss();
    playerBullets = [];
    enemyBullets = [];
    score = 0;
    lives = 1; // EXTREME HARDCORE: 1 Life
    scoreDisplay.innerText = `Score: ${score}`;
    livesDisplay.innerText = `Lives: ${lives}`;
    bossHpContainer.style.display = 'block';
    
    bsod.classList.add('hidden');
    gameUI.classList.remove('hidden');
    bootScreen.style.display = 'none';
    canvas.style.display = 'block';
}

function update(time) {
    if(!isPlaying) return;
    
    const dt = time - lastTime;
    lastTime = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // =========================
// SCREEN BLINK SAAT CHARGE
// =========================
if (boss && boss.timeStopActive && boss.timeStopState === 1) {
    if (Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

    if (boss && boss.timeStopActive) {
        ctx.fillStyle = 'rgba(120, 0, 200, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    player.update(dt);
    if(boss) boss.update(dt);

    for (let i = playerBullets.length - 1; i >= 0; i--) {
        let b = playerBullets[i];
        b.update(dt);
        b.draw(ctx);
        
        if (boss && Math.abs(b.x - boss.x) < boss.width/2 && Math.abs(b.y - boss.y) < boss.height/2) {
            boss.hp -= (keys.Shift ? 8 : 10);
            score += 10;
            scoreDisplay.innerText = `Score: ${score}`;
            playerBullets.splice(i, 1);
            
            if (boss.hp <= 0) {
                winGame();
                return; 
            }
        } else if (b.y < 0) {
            playerBullets.splice(i, 1);
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];
        b.update(dt);
        b.draw(ctx);

        if (b.dead) {
            enemyBullets.splice(i, 1);
            continue;
        }

        // HITBOX (aktifin lagi kalau mau kena)
        
        if (player.invulnerableTime <= 0) {
            const dist = Math.hypot(b.x - player.x, b.y - player.y);
            if (dist < player.radius + (b.radius * 0.5)) {
                playerHit();
                enemyBullets.splice(i, 1);
                continue;
            }
        }
        

        if (b.x < -30 || b.x > canvas.width + 30 || b.y < -30 || b.y > canvas.height + 30) {
            enemyBullets.splice(i, 1);
        }
    }

    if(boss) boss.draw(ctx);
    player.draw(ctx);

    gameLoop = requestAnimationFrame(update);
}

    function playerHit() {
        //budi
        lives--;
        livesDisplay.innerText = `Lives: ${lives}`;
        if (lives <= 0) {
            loseGame();
        } else {
            enemyBullets = [];
            player.invulnerableTime = 2000;
        }
    }

function loseGame() {
    isPlaying = false;
    cancelAnimationFrame(gameLoop);
    canvas.style.display = 'none';
    gameUI.classList.add('hidden');
    bsod.classList.remove('hidden');
    
    if (window.printToTerminal) {
         window.printToTerminal('FATAL ERROR. MEMORY OVERWRITTEN.', 'error-text');
         window.printToTerminal('H4kurei_Daemon: "Too slow..."', 'error-text');
    }
}

function winGame() {
    isPlaying = false;
    cancelAnimationFrame(gameLoop);
    boss = null; 
    enemyBullets = [];
    
    ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setTimeout(() => {
        canvas.style.display = 'none';
        gameUI.classList.add('hidden');
        bootScreen.style.display = 'block';
        bootScreen.innerHTML = '<p class="success-text">LUNATIC RITUAL CLEARED.</p><p>Check terminal logs for Decryption Master Key.</p>';
        
        const flagName = (typeof GensokyoConfig !== 'undefined') ? GensokyoConfig.flagFileName : 'flag.txt';
        const flagContent = (typeof GensokyoConfig !== 'undefined') ? GensokyoConfig.flagContent : 'FLAG{VICTORY}';

        if (window.unlockFile) {
            window.unlockFile(flagName, flagContent);
        }
    }, 1500);
}

window.startGame = function() {
    if (isPlaying) {
        if(window.printToTerminal) window.printToTerminal('Process already running.', 'error-text');
        return;
    }

    // 🎵 PLAY MUSIC
    if (bgm) {
        bgm.currentTime = 0;
        bgm.loop = true;
        bgm.volume = 0.3;

        bgm.play().catch(err => {
            console.log("Audio error:", err);
        });
    }

    resetGame();
    isPlaying = true;
    lastTime = performance.now();
    gameLoop = requestAnimationFrame(update);
    document.getElementById('terminalInput').blur();
};

window.addEventListener('keydown', e => {
    if (!bsod.classList.contains('hidden')) {
        bsod.classList.add('hidden');
        bootScreen.innerHTML = '<p>SYSTEM REBOOTED.</p><p>GENSOKYO.SYS TERMINAL CONNECTION REQUIRED...</p>';
        bootScreen.style.display = 'block';
        document.getElementById('terminalInput').focus();
    }
});
