// Only declare GlowFilter from PIXI.filters, do not redeclare PIXI
const GlowFilter = PIXI.filters.GlowFilter;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Create PixiJS app (this stays global)
const app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x000000
});
const gameContainer = document.getElementById('game-container');
gameContainer.appendChild(app.view);

// Global variables that should persist or be initialized only once
let GAME_RULES = null;
let soundOn = true; // Sound toggle state

// Input state variables (global, but reset by resetGameState)
let keys = {};
let canShoot = true;
let canNormalShoot = true; // New: Cooldown for normal fire
let normalShootTimer = 0; // New: Timer for normal fire cooldown
let rapidFire = false;
let rapidFireNotified = false;
const RAPID_FIRE_INTERVAL = 6; // frames between shots when holding
let rapidFireTimer = 0;
let rapidFireActive = false;
let rapidFireTimerSeconds = 0;
let lastRapidFireThreshold = 0;

// Game state variables (global, but reset by resetGameState)
let alienSpawnTimer = 0;
let score = 0;
let lives = 0; // Initialized to 0, will be set from GAME_RULES.startingLives in resetGameState
let nukes = 0;
let lastNukeScore = 0;
let phantomAlien = null; // Track the active Phantom Alien
let phantomAlienShootTimer = 0; // Timer for Phantom Alien shooting
let lastPhantomScore = 0; // Track last score threshold for Phantom Alien spawn

let difficultyLevel = 0;
let currentSpawnInterval = 0; // Will be set from GAME_RULES in resetGameState

let gameOver = false;
let gameStarted = false; // Track if game has started (from title screen)
let pendingGameOver = false; // Flag to delay game over until explosions finish
let titleScreen; // Reference to title screen container

// Arrays for game objects (global, but cleared by resetGameState)
let bullets = [];
let aliens = [];
let explosions = [];
let buildings = []; // Array to hold individual building graphics

// Persistent PixiJS objects (global)
const player = new PIXI.Graphics();
const starGfx = new PIXI.Graphics();
const cityBase = new PIXI.Graphics();

// Player glow filter (global)
const playerGlowFilter = new GlowFilter({
    color: 0x00ff00, // Default green glow
    distance: 20,
    outerStrength: 0.5,
    innerStrength: 0.5,
    quality: 0.5
});
// player.filters = [playerGlowFilter]; // Commented out to prevent default glow

// Glow breathing variables (global)
let glowBreathingFactor = 0.5; // Current outer strength
let glowBreathingDirection = 1; // 1 for increasing, -1 for decreasing
const GLOW_BREATHING_SPEED = 0.03; // Speed of the pulsation
const GLOW_MIN_STRENGTH = 0.8; // Minimum outer strength
const GLOW_MAX_STRENGTH = 5; // Maximum outer strength

// Game Constants (can be moved to GAME_RULES if needed)
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 7;
const PLAYER_MIN_Y = GAME_HEIGHT / 2;
const PLAYER_MAX_Y = GAME_HEIGHT - 80 - PLAYER_HEIGHT / 2; // Player cannot go below the top of the city base
const BULLET_SPEED = 10;
const ALIEN_WIDTH = 40;
const ALIEN_HEIGHT = 30;
const ALIEN_COLORS = [0xff3333, 0x33ff33, 0x3333ff, 0xffff33, 0xff33ff, 0x33ffff];
const TOUGH_ALIEN_COLOR = 0x9933ff;

// Player setup (drawing only, position set in resetGameState)
player.beginFill(0x0055FF); // Main body color (blue)
// Main body of the ship (pixelated, blocky)
player.drawRect(-PLAYER_WIDTH / 4, -PLAYER_HEIGHT / 2, PLAYER_WIDTH / 2, PLAYER_HEIGHT); // Central vertical block
player.drawRect(-PLAYER_WIDTH / 2, 0, PLAYER_WIDTH, PLAYER_HEIGHT / 4); // Horizontal base block
player.endFill();

// Wings (lighter blue, blocky)
player.beginFill(0x3399FF); // Lighter blue for wings
player.drawRect(-PLAYER_WIDTH * 0.7, -PLAYER_HEIGHT / 4, PLAYER_WIDTH * 0.2, PLAYER_HEIGHT / 2); // Left wing
player.drawRect(PLAYER_WIDTH * 0.5, -PLAYER_HEIGHT / 4, PLAYER_WIDTH * 0.2, PLAYER_HEIGHT / 2); // Right wing
player.endFill();

// Cockpit (dark grey/black - keep this color for contrast)
player.beginFill(0x333333);
player.drawRect(-PLAYER_WIDTH * 0.15, -PLAYER_HEIGHT * 0.4, PLAYER_WIDTH * 0.3, PLAYER_HEIGHT * 0.2); // Cockpit rectangle
player.endFill();

// Thrusters (darker shades, at the back)
player.beginFill(0x555555); // Thruster casing
player.drawRect(-PLAYER_WIDTH * 0.15, PLAYER_HEIGHT * 0.5, PLAYER_WIDTH * 0.3, PLAYER_HEIGHT * 0.2); // Central thruster block
player.endFill();

player.beginFill(0x000000); // Thruster exhausts
player.drawRect(-PLAYER_WIDTH * 0.1, PLAYER_HEIGHT * 0.6, PLAYER_WIDTH * 0.08, PLAYER_HEIGHT * 0.1); // Left exhaust
player.drawRect(PLAYER_WIDTH * 0.02, PLAYER_HEIGHT * 0.6, PLAYER_WIDTH * 0.08, PLAYER_HEIGHT * 0.1); // Right exhaust
player.endFill();

// Starfield setup (drawing only, position set in resetGameState)
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

// City and Buildings setup (drawing only, position set in resetGameState)
cityBase.clear();
cityBase.beginFill(0xFF00FF); // Main pink base color
cityBase.drawRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 30);
cityBase.endFill();

// Add structured pixel lines for texture (less columns, more defined)
// Darker pink/magenta vertical lines
cityBase.beginFill(0xCC00CC); // Darker pink
for (let x = 0; x < GAME_WIDTH; x += 15) {
    cityBase.drawRect(x, GAME_HEIGHT - 30, 7, 30);
}
cityBase.endFill();

// Lighter pink/magenta vertical lines, offset
cityBase.beginFill(0xFF33FF); // Lighter pink
for (let x = 7; x < GAME_WIDTH; x += 15) {
    cityBase.drawRect(x, GAME_HEIGHT - 25, 4, 25);
}
cityBase.endFill();

// Horizontal accent lines (e.g., a darker line near the top)
cityBase.beginFill(0x990099); // Even darker pink/purple
for (let x = 0; x < GAME_WIDTH; x += 10) {
    cityBase.drawRect(x, GAME_HEIGHT - 30, 5, 2); // Thin horizontal line at the top
}
cityBase.endFill();

cityBase.beginFill(0xCC33CC); // Medium pink/purple
for (let x = 5; x < GAME_WIDTH; x += 10) {
    cityBase.drawRect(x, GAME_HEIGHT - 28, 3, 1); // Another thin horizontal line
}
cityBase.endFill();

