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
let rapidFire = false;
let rapidFireNotified = false;
const RAPID_FIRE_INTERVAL = 6; // frames between shots when holding
let rapidFireTimer = 0;
let rapidFireActive = false;
let rapidFireTimerSeconds = 0;
const RAPID_FIRE_DURATION = 10; // seconds
let lastRapidFireThreshold = 0;

// Game state variables (global, but reset by resetGameState)
let alienSpawnTimer = 0;
let score = 0;
let lives = 0; // Initialized to 0, will be set from GAME_RULES.startingLives in resetGameState
let nukes = 0;
let lastNukeScore = 0;

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
    outerStrength: 0.5, // Initial low strength, will be animated
    innerStrength: 0.5,
    quality: 0.5
});
player.filters = [playerGlowFilter]; // Assign the filter once

// Glow breathing variables (global)
let glowBreathingFactor = 0.5; // Current outer strength
let glowBreathingDirection = 1; // 1 for increasing, -1 for decreasing
const GLOW_BREATHING_SPEED = 0.03; // Speed of the pulsation
const GLOW_MIN_STRENGTH = 0.8; // Minimum outer strength
const GLOW_MAX_STRENGTH = 2.5; // Maximum outer strength

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
player.beginFill(0x00ff00);
player.moveTo(0, -PLAYER_HEIGHT/2); // top
player.lineTo(-PLAYER_WIDTH/2, PLAYER_HEIGHT/2); // bottom left
player.lineTo(PLAYER_WIDTH/2, PLAYER_HEIGHT/2); // bottom right
player.lineTo(0, -PLAYER_HEIGHT/2); // back to top
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
cityBase.beginFill(0xFF00FF);
cityBase.drawRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 30); // Main base spans full width

// Sound effects (loaded here, or could be preloaded once globally)
const shootSound = new Audio('./assets/shoot.wav');
const explosionSound = new Audio('./assets/explosion.wav');
const loseLifeSound = new Audio('./assets/lose_life.wav');

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
    if (gameStarted && !gameOver && (e.key === ' ' && (canShoot || rapidFireActive))) {
        shootBullet();
        canShoot = false;
    }
    // Only allow nuke if game started and not game over
    if (gameStarted && !gameOver && e.key.toLowerCase() === 'q' && nukes > 0) {
        useNuke();
    }
    // If game has not started yet, any key press will start it
    if (!gameStarted && e.key) {
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
    const speedX = ((Math.random() * 2 + 1.5 + difficultyLevel * 0.5) * (Math.random() < 0.5 ? 1 : -1) * (isTough ? 0.7 : 1)) * GAME_RULES.alienSpeed;
    const speedY = ((Math.random() * 0.7 + 0.5 + difficultyLevel * 0.2) * (isTough ? 0.7 : 1)) * GAME_RULES.alienSpeed;
    const alien = new PIXI.Graphics();
    alien.beginFill(color);
    alien.drawEllipse(0, 0, width/2, height/2);
    alien.endFill();
    alien.beginFill(0x99ccff);
    alien.drawEllipse(0, -height/4, width/4, height/6);
    alien.endFill();
    alien.beginFill(0x000000);
    alien.drawCircle(-width/8, 0, 3);
    alien.drawCircle(width/8, 0, 3);
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
    document.getElementById('nukes-value').textContent = nukes;
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

    // Removed title text from canvas title screen as it's now a persistent HTML element
    // const titleStyle = new PIXI.TextStyle({
    //     fill: '#fff', fontSize: 64, fontWeight: 'bold', stroke: '#FF00FF', strokeThickness: 8, dropShadow: true, dropShadowDistance: 4, dropShadowColor: '#CC00CC'
    // });
    // const title = new PIXI.Text('Galactic Invaders', titleStyle);
    // title.anchor.set(0.5);
    // title.x = GAME_WIDTH / 2;
    // title.y = GAME_HEIGHT / 2 - 175;
    // titleScreen.addChild(title);

    // Removed credit text from canvas title screen as it's now a persistent HTML element
    // const creditStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 24, fontStyle: 'italic', dropShadow: true, dropShadowDistance: 2, dropShadowColor: '#000' });
    // const credit = new PIXI.Text('By Marcelo Lewin', creditStyle);
    // credit.anchor.set(0.5);
    // credit.x = GAME_WIDTH / 2;
    // credit.y = title.y + 50;
    // titleScreen.addChild(credit);

    const headerStyle = new PIXI.TextStyle({
        fill: '#fff', fontSize: 28, fontWeight: 'bold', stroke: '#FF00FF', strokeThickness: 4, dropShadow: true, dropShadowDistance: 4, dropShadowColor: '#CC00CC'
    });
    const header = new PIXI.Text('Instructions', headerStyle);
    header.anchor.set(0.5);
    header.x = GAME_WIDTH / 2;
    header.y = GAME_HEIGHT / 2 - 100; // Adjusted Y position to center instructions better
    titleScreen.addChild(header);

    const instStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 20, fontWeight: 'normal' });
    const instText = '← ↑ → ↓ Move / WASD\n[Space] Shoot\n[Q] Use Nuke\n[M] Toggle Sound';
    const inst = new PIXI.Text(instText, instStyle);
    inst.anchor.set(0.5);
    inst.x = GAME_WIDTH / 2;
    inst.y = header.y + 80; // Increased space below header
    titleScreen.addChild(inst);

    const promptStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 24, fontStyle: 'italic' });
    const prompt = new PIXI.Text('Press Any Key to Start', promptStyle);
    prompt.anchor.set(0.5);
    prompt.x = GAME_WIDTH / 2;
    prompt.y = inst.y + 80; // Extra space above prompt
    titleScreen.addChild(prompt);
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
        building.beginFill(0xFFFFFF); // Changed building color to White
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
            color: 0xFFFFFF, // White glow color
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

    // Reset input state (clear held keys)
    keys = {};
    canShoot = true;
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
        // Change existing glow color to cyan when rapid fire is active
        playerGlowFilter.color = 0x00ffff;
        playerGlowFilter.outerStrength = GLOW_MAX_STRENGTH; // Set to max strength when active
    } else {
        // Revert to default green glow when rapid fire is inactive
        playerGlowFilter.color = 0x00ff00; // Default green glow
        // The outerStrength will be controlled by the breathing animation in the ticker
    }
}

