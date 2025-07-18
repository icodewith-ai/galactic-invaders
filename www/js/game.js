// Only declare GlowFilter from PIXI.filters, do not redeclare PIXI
const GlowFilter = PIXI.filters.GlowFilter;

const gameContainer = document.getElementById('game-container');

// Create PixiJS app (this stays global)
const app = new PIXI.Application({
    resizeTo: gameContainer, // This makes PixiJS automatically resize the renderer to the gameContainer
    backgroundColor: 0x000000
});
gameContainer.appendChild(app.view);

// Global variables that should persist or be initialized only once
let GAME_RULES = null;
let soundOn = true; // Sound toggle state
let devModeControl = null; // Control object for developer mode
let releaseNotesModeControl = null; // NEW: Control object for release notes mode

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

// New: Object pool for explosions
let explosionPool = [];

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
let PLAYER_MIN_Y;
let PLAYER_MAX_Y;
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

// Starfield setup (will be initialized in initializeGame)
const STAR_COUNT = 80;
const stars = [];

// City and Buildings setup (will be initialized in initializeGame)
// (cityBase drawing moved to initializeGame)

// Sound effects (loaded here, or could be preloaded once globally)
const shootSound = new Audio('./assets/shoot.wav');
const explosionSound = new Audio('./assets/explosion.wav');
const phantomSound = new Audio('./assets/phantomalien.wav');
phantomSound.loop = true;