// Sound effects (loaded here, or could be preloaded once globally)
const shootSound = new Audio('./assets/shoot.wav');
const explosionSound = new Audio('./assets/explosion.wav');
const phantomSound = new Audio('./assets/phantomalien.wav');
phantomSound.loop = true;

// Event listeners for input (attached once globally)
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    // Map WASD to arrow keys for movement
    switch(e.key.toLowerCase()) {
        case 'a': keys['ArrowLeft'] = true; break;
        case 'd': keys['ArrowRight'] = true; break;
        case 'w': keys['ArrowUp'] = true; break;
        case 's': keys['ArrowDown'] = true; break;
    }
    if (e.key === 'm' || e.key === 'M') {
        soundOn = !soundOn;
    }
    // Only allow shooting if game started and not game over
    if (gameStarted && !gameOver && e.key === ' ' && (canNormalShoot || rapidFireActive)) {
        shootBullet();
        if (!rapidFireActive) {
            canNormalShoot = false; // Apply cooldown only for normal fire
            normalShootTimer = 0; // Start the cooldown timer
        }
    }
    // Only allow nuke if game started and not game over
    if (gameStarted && !gameOver && e.key.toLowerCase() === 'q' && nukes > 0) {
        useNuke();
    }
    // If game has not started yet, any key press will start it
    if (!gameStarted && (e.key === 'Enter' || e.key === 'Return')) {
        gameStarted = true;
        hideTitleScreen();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    // Map WASD to arrow keys for movement
    switch(e.key.toLowerCase()) {
        case 'a': keys['ArrowLeft'] = false; break;
        case 'd': keys['ArrowRight'] = false; break;
        case 'w': keys['ArrowUp'] = false; break;
        case 's': keys['ArrowDown'] = false; break;
    }
    if (e.key === ' ') canShoot = true;
});

// Initialize after rules are loaded
async function loadGameRules() {
    const response = await fetch('./game_rules.json');
    GAME_RULES = await response.json();
    initializeGame(); // Call a new initialization function
}

// This function will contain all game setup and state initialization that runs once after rules are loaded
function initializeGame() {
    // Clear previous game state if restarting
    app.stage.removeChildren(); // Clear all objects from previous game/title screen
    app.ticker.stop(); // Stop ticker to prevent multiple additions

    // Add persistent background layers first (starfield, city base, player)
    app.stage.addChildAt(starGfx, 0);
    // Draw static stars initially for the title screen
    starGfx.clear();
    starGfx.beginFill(0xffffff);
    for (const star of stars) {
        starGfx.drawCircle(star.x, star.y, star.r);
    }
    starGfx.endFill();

    app.stage.addChild(cityBase);
    app.stage.addChild(player);

    // Reset game state and show title screen
    resetGameState();

    app.ticker.start(); // Start the ticker once initialization is done
}

// Function Definitions
function playShoot() { if (soundOn) { shootSound.currentTime = 0; shootSound.play(); } }
function playExplosion() { if (soundOn) { explosionSound.currentTime = 0; explosionSound.play(); } }
function playLoseLife() { if (soundOn) { loseLifeSound.currentTime = 0; loseLifeSound.play(); } }

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

function updateDifficulty() {
    const newLevel = Math.floor(score / GAME_RULES.difficulty.scorePerLevel);
    if (newLevel > difficultyLevel) {
        difficultyLevel = newLevel;
        currentSpawnInterval = Math.max(
            GAME_RULES.difficulty.spawnIntervalMin,
            GAME_RULES.difficulty.spawnIntervalStart - difficultyLevel * GAME_RULES.difficulty.spawnIntervalStep
        );
    }
    const nukeThreshold = Math.floor(score / GAME_RULES.nukeThreshold);
    if (nukeThreshold > Math.floor(lastNukeScore / GAME_RULES.nukeThreshold)) {
        nukes++;
        updateNukesHUD();
        // Add glowing effect to the nukes label here
        const nukesLabel = document.getElementById('nukes'); // Target the label div
        nukesLabel.classList.add('nukes-glow');
        setTimeout(() => {
            nukesLabel.classList.remove('nukes-glow');
        }, 3000); // Glow for 3 seconds
        lastNukeScore = score;
    }
}

function createExplosion(x, y) {
    const gfx = new PIXI.Graphics();
    gfx.x = x;
    gfx.y = y;
    // Initialize with age, maxAge, and red glow filter
    const explosionGlowFilter = new GlowFilter({
        color: 0xFF0000, // Red glow
        distance: 80, // Further increased distance for an even bigger glow
        outerStrength: 0.5,
        innerStrength: 0.5,
        quality: 0.5
    });
    gfx.filters = [explosionGlowFilter];
    explosions.push({ gfx, age: 0, maxAge: 20, alpha: 1, glowFilter: explosionGlowFilter }); // maxAge set to 20 frames for faster animation
    app.stage.addChild(gfx);
}

function spawnAlien() {
    const isTough = Math.random() < 0.2; // 20% chance
    const color = isTough ? TOUGH_ALIEN_COLOR : ALIEN_COLORS[Math.floor(Math.random() * ALIEN_COLORS.length)];
    const width = isTough ? ALIEN_WIDTH * 1.3 : ALIEN_WIDTH;
    const height = isTough ? ALIEN_HEIGHT * 1.3 : ALIEN_HEIGHT;
    const speedX = ((Math.random() * 2 + 1.5 + difficultyLevel * 0.5) * (Math.random() < 0.5 ? 1 : -1) * (isTough ? 0.7 : 1)) * GAME_RULES.alienSpeed;
    const speedY = ((Math.random() * 0.7 + 0.5 + difficultyLevel * 0.2) * (isTough ? 0.7 : 1)) * GAME_RULES.alienSpeed;
    const alien = new PIXI.Graphics();
    alien.beginFill(color);
    // Main body: larger rectangular base, smaller rectangular top
    alien.drawRect(-width * 0.4, -height * 0.3, width * 0.8, height * 0.6); // Main rectangular body part
    alien.drawRect(-width * 0.3, -height * 0.5, width * 0.6, height * 0.2); // Top part of body, slightly narrower
    alien.endFill();

    // Eyes: stalks and eyeballs
    // Left eye
    alien.beginFill(color); // Stalk color same as body
    alien.drawRect(-width * 0.3, -height * 0.6, width * 0.08, height * 0.15); // Left stalk
    alien.endFill();
    alien.beginFill(0xFFFFFF); // White eyeball
    alien.drawRect(-width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); // Left eyeball (square)
    alien.endFill();
    alien.beginFill(0x000000); // Black pupil
    alien.drawRect(-width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); // Left pupil (square)
    alien.endFill();

    // Right eye
    alien.beginFill(color); // Stalk color same as body
    alien.drawRect(width * 0.22, -height * 0.6, width * 0.08, height * 0.15); // Right stalk
    alien.endFill();
    alien.beginFill(0xFFFFFF); // White eyeball
    alien.drawRect(width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); // Right eyeball (square)
    alien.endFill();
    alien.beginFill(0x000000); // Black pupil
    alien.drawRect(width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); // Right pupil (square)
    alien.endFill();

    // Arms/Claws: simple rectangles for now, positioned on the sides
    alien.beginFill(color);
    alien.drawRect(-width * 0.6, -height * 0.1, width * 0.2, height * 0.3); // Left arm (vertical)
    alien.drawRect(-width * 0.75, -height * 0.25, width * 0.15, height * 0.1); // Left claw (horizontal, slightly angled)
    alien.endFill();

    alien.beginFill(color);
    alien.drawRect(width * 0.4, -height * 0.1, width * 0.2, height * 0.3); // Right arm (vertical)
    alien.drawRect(width * 0.6, -height * 0.25, width * 0.15, height * 0.1); // Right claw (horizontal, slightly angled)
    alien.endFill();
    alien.x = Math.random() * (GAME_WIDTH - width) + width/2;
    alien.y = 40;
    alien.vx = speedX;
    alien.vy = speedY;
    alien.isTough = isTough;
    alien.hp = isTough ? GAME_RULES.alienHp.tough : GAME_RULES.alienHp.normal;
    alien.alienWidth = width;
    alien.alienHeight = height;
    aliens.push(alien);
    app.stage.addChild(alien);
}