// Main Game Loop (app.ticker.add) - Must be added ONLY ONCE globally
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

    // Player movement
    if (keys['ArrowLeft']) { player.x -= PLAYER_SPEED; }
    if (keys['ArrowRight']) { player.x += PLAYER_SPEED; }
    if (keys['ArrowUp']) { player.y -= PLAYER_SPEED; }
    if (keys['ArrowDown']) { player.y += PLAYER_SPEED; }
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
        if (alien.x < alien.alienWidth/2 || alien.x > GAME_WIDTH - alien.alienWidth/2) {
            alien.vx *= -1;
            alien.y += 30;
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
                app.stage.removeChild(bullet);
                bullets.splice(i, 1);
                alien.hp--;
                if (alien.hp <= 0) {
                    app.stage.removeChild(alien);
                    aliens.splice(j, 1);
                    let basePoints = GAME_RULES.points.normalAlien;
                    let sizeBonus = Math.round((ALIEN_WIDTH - alien.alienWidth) / 10) * GAME_RULES.points.smallAlienBonus;
                    let points = basePoints + sizeBonus;
                    if (alien.isTough) points = Math.max(GAME_RULES.points.toughAlien, points);
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
            lives--;
            updateLivesHUD();
            playLoseLife();
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

    // If game over is pending and all explosions have finished, show game over
    if (pendingGameOver && explosions.length === 0) {
        gameOver = true;
        showGameOver();
    }

    // Player glow breathing animation (only when rapid fire is not active)
    if (!rapidFireActive) {
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

    updateDifficulty();
    const currentThreshold = Math.floor(score / GAME_RULES.rapidFireScore); // Use GAME_RULES.rapidFireScore
    if (currentThreshold > lastRapidFireThreshold) {
        rapidFireActive = true;
        rapidFireTimerSeconds = RAPID_FIRE_DURATION;
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