// Event listeners for input (attached once globally)
window.addEventListener('keydown', (e) => {
    // If developer mode or release notes mode is active, prevent normal game input
    if ((devModeControl && devModeControl.isDeveloperModeActive()) || 
        (releaseNotesModeControl && releaseNotesModeControl.isReleaseNotesModeActive())) {
        return;
    }

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
        // NEW: If sound is turned off, pause phantomSound if it's playing
        if (!soundOn && phantomAlien && !phantomSound.paused) {
            phantomSound.pause();
            phantomSound.currentTime = 0;
        }
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
    // Initialize developer mode after game rules are loaded
    if (typeof initDevMode !== 'undefined') { // Check if devMode.js is loaded
        devModeControl = initDevMode(app, GAME_RULES);
    }
    // Initialize release notes mode after game rules are loaded
    if (typeof initReleaseNotesMode !== 'undefined') { // Check if releaseNotesMode.js is loaded
        releaseNotesModeControl = initReleaseNotesMode(app);
    }

    // Add a resize listener to handle dynamic resizing
    window.addEventListener('resize', () => {
        // Give the resizeTo a moment to propagate
        setTimeout(() => {
            if (!gameStarted) {
                showTitleScreen();
            }
             // Re-initialize stars and city for new screen size
            initializeStarsAndCity();

            // reposition player
            if(player) {
                // Recalculate player bounds
                PLAYER_MIN_Y = app.screen.height / 2;
                PLAYER_MAX_Y = app.screen.height - 80 - PLAYER_HEIGHT / 2;

                player.x = app.screen.width / 2;
                player.y = app.screen.height - 100;
            }

            if(gameOver) {
                positionGameoverContainer();
            }
        }, 100); 
    });
}

// This function will contain all game setup and state initialization that runs once after rules are loaded
function initializeGame() {
    // Wait for app to be fully initialized with proper screen dimensions
    if (app.screen.width === 0 || app.screen.height === 0) {
        // Try again in the next frame
        requestAnimationFrame(initializeGame);
        return;
    }

    // Calculate player bounds now that we have valid screen dimensions
    PLAYER_MIN_Y = app.screen.height / 2;
    PLAYER_MAX_Y = app.screen.height - 80 - PLAYER_HEIGHT / 2;

    // Initialize stars and city with valid screen dimensions
    initializeStarsAndCity();
    
    // Add everything to the stage
    app.stage.addChild(starGfx);
    app.stage.addChild(cityBase);
    app.stage.addChild(player);

    resetGameState();
    showTitleScreen(); // Show the title screen first
}

function initializeStarsAndCity() {
    stars.length = 0; // Clear any existing stars
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * app.screen.width,
            y: Math.random() * app.screen.height,
            r: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 1.5 + 0.5
        });
    }

    // Initialize cityBase with valid screen dimensions
    cityBase.clear();
    cityBase.beginFill(0xFF00FF); // Main pink base color
    cityBase.drawRect(0, app.screen.height - 30, app.screen.width, 30);
    cityBase.endFill();

    // Add structured pixel lines for texture
    // Darker pink/magenta vertical lines
    cityBase.beginFill(0xCC00CC); // Darker pink
    for (let x = 0; x < app.screen.width; x += 15) {
        cityBase.drawRect(x, app.screen.height - 30, 7, 30);
    }
    cityBase.endFill();

    // Lighter pink/magenta vertical lines, offset
    cityBase.beginFill(0xFF33FF); // Lighter pink
    for (let x = 7; x < app.screen.width; x += 15) {
        cityBase.drawRect(x, app.screen.height - 25, 4, 25);
    }
    cityBase.endFill();

    // Horizontal accent lines
    cityBase.beginFill(0x990099); // Even darker pink/purple
    cityBase.drawRect(0, app.screen.height - 20, app.screen.width, 10);
    cityBase.endFill();
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
    let gfx;
    let explosionGlowFilter;

    if (explosionPool.length > 0) {
        gfx = explosionPool.pop();
        // Assume gfx comes with a GlowFilter already in its filters array
        explosionGlowFilter = gfx.filters[0]; // Get the existing filter
        gfx.visible = true; // Make it visible again
    } else {
        gfx = new PIXI.Graphics();
        explosionGlowFilter = new GlowFilter({
            color: 0xFF0000, // Red glow
            distance: 80, // Further increased distance for an even bigger glow
            outerStrength: 0.5,
            innerStrength: 0.5,
            quality: 0.5
        });
        gfx.filters = [explosionGlowFilter]; // Attach the filter to the graphics object
    }

    gfx.x = x;
    gfx.y = y;
    gfx.alpha = 1; // Reset alpha for new explosion
    gfx.clear(); // Clear any previous drawing

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
    alien.x = Math.random() * (app.screen.width - width) + width/2;
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
    // If title screen already exists, remove it before creating a new one
    if (titleScreen) {
        app.stage.removeChild(titleScreen);
        titleScreen.destroy({ children: true });
    }
    
    titleScreen = new PIXI.Container();

    // Responsive scaling factor with a minimum value to prevent text from becoming too small
    const rawScale = Math.min(app.screen.width / 800, app.screen.height / 600);
    const scale = Math.max(0.65, rawScale);

    // Define equal top and bottom buffers, then evenly space the 4 content rows
    const topBuffer = app.screen.height * 0.15;
    const bottomBuffer = app.screen.height * 0.15;
    const contentAreaHeight = app.screen.height - topBuffer - bottomBuffer;
    const rowSpacing = contentAreaHeight / 5; // 5 spaces between/around 4 rows
    
    const y_row1 = topBuffer;           // Title
    const y_row2 = topBuffer + 115;       // Aliens
    const y_row3 = topBuffer + 215;       // Instructions Header
    const y_row4 = topBuffer + 500;       // Start prompt

    // Add Galactic Invaders title at the top
    const titleStyle = new PIXI.TextStyle({
        fill: '#FF00FF', fontSize: 36 * scale, fontWeight: 'bold', stroke: '#FFFFFF', strokeThickness: 2, 
        dropShadow: true, dropShadowDistance: 4 * scale, dropShadowColor: '#CC00CC',
        fontFamily: 'Press Start 2P, cursive, Courier New, Courier, monospace'
    });
    
    const gameTitle = new PIXI.Text('Galactic Invaders', titleStyle);
    gameTitle.anchor.set(0.5);
    gameTitle.x = app.screen.width / 2;
    gameTitle.y = y_row1; 
    titleScreen.addChild(gameTitle);
    
    // Add version display below the title
    const versionStyle = new PIXI.TextStyle({
        fill: '#CCCCCC', fontSize: 12 * scale, fontWeight: 'normal',
        fontFamily: 'Press Start 2P, cursive, Courier New, Courier, monospace'
    });
    
    // Fetch version from package.json and add version display
    fetch('../package.json')
        .then(response => response.json())
        .then(data => {
            const versionText = new PIXI.Text(`v${data.version}`, versionStyle);
            versionText.anchor.set(0.5);
            versionText.x = app.screen.width / 2;
            versionText.y = y_row1 + 50; // Position below the title
            titleScreen.addChild(versionText);
        })
        .catch(error => {
            console.error('Error fetching version:', error);
        });

    const headerStyle = new PIXI.TextStyle({
        fill: '#fff', fontSize: 28 * scale, fontWeight: 'bold', stroke: '#FF00FF', strokeThickness: 4, dropShadow: true, dropShadowDistance: 4 * scale, dropShadowColor: '#CC00CC'
    });
    const header = new PIXI.Text('Instructions', headerStyle);
    header.anchor.set(0.5);
    header.x = app.screen.width / 2;
    header.y = y_row3;
    titleScreen.addChild(header);

    // Instructions text (white with pink keys)
    const whiteInstStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 20 * scale, fontWeight: 'normal' });
    const pinkKeyStyle = new PIXI.TextStyle({ fill: 0xFF00FF, fontSize: 20 * scale, fontWeight: 'normal' });

    let currentY = header.y + 50 * scale;

    // Helper to measure text width
    const measureTextWidth = (text, style) => new PIXI.Text(text, style).width;

    // A helper function to create and position a line of text
    const createInstructionLine = (parts, y) => {
        const totalWidth = parts.reduce((width, part) => width + measureTextWidth(part.text, part.style), 0);
        let currentX = app.screen.width / 2 - totalWidth / 2;

        parts.forEach(part => {
            const textObj = new PIXI.Text(part.text, part.style);
            textObj.anchor.set(0, 0.5);
            textObj.x = currentX;
            textObj.y = y;
            titleScreen.addChild(textObj);
            currentX += textObj.width;
        });
    };

    // Line 1: Arrows + WASD + Move
    createInstructionLine([
        { text: '← ↑ → ↓', style: pinkKeyStyle },
        { text: ' or ', style: whiteInstStyle },
        { text: '[WASD]', style: pinkKeyStyle },
        { text: ' Move', style: whiteInstStyle }
    ], currentY);
    currentY += 30 * scale;

    // Line 2: [Space] Shoot
    createInstructionLine([
        { text: '[Space]', style: pinkKeyStyle },
        { text: ' Shoot', style: whiteInstStyle }
    ], currentY);
    currentY += 30 * scale;

    // Line 3: [Q] Use Nuke
    createInstructionLine([
        { text: '[Q]', style: pinkKeyStyle },
        { text: ' Use Nuke', style: whiteInstStyle }
    ], currentY);
    currentY += 30 * scale;

    // Line 4: [M] Toggle Sound
    createInstructionLine([
        { text: '[M]', style: pinkKeyStyle },
        { text: ' Toggle Sound', style: whiteInstStyle }
    ], currentY);

    // Display Alien Information
    const alienInfoStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 16 * scale, fontWeight: 'normal' });
    const alienSpacing = 180 * scale;
    const groupWidth = 2 * alienSpacing;
    const startX = (app.screen.width / 2) - (groupWidth / 2);
    let currentAlienX = startX;
    const alienDisplayY = y_row2;

    // Function to create an alien graphic
    const createAlienGraphic = (color, scaleFactor) => {
        const alien = new PIXI.Graphics();
        const width = ALIEN_WIDTH * scaleFactor;
        const height = ALIEN_HEIGHT * scaleFactor;
        alien.beginFill(color);
        alien.drawRect(-width * 0.4, -height * 0.3, width * 0.8, height * 0.6);
        alien.drawRect(-width * 0.3, -height * 0.5, width * 0.6, height * 0.2);
        alien.endFill();
        alien.beginFill(color); alien.drawRect(-width * 0.3, -height * 0.6, width * 0.08, height * 0.15); alien.endFill();
        alien.beginFill(0xFFFFFF); alien.drawRect(-width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); alien.endFill();
        alien.beginFill(0x000000); alien.drawRect(-width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); alien.endFill();
        alien.beginFill(color); alien.drawRect(width * 0.22, -height * 0.6, width * 0.08, height * 0.15); alien.endFill();
        alien.beginFill(0xFFFFFF); alien.drawRect(width * 0.26 - (width * 0.08 / 2), -height * 0.6 - (width * 0.08 / 2), width * 0.16, width * 0.16); alien.endFill();
        alien.beginFill(0x000000); alien.drawRect(width * 0.26 - (width * 0.04 / 2), -height * 0.6 - (width * 0.04 / 2), width * 0.08, width * 0.08); alien.endFill();
        alien.beginFill(color); alien.drawRect(-width * 0.6, -height * 0.1, width * 0.2, height * 0.3); alien.endFill();
        alien.beginFill(color); alien.drawRect(-width * 0.75, -height * 0.25, width * 0.15, height * 0.1); alien.endFill();
        alien.beginFill(color); alien.drawRect(width * 0.4, -height * 0.1, width * 0.2, height * 0.3); alien.endFill();
        alien.beginFill(color); alien.drawRect(width * 0.6, -height * 0.25, width * 0.15, height * 0.1); alien.endFill();
        return alien;
    };

    // Normal Alien
    const normalAlienPoints = GAME_RULES.points.normalAlien;
    const normalAlienGraphic = createAlienGraphic(ALIEN_COLORS[0], 0.6 * scale);
    normalAlienGraphic.x = currentAlienX;
    normalAlienGraphic.y = alienDisplayY;
    titleScreen.addChild(normalAlienGraphic);
    const normalAlienText = new PIXI.Text(`${normalAlienPoints} Pts`, alienInfoStyle);
    normalAlienText.anchor.set(0.5);
    normalAlienText.x = currentAlienX;
    normalAlienText.y = alienDisplayY + (ALIEN_HEIGHT * 0.6 * scale) / 2 + (15 * scale);
    titleScreen.addChild(normalAlienText);

    currentAlienX += alienSpacing;

    // Tough Alien
    const toughAlienPoints = GAME_RULES.points.toughAlien;
    const toughAlienGraphic = createAlienGraphic(TOUGH_ALIEN_COLOR, 0.75 * scale);
    toughAlienGraphic.x = currentAlienX;
    toughAlienGraphic.y = alienDisplayY;
    titleScreen.addChild(toughAlienGraphic);
    const toughAlienText = new PIXI.Text(`${toughAlienPoints} Pts`, alienInfoStyle);
    toughAlienText.anchor.set(0.5);
    toughAlienText.x = currentAlienX;
    toughAlienText.y = alienDisplayY + (ALIEN_HEIGHT * 0.75 * scale) / 2 + (15 * scale);
    titleScreen.addChild(toughAlienText);

    currentAlienX += alienSpacing;

    // Phantom Alien
    const phantomAlienPoints = GAME_RULES.phantomAlien.bonusScore;
    const phantomAlienGraphic = new PIXI.Graphics();
    const phantomWidth = ALIEN_WIDTH * 0.8 * scale;
    const phantomHeight = ALIEN_HEIGHT * 0.8 * scale;
    phantomAlienGraphic.beginFill(0xcccccc); // Light gray
    phantomAlienGraphic.drawEllipse(0, 0, phantomWidth * 0.7, phantomHeight * 0.35);
    phantomAlienGraphic.endFill();
    phantomAlienGraphic.beginFill(0x4fc3f7); // Blue
    phantomAlienGraphic.drawEllipse(0, -phantomHeight * 0.18, phantomWidth * 0.35, phantomHeight * 0.18);
    phantomAlienGraphic.endFill();
    phantomAlienGraphic.beginFill(0xffffff, 0.7);
    phantomAlienGraphic.drawEllipse(phantomWidth * 0.12, -phantomHeight * 0.22, phantomWidth * 0.09, phantomHeight * 0.05);
    phantomAlienGraphic.endFill();
    phantomAlienGraphic.beginFill(0x222222);
    phantomAlienGraphic.drawRect(-phantomWidth * 0.18, -phantomHeight * 0.05, phantomWidth * 0.36, phantomHeight * 0.08);
    phantomAlienGraphic.endFill();
    phantomAlienGraphic.beginFill(0xffeb3b);
    for (let i = -2; i <= 2; i++) {
        phantomAlienGraphic.drawCircle(i * phantomWidth * 0.18, phantomHeight * 0.18, phantomWidth * 0.04);
    }
    phantomAlienGraphic.endFill();
    phantomAlienGraphic.lineStyle(3 * scale, 0x000000, 1);
    phantomAlienGraphic.drawEllipse(0, 0, phantomWidth * 0.7, phantomHeight * 0.35);
    phantomAlienGraphic.drawEllipse(0, -phantomHeight * 0.18, phantomWidth * 0.35, phantomHeight * 0.18);
    phantomAlienGraphic.drawRect(-phantomWidth * 0.18, -phantomHeight * 0.05, phantomWidth * 0.36, phantomHeight * 0.08);
    const phantomGlowFilter = new GlowFilter({
        color: 0x00FFFF,
        distance: 10 * scale,
        outerStrength: 1,
        innerStrength: 0.2,
        quality: 0.5
    });
    phantomAlienGraphic.filters = [phantomGlowFilter];
    phantomAlienGraphic.x = currentAlienX;
    phantomAlienGraphic.y = alienDisplayY;
    titleScreen.addChild(phantomAlienGraphic);
    const phantomAlienText = new PIXI.Text(`${phantomAlienPoints} Pts`, alienInfoStyle);
    phantomAlienText.anchor.set(0.5);
    phantomAlienText.x = currentAlienX;
    phantomAlienText.y = alienDisplayY + (ALIEN_HEIGHT * 0.8 * scale) / 2 + (15 * scale);
    titleScreen.addChild(phantomAlienText);

    // "Press Enter to Start" text, with original styling, positioned above the player
    const whitePromptStyle = new PIXI.TextStyle({ fill: '#fff', fontSize: 24 * scale, fontStyle: 'italic' });
    const pinkEnterStyle = new PIXI.TextStyle({ fill: 0xFF00FF, fontSize: 24 * scale, fontStyle: 'italic' });
    createInstructionLine([
        { text: 'Press ', style: whitePromptStyle },
        { text: '[Enter]', style: pinkEnterStyle },
        { text: ' to Start', style: whitePromptStyle }
    ], y_row4);
    
    app.stage.addChild(titleScreen);
}