function animateHudPop(elementId) {
    const el = document.getElementById(elementId);
    el.classList.remove('hud-pop');
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
    const nukesValue = document.getElementById('nukes-value');
    nukesValue.textContent = nukes;
    animateHudPop('nukes-value');
}

function updateBuildingsHUD(buildingCount) {
    document.getElementById('buildings-value').textContent = buildingCount;
    animateHudPop('buildings-value');
}

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
window.addEventListener('DOMContentLoaded', positionGameoverContainer); // Ensure it positions on initial load
setTimeout(positionGameoverContainer, 100); // Call after canvas is added

function showGameOver() {
    positionGameoverContainer();
    gameoverContainer.style.display = 'flex';
}

function showTitleScreen() {
    titleScreen = new PIXI.Container();

    const headerStyle = new PIXI.TextStyle({
        fill: '#fff', fontSize: 28, fontWeight: 'bold', stroke: '#FF00FF', strokeThickness: 4, dropShadow: true, dropShadowDistance: 4, dropShadowColor: '#CC00CC'
    });
    const header = new PIXI.Text('Instructions', headerStyle);
    header.anchor.set(0.5);
    header.x = GAME_WIDTH / 2;
    header.y = GAME_HEIGHT / 2 - 110; // Moved down by 20 pixels (was -130)
    titleScreen.addChild(header);

    // Instructions text (white with pink keys)
    const whiteInstStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 20, fontWeight: 'normal' });
    const pinkKeyStyle = new PIXI.TextStyle({ fill: 0xFF00FF, fontSize: 20, fontWeight: 'normal' });

    let currentY = header.y + 50; // This offset remains consistent relative to the header

    // Helper to measure text width
    const measureTextWidth = (text, style) => new PIXI.Text(text, style).width;

    // Line 1: Arrows + WASD + Move
    const line1Part1Text = '← ↑ → ↓';
    const line1Part2Text = ' or ';
    const line1Part3Text = '[WASD]';
    const line1Part4Text = ' Move';

    const line1Width = measureTextWidth(line1Part1Text, pinkKeyStyle) +
                       measureTextWidth(line1Part2Text, whiteInstStyle) +
                       measureTextWidth(line1Part3Text, pinkKeyStyle) +
                       measureTextWidth(line1Part4Text, whiteInstStyle);

    let line1StartX = GAME_WIDTH / 2 - line1Width / 2;

    const inst1Part1 = new PIXI.Text(line1Part1Text, pinkKeyStyle);
    inst1Part1.anchor.set(0, 0.5);
    inst1Part1.x = line1StartX;
    inst1Part1.y = currentY;
    titleScreen.addChild(inst1Part1);

    const inst1Part2 = new PIXI.Text(line1Part2Text, whiteInstStyle);
    inst1Part2.anchor.set(0, 0.5);
    inst1Part2.x = inst1Part1.x + inst1Part1.width;
    inst1Part2.y = currentY;
    titleScreen.addChild(inst1Part2);

    const inst1Part3 = new PIXI.Text(line1Part3Text, pinkKeyStyle);
    inst1Part3.anchor.set(0, 0.5);
    inst1Part3.x = inst1Part2.x + inst1Part2.width;
    inst1Part3.y = currentY;
    titleScreen.addChild(inst1Part3);

    const inst1Part4 = new PIXI.Text(line1Part4Text, whiteInstStyle);
    inst1Part4.anchor.set(0, 0.5);
    inst1Part4.x = inst1Part3.x + inst1Part3.width;
    inst1Part4.y = currentY;
    titleScreen.addChild(inst1Part4);

    currentY += 25; // Move to next line

    // Line 2: [Space] Shoot
    const line2Text1 = '[Space]';
    const line2Text2 = ' Shoot';
    const line2Width = measureTextWidth(line2Text1, pinkKeyStyle) + measureTextWidth(line2Text2, whiteInstStyle);
    let line2StartX = GAME_WIDTH / 2 - line2Width / 2;

    const inst2Part1 = new PIXI.Text(line2Text1, pinkKeyStyle);
    inst2Part1.anchor.set(0, 0.5);
    inst2Part1.x = line2StartX;
    inst2Part1.y = currentY;
    titleScreen.addChild(inst2Part1);

    const inst2Part2 = new PIXI.Text(line2Text2, whiteInstStyle);
    inst2Part2.anchor.set(0, 0.5);
    inst2Part2.x = inst2Part1.x + inst2Part1.width;
    inst2Part2.y = currentY;
    titleScreen.addChild(inst2Part2);

    currentY += 25; // Move to next line

    // Line 3: [Q] Use Nuke
    const line3Text1 = '[Q]';
    const line3Text2 = ' Use Nuke';
    const line3Width = measureTextWidth(line3Text1, pinkKeyStyle) + measureTextWidth(line3Text2, whiteInstStyle);
    let line3StartX = GAME_WIDTH / 2 - line3Width / 2;

    const inst3Part1 = new PIXI.Text(line3Text1, pinkKeyStyle);
    inst3Part1.anchor.set(0, 0.5);
    inst3Part1.x = line3StartX;
    inst3Part1.y = currentY;
    titleScreen.addChild(inst3Part1);

    const inst3Part2 = new PIXI.Text(line3Text2, whiteInstStyle);
    inst3Part2.anchor.set(0, 0.5);
    inst3Part2.x = inst3Part1.x + inst3Part1.width;
    inst3Part2.y = currentY;
    titleScreen.addChild(inst3Part2);

    currentY += 25; // Move to next line

    // Line 4: [M] Toggle Sound
    const line4Text1 = '[M]';
    const line4Text2 = ' Toggle Sound';
    const line4Width = measureTextWidth(line4Text1, pinkKeyStyle) + measureTextWidth(line4Text2, whiteInstStyle);
    let line4StartX = GAME_WIDTH / 2 - line4Width / 2;

    const inst4Part1 = new PIXI.Text(line4Text1, pinkKeyStyle);
    inst4Part1.anchor.set(0, 0.5);
    inst4Part1.x = line4StartX;
    inst4Part1.y = currentY;
    titleScreen.addChild(inst4Part1);

    const inst4Part2 = new PIXI.Text(line4Text2, whiteInstStyle);
    inst4Part2.anchor.set(0, 0.5);
    inst4Part2.x = inst4Part1.x + inst4Part1.width;
    inst4Part2.y = currentY;
    titleScreen.addChild(inst4Part2);

    // Display Alien Information - Now horizontally arranged above instructions
    const alienInfoStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 16, fontWeight: 'normal' }); // Slightly smaller font for horizontal display

    const alienSpacing = 180; // Horizontal space between each alien group
    const groupWidth = 2 * alienSpacing; // Total width from center of first to center of last alien
    const startX = (GAME_WIDTH / 2) - (groupWidth / 2); // Calculate startX to center the group
    let currentX = startX;
    const alienDisplayY = GAME_HEIGHT / 2 - 200; // Y position for the alien row (above instructions)

    // Normal Alien
    const normalAlienPoints = GAME_RULES.points.normalAlien;
    const normalAlienGraphic = new PIXI.Graphics();
    {
        const width = ALIEN_WIDTH * 0.6; // Increased size
        const height = ALIEN_HEIGHT * 0.6; // Increased size
        const color = ALIEN_COLORS[0];
        normalAlienGraphic.beginFill(color);
        normalAlienGraphic.drawRect(-width * 0.4, -height * 0.3, width * 0.8, height * 0.6);
        normalAlienGraphic.drawRect(-width * 0.3, -height * 0.5, width * 0.6, height * 0.2);
        normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(color); normalAlienGraphic.drawRect(-width * 0.3, -height * 0.6, width * 0.08, height * 0.15); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(0xFFFFFF); normalAlienGraphic.drawRect(-width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(0x000000); normalAlienGraphic.drawRect(-width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(color); normalAlienGraphic.drawRect(width * 0.22, -height * 0.6, width * 0.08, height * 0.15); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(0xFFFFFF); normalAlienGraphic.drawRect(width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(0x000000); normalAlienGraphic.drawRect(width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(color); normalAlienGraphic.drawRect(-width * 0.6, -height * 0.1, width * 0.2, height * 0.3); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(color); normalAlienGraphic.drawRect(-width * 0.75, -height * 0.25, width * 0.15, height * 0.1); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(color); normalAlienGraphic.drawRect(width * 0.4, -height * 0.1, width * 0.2, height * 0.3); normalAlienGraphic.endFill();
        normalAlienGraphic.beginFill(color); normalAlienGraphic.drawRect(width * 0.6, -height * 0.25, width * 0.15, height * 0.1); normalAlienGraphic.endFill();
    }
    normalAlienGraphic.x = currentX;
    normalAlienGraphic.y = alienDisplayY;
    titleScreen.addChild(normalAlienGraphic);
    const normalAlienText = new PIXI.Text(`${normalAlienPoints} Pts`, alienInfoStyle);
    normalAlienText.anchor.set(0.5);
    normalAlienText.x = currentX;
    normalAlienText.y = alienDisplayY + ALIEN_HEIGHT * 0.6 / 2 + 15; // Adjusted Y for increased size
    titleScreen.addChild(normalAlienText);

    currentX += alienSpacing;

    // Tough Alien
    const toughAlienPoints = GAME_RULES.points.toughAlien;
    const toughAlienGraphic = new PIXI.Graphics();
    {
        const width = ALIEN_WIDTH * 0.75; // Increased size
        const height = ALIEN_HEIGHT * 0.75; // Increased size
        const color = TOUGH_ALIEN_COLOR;
        toughAlienGraphic.beginFill(color);
        toughAlienGraphic.drawRect(-width * 0.4, -height * 0.3, width * 0.8, height * 0.6);
        toughAlienGraphic.drawRect(-width * 0.3, -height * 0.5, width * 0.6, height * 0.2);
        toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(color); toughAlienGraphic.drawRect(-width * 0.3, -height * 0.6, width * 0.08, height * 0.15); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(0xFFFFFF); toughAlienGraphic.drawRect(-width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(0x000000); toughAlienGraphic.drawRect(-width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(color); toughAlienGraphic.drawRect(width * 0.22, -height * 0.6, width * 0.08, height * 0.15); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(0xFFFFFF); toughAlienGraphic.drawRect(width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(0x000000); toughAlienGraphic.drawRect(width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(color); toughAlienGraphic.drawRect(-width * 0.6, -height * 0.1, width * 0.2, height * 0.3); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(color); toughAlienGraphic.drawRect(-width * 0.75, -height * 0.25, width * 0.15, height * 0.1); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(color); toughAlienGraphic.drawRect(width * 0.4, -height * 0.1, width * 0.2, height * 0.3); toughAlienGraphic.endFill();
        toughAlienGraphic.beginFill(color); toughAlienGraphic.drawRect(width * 0.6, -height * 0.25, width * 0.15, height * 0.1); toughAlienGraphic.endFill();
    }
    toughAlienGraphic.x = currentX;
    toughAlienGraphic.y = alienDisplayY;
    titleScreen.addChild(toughAlienGraphic);
    const toughAlienText = new PIXI.Text(`${toughAlienPoints} Pts`, alienInfoStyle);
    toughAlienText.anchor.set(0.5);
    toughAlienText.x = currentX;
    toughAlienText.y = alienDisplayY + ALIEN_HEIGHT * 0.75 / 2 + 15; // Adjusted Y for increased size
    titleScreen.addChild(toughAlienText);

    currentX += alienSpacing;

    // Phantom Alien
    const phantomAlienPoints = GAME_RULES.phantomAlien.bonusScore;
    const phantomAlienGraphic = new PIXI.Graphics();
    {
        const width = ALIEN_WIDTH * 0.8; // Increased size
        const height = ALIEN_HEIGHT * 0.8; // Increased size
        phantomAlienGraphic.beginFill(0xcccccc); // Light gray
        phantomAlienGraphic.drawEllipse(0, 0, width * 0.7, height * 0.35);
        phantomAlienGraphic.endFill();
        phantomAlienGraphic.beginFill(0x4fc3f7); // Blue
        phantomAlienGraphic.drawEllipse(0, -height * 0.18, width * 0.35, height * 0.18);
        phantomAlienGraphic.endFill();
        phantomAlienGraphic.beginFill(0xffffff, 0.7);
        phantomAlienGraphic.drawEllipse(width * 0.12, -height * 0.22, width * 0.09, height * 0.05);
        phantomAlienGraphic.endFill();
        phantomAlienGraphic.beginFill(0x222222);
        phantomAlienGraphic.drawRect(-width * 0.18, -height * 0.05, width * 0.36, height * 0.08);
        phantomAlienGraphic.endFill();
        phantomAlienGraphic.beginFill(0xffeb3b);
        for (let i = -2; i <= 2; i++) {
            phantomAlienGraphic.drawCircle(i * width * 0.18, height * 0.18, width * 0.04);
        }
        phantomAlienGraphic.endFill();
        phantomAlienGraphic.lineStyle(3, 0x000000, 1);
        phantomAlienGraphic.drawEllipse(0, 0, width * 0.7, height * 0.35);
        phantomAlienGraphic.drawEllipse(0, -height * 0.18, width * 0.35, height * 0.18);
        phantomAlienGraphic.drawRect(-width * 0.18, -height * 0.05, width * 0.36, height * 0.08);
        const phantomGlowFilter = new GlowFilter({
            color: 0x00FFFF,
            distance: 10,
            outerStrength: 1,
            innerStrength: 0.2,
            quality: 0.5
        });
        phantomAlienGraphic.filters = [phantomGlowFilter];
    }
    phantomAlienGraphic.x = currentX;
    phantomAlienGraphic.y = alienDisplayY;
    titleScreen.addChild(phantomAlienGraphic);
    const phantomAlienText = new PIXI.Text(`${phantomAlienPoints} Pts`, alienInfoStyle);
    phantomAlienText.anchor.set(0.5);
    phantomAlienText.x = currentX;
    phantomAlienText.y = alienDisplayY + ALIEN_HEIGHT * 0.8 / 2 + 15; // Adjusted Y for increased size
    titleScreen.addChild(phantomAlienText);

    // Prompt text (white with pink [Enter])
    const whitePromptStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 24, fontStyle: 'italic' });
    const pinkEnterStyle = new PIXI.TextStyle({ fill: 0xFF00FF, fontSize: 24, fontStyle: 'italic' });

    const promptPart1 = new PIXI.Text('Press ', whitePromptStyle);
    const promptPart2 = new PIXI.Text('[Enter]', pinkEnterStyle); // Pink [Enter]
    const promptPart3 = new PIXI.Text(' to Start', whitePromptStyle);

    // Calculate total width of the prompt to center it
    const promptTotalWidth = promptPart1.width + promptPart2.width + promptPart3.width;
    const promptStartX = GAME_WIDTH / 2 - promptTotalWidth / 2;

    // Position the prompt parts
    promptPart1.anchor.set(0, 0.5);
    promptPart1.x = promptStartX;
    promptPart1.y = currentY + 50; // Position below instructions (currentY is already adjusted)
    titleScreen.addChild(promptPart1);

    promptPart2.anchor.set(0, 0.5);
    promptPart2.x = promptPart1.x + promptPart1.width;
    promptPart2.y = promptPart1.y;
    titleScreen.addChild(promptPart2);

    promptPart3.anchor.set(0, 0.5);
    promptPart3.x = promptPart2.x + promptPart2.width;
    promptPart3.y = promptPart1.y;
    titleScreen.addChild(promptPart3);

    app.stage.addChild(titleScreen);
}

function hideTitleScreen() {
    if (titleScreen) app.stage.removeChild(titleScreen);
    titleScreen = null;
}

// Function to reset all game state (called by restartGame and at initial startup)
function resetGameState() {
    // Remove all existing game objects from stage that are not persistent (player, starGfx, cityBase, titleScreen)
    for (let i = app.stage.children.length - 1; i >= 0; i--) {
        const child = app.stage.children[i];
        if (child !== player && child !== starGfx && child !== cityBase && child !== titleScreen) {
            app.stage.removeChild(child);
        }
    }

    // Clear arrays
    bullets.length = 0;
    aliens.length = 0;
    explosions.length = 0;

    // Clear and re-draw buildings (since they are created dynamically)
    for (const building of buildings) {
        app.stage.removeChild(building);
    }
    buildings.length = 0; // Clear building array

    const buildingColors = [0xFFFFFF, 0xFF00FF, 0x00FF00]; // White, Pink, Green

    const minBuildings = GAME_RULES.buildings.min;
    const maxBuildings = GAME_RULES.buildings.max;
    const numBuildings = Math.floor(Math.random() * (maxBuildings - minBuildings + 1)) + minBuildings;
    const minWidth = 25;
    const maxWidth = 60;
    const minHeight = 20;
    const maxHeight = 40;
    const margin = 10;
    let usedRanges = [];

    for (let i = 0; i < numBuildings; i++) {
        let width = Math.floor(Math.random() * (maxWidth - minWidth + 1)) + minWidth;
        let height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        let x;
        let attempts = 0;
        do {
            x = Math.floor(Math.random() * (GAME_WIDTH - width - margin));
            attempts++;
        } while (usedRanges.some(r => x < r.end + margin && x + width > r.start - margin) && attempts < 20);
        usedRanges.push({start: x, end: x + width});

        const building = new PIXI.Graphics();
        const randomBuildingColor = buildingColors[Math.floor(Math.random() * buildingColors.length)];
        building.beginFill(randomBuildingColor);
        building.drawRect(0, 0, width, height);
        building.endFill();

        // Add uniform windows to the building in a grid pattern
        const windowColor = 0x000000; // Black for windows
        const windowMargin = 5; // Margin from building edge and between windows.
        const buildingBaseHeight = 10; // Solid base at the bottom of the building

        // Define absolute min/max window dimensions for aesthetic appearance
        const absMinWindowDim = 5;
        const absMaxWindowDim = 20; // Increased max to allow for larger proportionate windows

        // Calculate available space for windows, considering margins from building edges AND the solid base
        const availableWidthForWindows = width - 2 * windowMargin;
        const availableHeightForWindows = height - 2 * windowMargin - buildingBaseHeight; // Subtract base height

        // Determine how many windows can fit initially based on minimum window dimension
        let numWindowsX = Math.floor(availableWidthForWindows / (absMinWindowDim + windowMargin));
        let numWindowsY = Math.floor(availableHeightForWindows / (absMinWindowDim + windowMargin));

        // Ensure at least one window in each dimension if space allows, clamp to 1 if it results in 0
        numWindowsX = Math.max(1, numWindowsX);
        numWindowsY = Math.max(1, numWindowsY);

        // Special handling for "at least 2 windows" total:
        // If currently only one window (1x1 grid), try to force to 2x1 or 1x2 if possible.
        if (numWindowsX === 1 && numWindowsY === 1) {
            // Check if there's enough space to fit two windows horizontally (2 windows + 1 margin between)
            if (availableWidthForWindows >= (2 * absMinWindowDim + 1 * windowMargin)) {
                numWindowsX = 2;
            } else if (availableHeightForWindows >= (2 * absMinWindowDim + 1 * windowMargin)) {
                // If not horizontally, check vertically
                numWindowsY = 2;
            }
            // If still 1x1, it means the building is too small for 2 windows even with min size,
            // so we'll proceed with 1 window for this small building.
        }

        // Calculate actual window dimensions to fill the space uniformly based on the determined number of windows
        let actualWindowWidth = (availableWidthForWindows - (numWindowsX - 1) * windowMargin) / numWindowsX;
        let actualWindowHeight = (availableHeightForWindows - (numWindowsY - 1) * windowMargin) / numWindowsY;

        // Clamp actual window dimensions to aesthetic min/max to prevent extremely large or small windows due to calculation
        actualWindowWidth = Math.min(actualWindowWidth, absMaxWindowDim);
        actualWindowHeight = Math.min(actualWindowHeight, absMaxWindowDim);
        actualWindowWidth = Math.max(actualWindowWidth, absMinWindowDim); // Ensure it's not smaller than min
        actualWindowHeight = Math.max(actualWindowHeight, absMinWindowDim); // Ensure it's not smaller than min

        // Check if calculated dimensions are valid and positive before drawing
        if (numWindowsX > 0 && numWindowsY > 0 && actualWindowWidth > 0 && actualWindowHeight > 0) {
            // Calculate starting positions to center the grid of windows within the building
            const totalWindowsDrawWidth = numWindowsX * actualWindowWidth + (numWindowsX - 1) * windowMargin;
            const totalWindowsDrawHeight = numWindowsY * actualWindowHeight + (numWindowsY - 1) * windowMargin;
            const startX = (width - totalWindowsDrawWidth) / 2;
            const startY = (height - totalWindowsDrawHeight) / 2;

            // Adjust startY to account for the solid base at the bottom
            const adjustedStartY = startY - buildingBaseHeight / 2; // Move windows up by half the base height to center in available space

            for (let row = 0; row < numWindowsY; row++) {
                for (let col = 0; col < numWindowsX; col++) {
                    const windowX = startX + col * (actualWindowWidth + windowMargin);
                    const windowY = adjustedStartY + row * (actualWindowHeight + windowMargin);
                    building.beginFill(windowColor);
                    building.drawRect(windowX, windowY, actualWindowWidth, actualWindowHeight);
                    building.endFill();
                }
            }
        } else {
            // Fallback: if no proper grid can be formed (e.g., building too small), draw a single, proportionate window
            const singleWindowWidth = width * 0.4; // 40% of building width
            const singleWindowHeight = height * 0.4; // 40% of building height
            const singleWindowX = (width - singleWindowWidth) / 2;
            const singleWindowY = (height - singleWindowHeight) / 2 - buildingBaseHeight / 2; // Adjust for base
            building.beginFill(windowColor);
            building.drawRect(singleWindowX, singleWindowY, singleWindowWidth, singleWindowHeight);
            building.endFill();
        }

        building.x = x;
        building.y = GAME_HEIGHT - 30 - height;
        building.filters = [new GlowFilter({
            color: randomBuildingColor, // Use the random building color for the glow
            distance: 10,
            outerStrength: 1,
            innerStrength: 0.2,
            quality: 0.5
        })];
        app.stage.addChild(building);
        buildings.push(building);
    }

    // Reset game state variables
    alienSpawnTimer = 0;
    score = 0;
    lives = GAME_RULES.startingLives;
    nukes = 0;
    lastNukeScore = 0;
    difficultyLevel = 0;
    currentSpawnInterval = GAME_RULES.difficulty.spawnIntervalStart;
    gameOver = false;
    gameStarted = false; // Important for title screen flow
    pendingGameOver = false; // Reset the pending game over flag

    // Reset input states
    keys = {};
    canShoot = true;
    canNormalShoot = true; // Reset normal fire ability
    normalShootTimer = 0; // Reset normal fire timer
    rapidFire = false;
    rapidFireNotified = false;
    rapidFireTimer = 0;
    rapidFireActive = false;
    rapidFireTimerSeconds = 0;
    lastRapidFireThreshold = 0;

    // Reset HUD
    updateScoreHUD();
    updateLivesHUD();
    updateNukesHUD();
    updateBuildingsHUD(buildings.length); // Initialize buildings HUD

    // Reset player position and glow
    player.x = GAME_WIDTH / 2;
    player.y = PLAYER_MAX_Y;

    // Reset glow breathing state
    glowBreathingFactor = GLOW_MIN_STRENGTH;
    glowBreathingDirection = 1;
    playerGlowFilter.color = 0x00ff00; // Ensure default green color
    playerGlowFilter.outerStrength = glowBreathingFactor; // Set initial strength

    // Hide game over screen
    gameoverContainer.style.display = 'none';

    // Show title screen
    showTitleScreen();

    phantomAlien = null;
    phantomAlienShootTimer = 0;
    lastPhantomScore = 0;
}

function restartGame() {
    resetGameState(); // Call the comprehensive reset
}

function useNuke() {
    if (nukes <= 0) return;
    nukes--;
    updateNukesHUD();
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
        // Apply filter if not already applied, and set color to white
        if (!player.filters || !player.filters.includes(playerGlowFilter)) {
            player.filters = [playerGlowFilter];
        }
        playerGlowFilter.color = 0xFFFFFF; // Change existing glow color to white
        glowBreathingFactor = GLOW_MIN_STRENGTH; // Start breathing from min strength
    } else {
        // Remove filter if rapid fire is inactive
        if (player.filters && player.filters.includes(playerGlowFilter)) {
            player.filters = player.filters.filter(f => f !== playerGlowFilter);
        }
        // playerGlowFilter.color = 0x00ff00; // No need to reset color if filter is removed
    }
}

function spawnPhantomAlien() {
    if (phantomAlien) return; // Don't spawn if one already exists

    const width = ALIEN_WIDTH * 1.5;
    const height = ALIEN_HEIGHT * 1.5;
    const speed = Math.random() * (GAME_RULES.phantomAlien.maxSpeed - GAME_RULES.phantomAlien.minSpeed) + GAME_RULES.phantomAlien.minSpeed;
    const fromLeft = Math.random() < 0.5;

    const alien = new PIXI.Graphics();
    // Draw pixel UFO (like the image)
    // Body (ellipse, metallic gray)
    alien.beginFill(0xcccccc); // Light gray
    alien.drawEllipse(0, 0, width * 0.7, height * 0.35);
    alien.endFill();
    // Dome (blue, top center)
    alien.beginFill(0x4fc3f7); // Blue
    alien.drawEllipse(0, -height * 0.18, width * 0.35, height * 0.18);
    alien.endFill();
    // Dome highlight
    alien.beginFill(0xffffff, 0.7);
    alien.drawEllipse(width * 0.12, -height * 0.22, width * 0.09, height * 0.05);
    alien.endFill();
    // Black base (under dome)
    alien.beginFill(0x222222);
    alien.drawRect(-width * 0.18, -height * 0.05, width * 0.36, height * 0.08);
    alien.endFill();
    // Yellow lights (bottom)
    alien.beginFill(0xffeb3b);
    for (let i = -2; i <= 2; i++) {
        alien.drawCircle(i * width * 0.18, height * 0.18, width * 0.04);
    }
    alien.endFill();
    // Black outline (simulate pixel art border)
    alien.lineStyle(3, 0x000000, 1);
    alien.drawEllipse(0, 0, width * 0.7, height * 0.35);
    alien.drawEllipse(0, -height * 0.18, width * 0.35, height * 0.18);
    alien.drawRect(-width * 0.18, -height * 0.05, width * 0.36, height * 0.08);
    // Glow
    const phantomGlowFilter = new GlowFilter({
        color: 0x00FFFF,
        distance: 20,
        outerStrength: 2,
        innerStrength: 0.5,
        quality: 0.5
    });
    alien.filters = [phantomGlowFilter];
    // Position at edge of screen, Y only in top half
    alien.x = fromLeft ? -width : GAME_WIDTH + width;
    alien.y = Math.random() * (GAME_HEIGHT / 2 - height) + height; // Only in top half
    alien.vx = speed * (fromLeft ? 1 : -1);
    alien.vy = 0;
    alien.isPhantom = true;
    alien.hp = GAME_RULES.phantomAlien.hp;
    alien.alienWidth = width * 1.4; // For collision, a bit wider
    alien.alienHeight = height * 1.1;
    alien.shootTimer = 0;
    alien.fromLeft = fromLeft;
    phantomAlien = alien;
    aliens.push(alien);
    phantomSound.currentTime = 0;
    phantomSound.play();
}

// Main Game Loop (app.ticker.add) - Must be added ONLY ONCE globally
app.ticker.add(() => {
    if (gameOver || !gameStarted) {
        // Only animate stars if the game has started
        if (!gameStarted || gameOver) {
            if (!phantomSound.paused) {
                phantomSound.pause();
                phantomSound.currentTime = 0;
            }
        }
        return;
    }

    // Starfield animation - only runs when gameStarted is true
    starGfx.clear();
    starGfx.beginFill(0xffffff);
    for (const star of stars) {
        star.y += star.speed;
        if (star.y > GAME_HEIGHT) star.y = 0;
        starGfx.drawCircle(star.x, star.y, star.r);
    }
    starGfx.endFill();

    // Player movement
    if (keys['ArrowLeft'] || keys['a']) { player.x -= PLAYER_SPEED; }
    if (keys['ArrowRight'] || keys['d']) { player.x += PLAYER_SPEED; }
    if (keys['ArrowUp'] || keys['w']) { player.y -= PLAYER_SPEED; }
    if (keys['ArrowDown'] || keys['s']) { player.y += PLAYER_SPEED; }
    if (player.x < PLAYER_WIDTH/2) player.x = PLAYER_WIDTH/2;
    if (player.x > GAME_WIDTH - PLAYER_WIDTH/2) player.x = GAME_WIDTH - PLAYER_WIDTH/2;
    if (player.y < PLAYER_MIN_Y) player.y = PLAYER_MIN_Y;
    if (player.y > PLAYER_MAX_Y) player.y = PLAYER_MAX_Y;

    // Move bullets (update existing bullet movement code)
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= BULLET_SPEED;
        if (bullet.y < -20) {
            app.stage.removeChild(bullet);
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
        if (alien.isPhantom) {
            // Phantom Alien movement
            alien.y += Math.sin(alien.x * 0.05) * 2; // Zigzag motion
            if ((alien.fromLeft && alien.x > GAME_WIDTH + alien.alienWidth) || 
                (!alien.fromLeft && alien.x < -alien.alienWidth)) {
                app.stage.removeChild(alien);
                aliens.splice(aliens.indexOf(alien), 1);
                phantomAlien = null;
                phantomSound.pause();
                phantomSound.currentTime = 0;
            }
        } else {
            // Regular alien movement
            if (alien.x < alien.alienWidth/2 || alien.x > GAME_WIDTH - alien.alienWidth/2) {
                alien.vx *= -1;
                alien.y += 30;
            } else {
                alien.y += alien.vy;
            }
        }
    }

    // Check for Phantom Alien spawn
    const currentPhantomThreshold = Math.floor(score / GAME_RULES.phantomAlien.scoreThreshold);
    if (currentPhantomThreshold > Math.floor(lastPhantomScore / GAME_RULES.phantomAlien.scoreThreshold)) {
        spawnPhantomAlien();
        lastPhantomScore = score;
    }

    // Update bullet-alien collision to handle Phantom Alien points
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = aliens.length - 1; j >= 0; j--) {
            const bullet = bullets[i];
            const alien = aliens[j];
            if (
                Math.abs(bullet.x - alien.x) < (alien.alienWidth/2 + 4) &&
                Math.abs(bullet.y - alien.y) < (alien.alienHeight/2 + 12)
            ) {
                // Only allow player bullets to hit Phantom Alien
                if (alien.isPhantom && bullet.vy !== undefined) continue;
                app.stage.removeChild(bullet);
                bullets.splice(i, 1);
                alien.hp--;
                if (alien.hp <= 0) {
                    app.stage.removeChild(alien);
                    aliens.splice(j, 1);
                    let points;
                    if (alien.isPhantom) {
                        points = GAME_RULES.phantomAlien.bonusScore;
                        phantomAlien = null;
                        phantomSound.pause();
                        phantomSound.currentTime = 0;
                    } else {
                        points = alien.isTough ? GAME_RULES.points.toughAlien : GAME_RULES.points.normalAlien;
                    }
                    score += points;
                    updateScoreHUD();
                    playExplosion();
                    createExplosion(alien.x, alien.y);
                } else {
                    alien.tint = 0xffffff;
                    setTimeout(() => { alien.tint = 0xFFFFFF; }, 100);
                }
                break;
            }
        }
    }

    // Check if any alien collides with the player
    for (let j = aliens.length - 1; j >= 0; j--) {
        const alien = aliens[j];
        if (
            Math.abs(alien.x - player.x) < (alien.alienWidth / 2 + PLAYER_WIDTH / 2) &&
            Math.abs(alien.y - player.y) < (alien.alienHeight / 2 + PLAYER_HEIGHT / 2)
        ) {
            app.stage.removeChild(alien);
            aliens.splice(j, 1);
            if (alien.isPhantom) {
                phantomAlien = null;
                phantomSound.pause();
                phantomSound.currentTime = 0;
            }
            lives--;
            updateLivesHUD();
            playExplosion();
            createExplosion(player.x, player.y); // Add explosion at player's location
            // Reset player position to start
            player.x = GAME_WIDTH / 2;
            player.y = PLAYER_MAX_Y;
            if (lives <= 0) {
                gameOver = true;
                showGameOver();
            }
        }
    }

    // Check if any alien collides with a building
    for (let i = aliens.length - 1; i >= 0; i--) {
        const alien = aliens[i];
        for (let j = buildings.length - 1; j >= 0; j--) {
            const building = buildings[j];
            // Simple AABB collision
            if (
                alien.x < building.x + building.width &&
                alien.x + alien.alienWidth > building.x &&
                alien.y < building.y + building.height &&
                alien.y + alien.alienHeight > building.y
            ) {
                app.stage.removeChild(alien);
                aliens.splice(i, 1);
                app.stage.removeChild(building);
                buildings.splice(j, 1);
                createExplosion(building.x + building.width / 2, building.y + building.height / 2);
                playExplosion();
                updateBuildingsHUD(buildings.length); // Update buildings HUD

                if (buildings.length <= 0) {
                    // Game over pending, wait for explosion to finish
                    pendingGameOver = true;
                }
                break;
            }
        }
    }

    // Check if any alien reaches the city base (bottom of the screen)
    for (let i = aliens.length - 1; i >= 0; i--) {
        const alien = aliens[i];
        // Collision if alien's bottom edge is below or at the city base's top edge
        if (alien.y + alien.alienHeight / 2 >= (GAME_HEIGHT - 30)) {
            app.stage.removeChild(alien);
            aliens.splice(i, 1);
            createExplosion(alien.x, alien.y); // Explosion at alien's position
            playExplosion();
            break; // No need to check other aliens if this one hit the base
        }
    }

    // Animate explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.age++;
        exp.alpha = 1 - (exp.age / exp.maxAge); // Linear fade out from 1 to 0

        // Update glow filter alpha (strength will fade with overall alpha)
        if (exp.glowFilter) {
            exp.glowFilter.outerStrength = 0.5 * exp.alpha; // Link glow strength to overall alpha
            exp.glowFilter.innerStrength = 0.5 * exp.alpha;
        }

        exp.gfx.clear();

        if (exp.alpha <= 0 || exp.age > exp.maxAge) {
            app.stage.removeChild(exp.gfx);
            explosions.splice(i, 1);
            continue;
        }

        // Draw pixelated starburst
        const currentScale = exp.age / exp.maxAge;
        const basePixelSize = 20; // Further increased base size for truly massive pixels and overall explosion

        // Central bright pixel
        exp.gfx.beginFill(0xFFFFFF, exp.alpha); // White core
        const coreSize = basePixelSize * 2 * currentScale;
        exp.gfx.drawRect(-coreSize / 2, -coreSize / 2, coreSize, coreSize);
        exp.gfx.endFill();

        // First layer of cross arms (red/orange)
        exp.gfx.beginFill(0xFF3300, exp.alpha); // Brighter red/orange
        const arm1Offset = basePixelSize * 1 * currentScale;
        const arm1Size = basePixelSize * currentScale;
        exp.gfx.drawRect(-arm1Offset - arm1Size / 2, -arm1Size / 2, arm1Size, arm1Size); // Left
        exp.gfx.drawRect(arm1Offset - arm1Size / 2, -arm1Size / 2, arm1Size, arm1Size); // Right
        exp.gfx.drawRect(-arm1Size / 2, -arm1Offset - arm1Size / 2, arm1Size, arm1Size); // Top
        exp.gfx.drawRect(-arm1Size / 2, arm1Offset - arm1Size / 2, arm1Size, arm1Size); // Bottom
        exp.gfx.endFill();

        // Second layer of cross/diagonal elements (darker red)
        exp.gfx.beginFill(0xCC0000, exp.alpha * 0.9); // Darker red, slightly more transparent
        const arm2Offset = basePixelSize * 2.5 * currentScale;
        const arm2Size = basePixelSize * 0.8 * currentScale;
        // Horizontal/Vertical
        exp.gfx.drawRect(-arm2Offset - arm2Size / 2, -arm2Size / 2, arm2Size, arm2Size);
        exp.gfx.drawRect(arm2Offset - arm2Size / 2, -arm2Size / 2, arm2Size, arm2Size);
        exp.gfx.drawRect(-arm2Size / 2, -arm2Offset - arm2Size / 2, arm2Size, arm2Size);
        exp.gfx.drawRect(-arm2Size / 2, arm2Offset - arm2Size / 2, arm2Size, arm2Size);
        // Diagonal
        exp.gfx.drawRect(-arm2Offset * 0.7 - arm2Size / 2, -arm2Offset * 0.7 - arm2Size / 2, arm2Size, arm2Size);
        exp.gfx.drawRect(arm2Offset * 0.7 - arm2Size / 2, -arm2Offset * 0.7 - arm2Size / 2, arm2Size, arm2Size);
        exp.gfx.drawRect(-arm2Offset * 0.7 - arm2Size / 2, arm2Offset * 0.7 - arm2Size / 2, arm2Size, arm2Size);
        exp.gfx.drawRect(arm2Offset * 0.7 - arm2Size / 2, arm2Offset * 0.7 - arm2Size / 2, arm2Size, arm2Size);
        exp.gfx.endFill();

        // Outer most scattered pixels (even darker red, most transparent)
        exp.gfx.beginFill(0x990000, exp.alpha * 0.6); // Even darker red, more transparent
        const arm3Offset = basePixelSize * 4 * currentScale;
        const arm3Size = basePixelSize * 0.6 * currentScale;
        exp.gfx.drawRect(-arm3Offset - arm3Size / 2, -arm3Size / 2, arm3Size, arm3Size);
        exp.gfx.drawRect(arm3Offset - arm3Size / 2, -arm3Size / 2, arm3Size, arm3Size);
        exp.gfx.drawRect(-arm3Size / 2, -arm3Offset - arm3Size / 2, arm3Size, arm3Size);
        exp.gfx.drawRect(-arm3Size / 2, arm3Offset - arm3Size / 2, arm3Size, arm3Size);

        exp.gfx.drawRect(-arm3Offset * 0.7 - arm3Size / 2, -arm3Offset * 0.7 - arm3Size / 2, arm3Size, arm3Size);
        exp.gfx.drawRect(arm3Offset * 0.7 - arm3Size / 2, -arm3Offset * 0.7 - arm3Size / 2, arm3Size, arm3Size);
        exp.gfx.drawRect(-arm3Offset * 0.7 - arm3Size / 2, arm3Offset * 0.7 - arm3Size / 2, arm3Size, arm3Size);
        exp.gfx.drawRect(arm3Offset * 0.7 - arm3Size / 2, arm3Offset * 0.7 - arm3Size / 2, arm3Size, arm3Size);
        exp.gfx.endFill();
    }

    // If game over is pending and all explosions have finished, show game over
    if (pendingGameOver && explosions.length === 0) {
        gameOver = true;
        showGameOver();
    }

    // Player glow breathing animation (runs continuously)
    if (rapidFireActive) {
        glowBreathingFactor += glowBreathingDirection * GLOW_BREATHING_SPEED;

        if (glowBreathingFactor > GLOW_MAX_STRENGTH) {
            glowBreathingFactor = GLOW_MAX_STRENGTH;
            glowBreathingDirection = -1;
        } else if (glowBreathingFactor < GLOW_MIN_STRENGTH) {
            glowBreathingFactor = GLOW_MIN_STRENGTH;
            glowBreathingDirection = 1;
        }
        playerGlowFilter.outerStrength = glowBreathingFactor;
    }

    // Rapid fire logic
    if (rapidFireActive && keys[' ']) {
        rapidFireTimer++;
        if (rapidFireTimer >= RAPID_FIRE_INTERVAL) {
            shootBullet();
            rapidFireTimer = 0;
        }
    } else {
        rapidFireTimer = RAPID_FIRE_INTERVAL;
    }

    // Normal fire cooldown logic
    if (!canNormalShoot) {
        normalShootTimer++;
        if (normalShootTimer >= GAME_RULES.normalFireCooldown) {
            canNormalShoot = true;
            normalShootTimer = 0;
        }
    }

    updateDifficulty();
    const currentThreshold = Math.floor(score / GAME_RULES.rapidFireThreshold); // Use GAME_RULES.rapidFireThreshold
    if (currentThreshold > lastRapidFireThreshold) {
        rapidFireActive = true;
        rapidFireTimerSeconds = GAME_RULES.rapidFireDuration;
        updateRapidFireGlow();
        lastRapidFireThreshold = currentThreshold;
    }
    if (rapidFireActive) {
        rapidFireTimerSeconds -= app.ticker.deltaMS / 1000;
        if (rapidFireTimerSeconds <= 0) {
            rapidFireActive = false;
            updateRapidFireGlow();
        }
    }
});

// Initial call to load game rules and then start the game
loadGameRules(); 