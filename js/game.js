const PIXI = window.PIXI;
const GlowFilter = PIXI.filters.GlowFilter;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Create PixiJS app
const app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x000000
});
const gameContainer = document.getElementById('game-container');
gameContainer.appendChild(app.view);

// Player setup
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 7;
const PLAYER_MIN_Y = GAME_HEIGHT / 2;
const PLAYER_MAX_Y = GAME_HEIGHT - PLAYER_HEIGHT / 2;
const player = new PIXI.Graphics();
// Draw triangle ship
player.beginFill(0x00ff00);
player.moveTo(0, -PLAYER_HEIGHT/2); // top
player.lineTo(-PLAYER_WIDTH/2, PLAYER_HEIGHT/2); // bottom left
player.lineTo(PLAYER_WIDTH/2, PLAYER_HEIGHT/2); // bottom right
player.lineTo(0, -PLAYER_HEIGHT/2); // back to top
player.endFill();
player.x = GAME_WIDTH / 2;
player.y = GAME_HEIGHT - 50;
app.stage.addChild(player);

// Input state
const keys = {};
let canShoot = true;
let rapidFire = false;
let rapidFireNotified = false;
const RAPID_FIRE_SCORE = 5000;
const RAPID_FIRE_INTERVAL = 6; // frames between shots when holding
let rapidFireTimer = 0;
let rapidFireActive = false;
let rapidFireTimerSeconds = 0;
const RAPID_FIRE_DURATION = 10; // seconds
let lastRapidFireThreshold = 0;

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && (canShoot || rapidFireActive)) {
        shootBullet();
        canShoot = false;
    }
    if (e.key.toLowerCase() === 'a' && nukes > 0 && !gameOver && gameStarted) {
        useNuke();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === ' ') canShoot = true;
});

// Sound effects
const shootSound = new Audio('./assets/shoot.wav');
const explosionSound = new Audio('./assets/explosion.wav');
const loseLifeSound = new Audio('./assets/lose_life.wav');

function playShoot() { shootSound.currentTime = 0; shootSound.play(); }
function playExplosion() { explosionSound.currentTime = 0; explosionSound.play(); }
function playLoseLife() { loseLifeSound.currentTime = 0; loseLifeSound.play(); }

function shootBullet() {
    const bullet = new PIXI.Graphics();
    bullet.beginFill(0xffffff);
    bullet.drawRect(-4, -12, 8, 24);
    bullet.endFill();
    bullet.x = player.x;
    bullet.y = player.y - PLAYER_HEIGHT / 2;
    app.stage.addChild(bullet);
    bullets.push(bullet);
    playShoot();
}

// Bullets array
const bullets = [];

const BULLET_SPEED = 10;

// Aliens array
const aliens = [];
const ALIEN_WIDTH = 40;
const ALIEN_HEIGHT = 30;
const ALIEN_COLORS = [0xff3333, 0x33ff33, 0x3333ff, 0xffff33, 0xff33ff, 0x33ffff];
const TOUGH_ALIEN_COLOR = 0x9933ff;
const ALIEN_SPAWN_INTERVAL = 120; // frames
let alienSpawnTimer = 0;
let score = 0;
let lives = 3;

// Explosions array
const explosions = [];

let difficultyLevel = 0;
let currentSpawnInterval = ALIEN_SPAWN_INTERVAL;
let nukes = 0;
let lastNukeScore = 0;

function updateDifficulty() {
    const newLevel = Math.floor(score / 500);
    if (newLevel > difficultyLevel) {
        difficultyLevel = newLevel;
        currentSpawnInterval = Math.max(40, ALIEN_SPAWN_INTERVAL - difficultyLevel * 15);
    }
    // Award a nuke every 3000 points (but only once per threshold)
    const nukeThreshold = Math.floor(score / 3000);
    if (nukeThreshold > Math.floor(lastNukeScore / 3000)) {
        nukes++;
        updateNukesHUD();
        lastNukeScore = score;
    }
}