function hideTitleScreen() {
    if (titleScreen) {
        app.stage.removeChild(titleScreen);
        titleScreen.destroy({ children: true });
        titleScreen = null;
    }
    
    // Ensure game objects are visible and properly set up
    player.visible = true;
    cityBase.visible = true;
    
    // Ensure the ticker is running
    if (!app.ticker.started) {
        app.ticker.start();
    }
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

    // Return active explosions to pool before clearing the array
    for (const exp of explosions) {
        app.stage.removeChild(exp.gfx);
        exp.gfx.visible = false;
        exp.gfx.clear(); // Clear graphics for reuse
        explosionPool.push(exp.gfx);
    }
    explosions.length = 0; // Now clear the array

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
            x = Math.floor(Math.random() * (app.screen.width - width - margin));
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
        building.y = app.screen.height - 30 - height;
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
    player.x = app.screen.width / 2;
    player.y = PLAYER_MAX_Y;

    // Reset glow breathing state
    glowBreathingFactor = GLOW_MIN_STRENGTH;
    glowBreathingDirection = 1;
    playerGlowFilter.color = 0x00ff00; // Ensure default green color
    playerGlowFilter.outerStrength = glowBreathingFactor; // Set initial strength

    // Hide game over screen
    gameoverContainer.style.display = 'none';

    phantomAlien = null;
    phantomAlienShootTimer = 0;
    lastPhantomScore = 0;
}