function createExplosion(x, y) {
    const gfx = new PIXI.Graphics();
    gfx.x = x;
    gfx.y = y;
    explosions.push({ gfx, radius: 10, alpha: 1 });
    app.stage.addChild(gfx);
}

function spawnAlien() {
    const isTough = Math.random() < 0.2; // 20% chance
    const color = isTough ? TOUGH_ALIEN_COLOR : ALIEN_COLORS[Math.floor(Math.random() * ALIEN_COLORS.length)];
    const width = isTough ? ALIEN_WIDTH * 1.3 : ALIEN_WIDTH;
    const height = isTough ? ALIEN_HEIGHT * 1.3 : ALIEN_HEIGHT;
    // Increase speed with difficulty
    const speedX = (Math.random() * 2 + 1.5 + difficultyLevel * 0.5) * (Math.random() < 0.5 ? 1 : -1) * (isTough ? 0.7 : 1);
    const speedY = (Math.random() * 0.7 + 0.5 + difficultyLevel * 0.2) * (isTough ? 0.7 : 1);
    const alien = new PIXI.Graphics();
    // UFO body
    alien.beginFill(color);
    alien.drawEllipse(0, 0, width/2, height/2);
    alien.endFill();
    // Dome
    alien.beginFill(0x99ccff);
    alien.drawEllipse(0, -height/4, width/4, height/6);
    alien.endFill();
    // Eyes
    alien.beginFill(0x000000);
    alien.drawCircle(-width/8, 0, 3);
    alien.drawCircle(width/8, 0, 3);
    alien.endFill();
    alien.x = Math.random() * (GAME_WIDTH - width) + width/2;
    alien.y = 40;
    alien.vx = speedX;
    alien.vy = speedY;
    alien.isTough = isTough;
    alien.hp = isTough ? 2 : 1;
    alien.alienWidth = width;
    alien.alienHeight = height;
    aliens.push(alien);
    app.stage.addChild(alien);
}

function animateHudPop(elementId) {
    const el = document.getElementById(elementId);
    el.classList.remove('hud-pop');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('hud-pop');
    setTimeout(() => el.classList.remove('hud-pop'), 200);
}

function updateScoreHUD() {
    document.getElementById('score-value').textContent = score;
    animateHudPop('score-value');
}

function updateLivesHUD() {
    document.getElementById('lives-value').textContent = lives;
    animateHudPop('lives-value');
}

function updateNukesHUD() {
    document.getElementById('nukes-value').textContent = nukes;
    animateHudPop('nukes-value');
}

let gameOver = false;

const restartBtn = document.getElementById('restart-btn');
restartBtn.addEventListener('click', restartGame);

const gameoverContainer = document.getElementById('gameover-container');

function positionGameoverContainer() {
    const container = gameContainer;
    const overlay = gameoverContainer;
    const rect = container.getBoundingClientRect();
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
}
window.addEventListener('resize', positionGameoverContainer);
window.addEventListener('DOMContentLoaded', positionGameoverContainer);
// Call after canvas is added
setTimeout(positionGameoverContainer, 100);

function showGameOver() {
    positionGameoverContainer();
    gameoverContainer.style.display = 'flex';
}

let gameStarted = false;
let titleScreen;

function showTitleScreen() {
    titleScreen = new PIXI.Container();
    // Title
    const titleStyle = new PIXI.TextStyle({
        fill: '#fff', fontSize: 64, fontWeight: 'bold', stroke: '#00f', strokeThickness: 8, dropShadow: true, dropShadowDistance: 4, dropShadowColor: '#000'
    });
    const title = new PIXI.Text('Galactic Invaders', titleStyle);
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = GAME_HEIGHT / 2 - 100;
    titleScreen.addChild(title);
    // Instructions
    const instStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 28 });
    const inst = new PIXI.Text('Arrow keys to move\nSpace to shoot', instStyle);
    inst.anchor.set(0.5);
    inst.x = GAME_WIDTH / 2;
    inst.y = GAME_HEIGHT / 2;
    titleScreen.addChild(inst);
    // Prompt
    const promptStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 24, fontStyle: 'italic' });
    const prompt = new PIXI.Text('Press Space to Start', promptStyle);
    prompt.anchor.set(0.5);
    prompt.x = GAME_WIDTH / 2;
    prompt.y = GAME_HEIGHT / 2 + 80;
    titleScreen.addChild(prompt);
    app.stage.addChild(titleScreen);
}