function restartGame() {
    resetGameState(); // Call the comprehensive reset
    showTitleScreen(); // Show title screen after reset
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
    alien.x = fromLeft ? -width : app.screen.width + width;
    alien.y = Math.random() * (app.screen.height / 2 - height) + height; // Only in top half
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
    app.stage.addChild(alien);
    if (soundOn) {
        phantomSound.currentTime = 0;
        phantomSound.play();
    }
}

// Main Game Loop (app.ticker.add) - Must be added ONLY ONCE globally
app.ticker.add(() => {
    // If developer mode or release notes mode is active, stop game updates
    if ((devModeControl && devModeControl.isDeveloperModeActive()) || 
        (releaseNotesModeControl && releaseNotesModeControl.isReleaseNotesModeActive())) {
        return;
    }

    if (gameOver || !gameStarted) {
        // Only animate stars if the game has started
        if (!gameStarted || gameOver) {
            if (soundOn && !phantomSound.paused) {
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
        if (star.y > app.screen.height) star.y = 0;
        starGfx.drawCircle(star.x, star.y, star.r);
    }
    starGfx.endFill();

    // Player movement
    if (keys['ArrowLeft'] || keys['a']) { player.x -= PLAYER_SPEED; }
    if (keys['ArrowRight'] || keys['d']) { player.x += PLAYER_SPEED; }
    if (keys['ArrowUp'] || keys['w']) { player.y -= PLAYER_SPEED; }
    if (keys['ArrowDown'] || keys['s']) { player.y += PLAYER_SPEED; }
    if (player.x < PLAYER_WIDTH/2) player.x = PLAYER_WIDTH/2;
    if (player.x > app.screen.width - PLAYER_WIDTH/2) player.x = app.screen.width - PLAYER_WIDTH/2;
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
        alien.y += alien.vy;
        if (alien.isPhantom) {
            // Phantom Alien movement
            alien.y += Math.sin(alien.x * 0.05) * 2; // Zigzag motion
            if ((alien.fromLeft && alien.x > app.screen.width + alien.alienWidth) || 
                (!alien.fromLeft && alien.x < -alien.alienWidth)) {
                app.stage.removeChild(alien);
                aliens.splice(aliens.indexOf(alien), 1);
                phantomAlien = null;
                if (soundOn && !phantomSound.paused) {
                    phantomSound.pause();
                    phantomSound.currentTime = 0;
                }
            }
        } else {
            // Regular alien movement
            if (alien.x < alien.alienWidth/2 || alien.x > app.screen.width - alien.alienWidth/2) {
                alien.vx *= -1;
                alien.y += 30;
            }
        }
    }

    // Check for Phantom Alien spawn
    if (GAME_RULES && GAME_RULES.phantomAlien && GAME_RULES.phantomAlien.scoreThreshold !== undefined) {
        const currentPhantomThreshold = Math.floor(score / GAME_RULES.phantomAlien.scoreThreshold);
        if (currentPhantomThreshold > Math.floor(lastPhantomScore / GAME_RULES.phantomAlien.scoreThreshold)) {
            spawnPhantomAlien();
            lastPhantomScore = score;
        }
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
                        if (soundOn && !phantomSound.paused) {
                            phantomSound.pause();
                            phantomSound.currentTime = 0;
                        }
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
                if (soundOn && !phantomSound.paused) {
                    phantomSound.pause();
                    phantomSound.currentTime = 0;
                }
            }
            lives--;
            updateLivesHUD();
            playExplosion();
            createExplosion(player.x, player.y); // Add explosion at player's location
            // Reset player position to start
            player.x = app.screen.width / 2;
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
        if (alien.y + alien.alienHeight / 2 >= (app.screen.height - 30)) {
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
            exp.gfx.visible = false; // Hide it
            explosionPool.push(exp.gfx); // Return to pool
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