function hideTitleScreen() {
    if (titleScreen) app.stage.removeChild(titleScreen);
    titleScreen = null;
}

// Show title screen on load
showTitleScreen();

// Only allow game loop if started
app.ticker.add(() => {
    if (gameOver || !gameStarted) return;
    // Starfield animation
    starGfx.clear();
    starGfx.beginFill(0xffffff);
    for (const star of stars) {
        star.y += star.speed;
        if (star.y > GAME_HEIGHT) star.y = 0;
        starGfx.drawCircle(star.x, star.y, star.r);
    }
    starGfx.endFill();
    if (keys['ArrowLeft']) {
        player.x -= PLAYER_SPEED;
    }
    if (keys['ArrowRight']) {
        player.x += PLAYER_SPEED;
    }
    if (keys['ArrowUp']) {
        player.y -= PLAYER_SPEED;
    }
    if (keys['ArrowDown']) {
        player.y += PLAYER_SPEED;
    }
    // Keep player within bounds
    if (player.x < PLAYER_WIDTH/2) player.x = PLAYER_WIDTH/2;
    if (player.x > GAME_WIDTH - PLAYER_WIDTH/2) player.x = GAME_WIDTH - PLAYER_WIDTH/2;
    if (player.y < PLAYER_MIN_Y) player.y = PLAYER_MIN_Y;
    if (player.y > PLAYER_MAX_Y) player.y = PLAYER_MAX_Y;

    // Move bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= BULLET_SPEED;
        if (bullets[i].y < -20) {
            app.stage.removeChild(bullets[i]);
            bullets.splice(i, 1);
        }
    }

    // Alien spawning
    alienSpawnTimer++;
    if (alienSpawnTimer >= currentSpawnInterval) {
        spawnAlien();
        alienSpawnTimer = 0;
    }

    // Move aliens
    for (let alien of aliens) {
        alien.x += alien.vx;
        // Bounce off edges
        if (alien.x < alien.alienWidth/2 || alien.x > GAME_WIDTH - alien.alienWidth/2) {
            alien.vx *= -1;
            alien.y += 30; // move down when bouncing
        } else {
            alien.y += alien.vy;
        }
    }

    // Bullet-alien collision
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = aliens.length - 1; j >= 0; j--) {
            const bullet = bullets[i];
            const alien = aliens[j];
            if (
                Math.abs(bullet.x - alien.x) < (alien.alienWidth/2 + 4) &&
                Math.abs(bullet.y - alien.y) < (alien.alienHeight/2 + 12)
            ) {
                // Collision!
                app.stage.removeChild(bullet);
                bullets.splice(i, 1);
                alien.hp--;
                if (alien.hp <= 0) {
                    app.stage.removeChild(alien);
                    aliens.splice(j, 1);
                    // Scoring: smaller aliens worth more
                    let basePoints = 100;
                    let sizeBonus = Math.round((ALIEN_WIDTH - alien.alienWidth) / 10) * 20;
                    let points = basePoints + sizeBonus;
                    if (alien.isTough) points = Math.max(300, points);
                    score += points;
                    updateScoreHUD();
                    playExplosion();
                    createExplosion(alien.x, alien.y);
                } else {
                    // Flash tough alien (optional)
                    alien.tint = 0xffffff;
                    setTimeout(() => { alien.tint = 0xFFFFFF; }, 100);
                }
                break;
            }
        }
    }

    // Check if any alien reaches the bottom (canvas bottom)
    for (let j = aliens.length - 1; j >= 0; j--) {
        const alien = aliens[j];
        if (alien.y + alien.alienHeight/2 >= GAME_HEIGHT) {
            app.stage.removeChild(alien);
            aliens.splice(j, 1);
            lives--;
            updateLivesHUD();
            playLoseLife();
            if (lives <= 0) {
                gameOver = true;
                showGameOver();
            }
        }
    }

    // Animate explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.radius += 3;
        exp.alpha -= 0.07;
        exp.gfx.clear();
        exp.gfx.beginFill(0xffff00, exp.alpha);
        exp.gfx.drawCircle(0, 0, exp.radius);
        exp.gfx.endFill();
        if (exp.alpha <= 0) {
            app.stage.removeChild(exp.gfx);
            explosions.splice(i, 1);
        }
    }

    // Rapid fire logic
    if (rapidFireActive && keys[' ']) {
        rapidFireTimer++;
        if (rapidFireTimer >= RAPID_FIRE_INTERVAL) {
            shootBullet();
            rapidFireTimer = 0;
        }
    } else {
        rapidFireTimer = RAPID_FIRE_INTERVAL; // allow instant shot on press
    }

    updateDifficulty();
    // Rapid fire unlock check
    const currentThreshold = Math.floor(score / RAPID_FIRE_SCORE);
    if (currentThreshold > lastRapidFireThreshold) {
        rapidFireActive = true;
        rapidFireTimerSeconds = RAPID_FIRE_DURATION;
        updateRapidFireGlow();
        lastRapidFireThreshold = currentThreshold;
    }
    // Rapid fire timer countdown
    if (rapidFireActive) {
        rapidFireTimerSeconds -= app.ticker.deltaMS / 1000;
        if (rapidFireTimerSeconds <= 0) {
            rapidFireActive = false;
            updateRapidFireGlow();
        }
    }
});

// Listen for spacebar to start game
window.addEventListener('keydown', (e) => {
    if (!gameStarted && e.key === ' ') {
        gameStarted = true;
        hideTitleScreen();
        return;
    }
    // ... existing code ...
});

// In restartGame, reset to title screen
function restartGame() {
    // Remove all aliens and bullets
    for (const alien of aliens) app.stage.removeChild(alien);
    for (const bullet of bullets) app.stage.removeChild(bullet);
    aliens.length = 0;
    bullets.length = 0;
    // Remove game over text
    const goText = app.stage.getChildByName('gameover');
    if (goText) app.stage.removeChild(goText);
    // Reset state
    score = 0;
    lives = 3;
    gameOver = false;
    updateScoreHUD();
    updateLivesHUD();
    restartBtn.style.display = 'none';
    // Reset player position
    player.x = GAME_WIDTH / 2;
    player.y = GAME_HEIGHT - 50;
    // Reset difficulty
    difficultyLevel = 0;
    currentSpawnInterval = ALIEN_SPAWN_INTERVAL;
    gameoverContainer.style.display = 'none';
    nukes = 0;
    lastNukeScore = 0;
    updateNukesHUD();
    rapidFireActive = false;
    rapidFireTimerSeconds = 0;
    lastRapidFireThreshold = 0;
    updateRapidFireGlow();
    rapidFireTimer = 0;
}

// Starfield background
const STAR_COUNT = 80;
const stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 1.5 + 0.5
    });
}
const starGfx = new PIXI.Graphics();
app.stage.addChildAt(starGfx, 0); // Draw behind everything

// HUD positioning (keep on top)
document.getElementById('hud').style.position = 'absolute';
document.getElementById('hud').style.pointerEvents = 'none';

function useNuke() {
    if (nukes <= 0) return;
    nukes--;
    updateNukesHUD();
    // Destroy all aliens (no points)
    for (let i = aliens.length - 1; i >= 0; i--) {
        const alien = aliens[i];
        createExplosion(alien.x, alien.y);
        app.stage.removeChild(alien);
        aliens.splice(i, 1);
    }
    playExplosion();
}

function updateRapidFireGlow() {
    if (rapidFireActive) {
        player.filters = [new GlowFilter({
            color: 0x00ffff,
            distance: 20,
            outerStrength: 2,
            innerStrength: 0.5,
            quality: 0.5
        })];
    } else {
        player.filters = [];
    }
} 