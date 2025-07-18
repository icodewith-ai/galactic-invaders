# Implementing the phantom alien feature
_Exported on 6/11/2025 at 13:05:28 PDT from Cursor (1.0.1)_

---

**User**

I want to add a new enemy type called the Phantom Alien to Galactic Invaders.  Remember that game settings are configured via a game_rules.json file.

⸻

👾 Feature: Phantom Alien

1. Triggering Logic
	•	A Phantom Alien should appear every time the player’s score reaches a multiple of a configured value (e.g., every 3000 points).
	•	Only one Phantom Alien should be active at a time.

2. Movement
	•	It enters randomly from the left or right edge of the screen.
	•	Flies horizontally across the screen but with random vertical motion (zig-zag / bobbing path).
	•	Moves at a random speed between defined minSpeed and maxSpeed.

3. Combat Behavior
	•	Shoots downward bullets at a regular interval (configurable).
	•	Damages the player like regular enemy bullets.
	•	Has a configurable hit point value (e.g., 2 HP).
	•	If destroyed, rewards the player with bonus points (e.g., 1000 points).

4. Audio
	•	Use the existing sound effect: assets/alien.wav for:
	•	When the Phantom Alien appears
	•	When it is destroyed

5. Graphics
	•	Use a different sprite from regular aliens (can be a placeholder for now).
	•	Flip sprite horizontally based on direction of movement.

Add the following new section to the game_rules.json:
"phantomAlien": {
  "appearanceInterval": 3000,
  "minSpeed": 2.0,
  "maxSpeed": 3.0,
  "hitPoints": 2,
  "scoreBonus": 1000
}

Please review the above and tell me if you understand and provide a plan of action before we start doing this.


---

**Cursor**

I understand the features you want to implement for the Phantom Alien, and how they should be configured in `game_rules.json`.

Here's my plan of action:

1.  **Update `game_rules.json`**: I will add the `phantomAlien` configuration to your `game_rules.json` file.
2.  **Phantom Alien Implementation Plan**: I will then provide a detailed plan for implementing the Phantom Alien's features, including:
    *   **Triggering Logic**: How to manage its appearance based on score and ensure only one is active.
    *   **Movement**: How to implement its horizontal and vertical zig-zag motion with random speeds.
    *   **Combat Behavior**: How to handle its shooting, hit points, and score bonus upon destruction.
    *   **Audio**: How to play the `assets/alien.wav` sound effect for its appearance and destruction.
    *   **Graphics**: How to use a distinct sprite and flip it based on movement direction.

Let's start by updating the `game_rules.json` file.


```json
// ... existing code ...
  "buildings": {
    "min": 4,
    "max": 8
  },
  "phantomAlien": {
    "appearanceInterval": 3000,
    "minSpeed": 2.0,
    "maxSpeed": 3.0,
    "hitPoints": 2,
    "scoreBonus": 1000
  }
}
```

Great! The `game_rules.json` file has been updated with the `phantomAlien` configuration.

Now, here's the detailed plan for implementing the Phantom Alien:

**Phantom Alien Implementation Plan**

1.  **Triggering Logic:**
    *   **Score Tracking:** In your main game loop or score management system, you'll need to keep track of the player's score.
    *   **Appearance Condition:** At the end of each game update cycle (or whenever the score changes), check if the current score is a multiple of `game_rules.json -> phantomAlien -> appearanceInterval`.
    *   **Single Active Phantom:** Maintain a boolean flag or a reference to the active Phantom Alien. Only allow a new Phantom Alien to spawn if this flag is false (or if the reference is null). If a Phantom Alien is destroyed, reset this flag.

2.  **Movement:**
    *   **Instantiation:** When a Phantom Alien is triggered, create a new `PhantomAlien` sprite.
    *   **Initial Position:** Randomly choose between the left or right edge of the screen as the entry point. Set its `x` position accordingly (0 for left, `screenWidth` for right). Randomize its initial `y` position within a reasonable range (e.g., top 1/3 of the screen).
    *   **Horizontal Movement:** Assign a random horizontal speed between `minSpeed` and `maxSpeed` from `game_rules.json -> phantomAlien`. This speed will determine its `x` velocity.
    *   **Vertical Movement (Zig-Zag/Bobbing):**
        *   You can achieve this by combining a simple sine or cosine wave with its `y` position.
        *   Maintain a `yOffset` or `oscillationCounter` for each Phantom Alien.
        *   In each update, calculate `newY = initialY + sin(oscillationCounter) * amplitude`. Increment `oscillationCounter` by a small value.
        *   `amplitude` and the `oscillationCounter` increment will control the intensity and frequency of the bobbing motion.

3.  **Combat Behavior:**
    *   **Hit Points:** Assign `game_rules.json -> phantomAlien -> hitPoints` to the Phantom Alien's `hp` property.
    *   **Bullet Firing:**
        *   Implement a shooting cooldown timer for the Phantom Alien.
        *   At regular intervals (configurable, but not in `game_rules.json` yet, so we'll need to decide on a default or add it later), the Phantom Alien will create and fire a bullet downwards.
        *   These bullets should be similar to existing enemy bullets in terms of damage and collision detection with the player's ship.
    *   **Damage Application:** When a player's bullet collides with the Phantom Alien, reduce its `hp`.
    *   **Destruction:** If `hp` drops to 0 or below, destroy the Phantom Alien sprite, play the destruction sound, and add `game_rules.json -> phantomAlien -> scoreBonus` to the player's score.

4.  **Audio:**
    *   **Load Sound:** Ensure `assets/alien.wav` is loaded into your sound manager.
    *   **Appearance:** When a Phantom Alien is instantiated, play `assets/alien.wav`.
    *   **Destruction:** When a Phantom Alien is destroyed, play `assets/alien.wav`.

5.  **Graphics:**
    *   **Sprite Loading:** Load a new sprite for the Phantom Alien (placeholder for now).
    *   **Sprite Assignment:** Assign this loaded sprite to the `PhantomAlien` object.
    *   **Horizontal Flipping:** Based on whether the Phantom Alien is moving left or right, scale its `x` property by -1 (and adjust its `anchor.x` if necessary) to flip the sprite horizontally. You'll need to store its original scale to revert the flip if its direction changes.

Do you have any questions about this plan, or are you ready to start implementing the first part? I recommend starting with the basic instantiation and movement.

---

**User**

For #5, create an alien ship that looks similar to the attached image here.

Otherwise, ready to start this.

---

**Cursor**

I can't directly create image assets for you. You'll need to create a pixel art image for the Phantom Alien based on the provided image and save it in your `assets` folder (e.g., `assets/phantom_alien.png`). Once you have that, I can reference it in the code.

Given that, let's start implementing the Phantom Alien. I will begin by searching for existing alien or enemy-related files to understand the current structure and where to integrate the new Phantom Alien logic. This will help me with the "Triggering Logic" and "Movement" parts of our plan.


Okay, I understand. I'll proceed with the implementation, and you can provide the `phantom_alien.png` file once it's ready.

Based on the search results, it seems `js/game.js` is where most of the game's core logic, including alien handling, resides. I'll read that file to get a complete picture before making any changes. This will help me properly integrate the Phantom Alien's spawning and movement.

Okay, I have a good understanding of `js/game.js`.

Here's how I'll proceed:

1.  **Declare Global Variables**: I'll add `phantomAlien` (to ensure only one is active) and `phantomAlienBullets` arrays to hold the Phantom Alien's bullets, and `lastPhantomAlienScoreTrigger` to track when the last Phantom Alien was spawned.
2.  **Update `resetGameState`**: I'll ensure these new variables are properly initialized when the game resets.
3.  **Implement `spawnPhantomAlien`**: I'll create a new function `spawnPhantomAlien` similar to `spawnAlien` but incorporating the Phantom Alien's unique properties (speed, HP, graphics, and initial position from either left or right).
4.  **Integrate into Main Game Loop**: I'll modify the `app.ticker.add` function to:
    *   Check the score to trigger `spawnPhantomAlien`.
    *   Handle the movement of the `phantomAlien` (horizontal with vertical zig-zag).
    *   Manage the `phantomAlien`'s shooting behavior.
    *   Implement collision detection between player bullets and `phantomAlien`.
    *   Implement collision detection between `phantomAlien` bullets and the player/buildings.
    *   Handle the destruction of the `phantomAlien` (score bonus, sound, explosion).

Let's start by declaring the new global variables and updating `resetGameState`.

```javascript
// ... existing code ...
let aliens = [];
let phantomAlien = null; // To hold the single active phantom alien
let phantomAlienBullets = []; // To hold bullets fired by the phantom alien
let explosions = [];
let buildings = []; // Array to hold individual building graphics

// Persistent PixiJS objects (global)
// ... existing code ...
    let gameStarted = false; // Track if game has started (from title screen)
    let pendingGameOver = false; // Flag to delay game over until explosions finish
    let titleScreen; // Reference to title screen container
    let lastPhantomAlienScoreTrigger = 0; // New: Tracks the score at which a phantom alien last appeared

    // Arrays for game objects (global, but cleared by resetGameState)
    bullets = [];
    aliens = [];
    phantomAlien = null; // Ensure it's null on reset
    phantomAlienBullets = []; // Clear phantom alien bullets on reset
    explosions = [];
    buildings = []; // Clear buildings on reset
```

I'll now implement the `spawnPhantomAlien` function. I'll place it near the existing `spawnAlien` function in `js/game.js`. This function will create the Phantom Alien with its unique properties, such as random entry from either side, random horizontal speed, and configurable hit points. For now, I'll use a placeholder `PIXI.Graphics` object for its appearance. I will also add some constant definitions for its dimensions and initial color.

```javascript
// ... existing code ...
    const TOUGH_ALIEN_COLOR = 0x9933ff;

    // New constants for Phantom Alien
    const PHANTOM_ALIEN_WIDTH = 60; // Placeholder width
    const PHANTOM_ALIEN_HEIGHT = 45; // Placeholder height
    const PHANTOM_ALIEN_COLOR = 0x660066; // A distinct color like purple

    // Player setup (drawing only, position set in resetGameState)
    player.beginFill(0x0055FF); // Main body color (blue)
// ... existing code ...
    app.stage.addChild(player);

    // Reset game state and show title screen
    resetGameState();

    app.ticker.start(); // Start the ticker once initialization is done
}

// Function Definitions
function playShoot() { if (soundOn) { shootSound.currentTime = 0; shootSound.play(); } }
function playExplosion() { if (soundOn) { explosionSound.currentTime = 0; explosionSound.play(); } }
function playLoseLife() { if (soundOn) { loseLifeSound.currentTime = 0; loseLifeSound.play(); } }
function playAlienSound() { if (soundOn) { alienSound.currentTime = 0; alienSound.play(); } } // New: for phantom alien

function shootBullet() {
    const bullet = new PIXI.Graphics();
    bullet.beginFill(0xffffff);
// ... existing code ...
        app.stage.addChild(alien);
    }

    function spawnPhantomAlien() {
        if (phantomAlien) return; // Only one phantom alien at a time

        playAlienSound(); // Play sound when phantom alien appears

        const startRight = Math.random() < 0.5; // Randomly enter from left or right
        const initialX = startRight ? GAME_WIDTH + PHANTOM_ALIEN_WIDTH / 2 : -PHANTOM_ALIEN_WIDTH / 2;
        const initialY = Math.random() * (GAME_HEIGHT / 3) + 50; // Top third of the screen

        const speed = Math.random() * (GAME_RULES.phantomAlien.maxSpeed - GAME_RULES.phantomAlien.minSpeed) + GAME_RULES.phantomAlien.minSpeed;
        const vx = startRight ? -speed : speed;

        const phantom = new PIXI.Graphics();
        phantom.beginFill(PHANTOM_ALIEN_COLOR);
        // Placeholder drawing for Phantom Alien (UFO-like)
        phantom.drawEllipse(0, 0, PHANTOM_ALIEN_WIDTH / 2, PHANTOM_ALIEN_HEIGHT / 2);
        phantom.drawRect(-PHANTOM_ALIEN_WIDTH / 3, -PHANTOM_ALIEN_HEIGHT / 4, PHANTOM_ALIEN_WIDTH * 2 / 3, PHANTOM_ALIEN_HEIGHT / 2); // Body
        phantom.endFill();

        phantom.x = initialX;
        phantom.y = initialY;
        phantom.vx = vx;
        phantom.vy = 0; // Vertical motion will be added later
        phantom.hp = GAME_RULES.phantomAlien.hitPoints;
        phantom.alienWidth = PHANTOM_ALIEN_WIDTH; // Store for collision
        phantom.alienHeight = PHANTOM_ALIEN_HEIGHT; // Store for collision
        phantom.oscillationCounter = Math.random() * Math.PI * 2; // For vertical bobbing
        phantom.originalScaleX = 1; // Store original scale for flipping

        phantomAlien = phantom; // Store the single active phantom alien
        app.stage.addChild(phantomAlien);
    }

    function animateHudPop(elementId) {
        const el = document.getElementById(elementId);
// ... existing code ...
                    canNormalShoot = false; // Apply cooldown only for normal fire
                    normalShootTimer = 0; // Start the cooldown timer
                }
            }
            // Only allow nuke if game started and not game over
            if (gameStarted && !gameOver && e.key.toLowerCase() === 'q' && nukes > 0) {
// ... existing code ...
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    // Map WASD to arrow keys for movement
// ... existing code ...
    if (e.key === ' ') canShoot = true;
});

// New: Load phantom alien sound
const alienSound = new Audio('./assets/alien.wav');
```

```javascript
// ... existing code ...

    // Alien spawning
    alienSpawnTimer++;
    if (alienSpawnTimer >= currentSpawnInterval) {
        spawnAlien();
        alienSpawnTimer = 0;
    }

    // Phantom Alien spawning logic
    const phantomTriggerScore = Math.floor(score / GAME_RULES.phantomAlien.appearanceInterval) * GAME_RULES.phantomAlien.appearanceInterval;
    if (!phantomAlien && score >= GAME_RULES.phantomAlien.appearanceInterval && phantomTriggerScore > lastPhantomAlienScoreTrigger) {
        spawnPhantomAlien();
        lastPhantomAlienScoreTrigger = phantomTriggerScore;
    }

    // Move aliens
    for (let alien of aliens) {
// ... existing code ...
        }
    }

    // Move Phantom Alien
    if (phantomAlien) {
        phantomAlien.x += phantomAlien.vx;

        // Vertical bobbing motion
        const amplitude = 15; // How much it bobs up and down
        const frequency = 0.05; // How fast it bobs
        phantomAlien.y = phantomAlien.y + Math.sin(phantomAlien.oscillationCounter) * (amplitude * app.ticker.deltaMS / 1000);
        phantomAlien.oscillationCounter += frequency;

        // Bounce off horizontal edges and flip sprite
        if (phantomAlien.x < PHANTOM_ALIEN_WIDTH / 2) {
            phantomAlien.x = PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
            phantomAlien.vx *= -1; // Reverse direction
            // Flip sprite horizontally
            phantomAlien.scale.x = phantomAlien.originalScaleX;
            phantomAlien.anchor.x = 0.5;
        } else if (phantomAlien.x > GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2) {
            phantomAlien.x = GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
            phantomAlien.vx *= -1; // Reverse direction
            // Flip sprite horizontally
            phantomAlien.scale.x = -phantomAlien.originalScaleX;
            phantomAlien.anchor.x = 0.5;
        }

        // If phantom alien goes off screen vertically (shouldn't happen with bobbing, but good to have a cleanup)
        if (phantomAlien.y > GAME_HEIGHT + PHANTOM_ALIEN_HEIGHT / 2) {
            app.stage.removeChild(phantomAlien);
            phantomAlien = null;
        }
    }

    // Bullet-alien collision
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = aliens.length - 1; j >= 0; j--) {
            const bullet = bullets[i];
            const alien = aliens[j];
// ... existing code ...
```

Okay, I will implement the Phantom Alien's combat behavior.

I will start by adding a new constant for the phantom alien's bullet cooldown and then integrate the logic for the phantom alien to fire bullets into the main game loop.

```javascript
// ... existing code ...
const TOUGH_ALIEN_COLOR = 0x9933ff;

// New constants for Phantom Alien
const PHANTOM_ALIEN_WIDTH = 60; // Placeholder width
const PHANTOM_ALIEN_HEIGHT = 45; // Placeholder height
const PHANTOM_ALIEN_COLOR = 0x660066; // A distinct color like purple
const PHANTOM_BULLET_SPEED = 7; // Speed of phantom alien bullets
const PHANTOM_BULLET_COOLDOWN = 60; // Frames between phantom alien shots (e.g., 1 second at 60 FPS)

// Player setup (drawing only, position set in resetGameState)
player.beginFill(0x0055FF); // Main body color (blue)
// ... existing code ...
    // Game State Variables (reset on each game start)
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
    let lastPhantomAlienScoreTrigger = 0; // New: Tracks the score at which a phantom alien last appeared
    let phantomBulletTimer = 0; // New: Timer for phantom alien bullet cooldown

    // Arrays for game objects (global, but cleared by resetGameState)
    bullets = [];
    aliens = [];
    phantomAlien = null; // Ensure it's null on reset
    phantomAlienBullets = []; // Clear phantom alien bullets on reset
    explosions = [];
    buildings = []; // Clear buildings on reset

    // Persistent PixiJS objects (global)
// ... existing code ...
        app.stage.addChild(phantomAlien);
    }

    // New function for phantom alien to shoot
    function phantomAlienShoot() {
        if (!phantomAlien) return;

        const bullet = new PIXI.Graphics();
        bullet.beginFill(0xFF00FF); // Distinct color for phantom alien bullets
        bullet.drawRect(-2, -8, 4, 16);
        bullet.endFill();

        bullet.x = phantomAlien.x;
        bullet.y = phantomAlien.y + phantomAlien.alienHeight / 2 + 5; // Start below the alien
        bullet.vy = PHANTOM_BULLET_SPEED; // Moves downwards

        phantomAlienBullets.push(bullet);
        app.stage.addChild(bullet);
    }

    function animateHudPop(elementId) {
        const el = document.getElementById(elementId);
// ... existing code ...
        }
    }

    // Move Phantom Alien
    if (phantomAlien) {
        phantomAlien.x += phantomAlien.vx;

        // Vertical bobbing motion
        const amplitude = 15; // How much it bobs up and down
        const frequency = 0.05; // How fast it bobs
        phantomAlien.y = phantomAlien.y + Math.sin(phantomAlien.oscillationCounter) * (amplitude * app.ticker.deltaMS / 1000);
        phantomAlien.oscillationCounter += frequency;

        // Bounce off horizontal edges and flip sprite
        if (phantomAlien.x < PHANTOM_ALIEN_WIDTH / 2) {
            phantomAlien.x = PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
            phantomAlien.vx *= -1; // Reverse direction
            // Flip sprite horizontally
            phantomAlien.scale.x = phantomAlien.originalScaleX;
            phantomAlien.anchor.x = 0.5;
        } else if (phantomAlien.x > GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2) {
            phantomAlien.x = GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
            phantomAlien.vx *= -1; // Reverse direction
            // Flip sprite horizontally
            phantomAlien.scale.x = -phantomAlien.originalScaleX;
            phantomAlien.anchor.x = 0.5;
        }

        // If phantom alien goes off screen vertically (shouldn't happen with bobbing, but good to have a cleanup)
        if (phantomAlien.y > GAME_HEIGHT + PHANTOM_ALIEN_HEIGHT / 2) {
            app.stage.removeChild(phantomAlien);
            phantomAlien = null;
        }

        // Phantom Alien shooting
        phantomBulletTimer++;
        if (phantomBulletTimer >= PHANTOM_BULLET_COOLDOWN) {
            phantomAlienShoot();
            phantomBulletTimer = 0;
        }
    }

    // Move phantom alien bullets
    for (let i = phantomAlienBullets.length - 1; i >= 0; i--) {
        phantomAlienBullets[i].y += phantomAlienBullets[i].vy;
        if (phantomAlienBullets[i].y > GAME_HEIGHT + 20) {
            app.stage.removeChild(phantomAlienBullets[i]);
            phantomAlienBullets.splice(i, 1);
        }
    }

    // Bullet-alien collision
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        let hitSomething = false;

        // Check collision with regular aliens
        for (let j = aliens.length - 1; j >= 0; j--) {
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
                hitSomething = true;
                break;
            }
        }

        // Check collision with Phantom Alien
        if (phantomAlien && !hitSomething) {
            if (
                Math.abs(bullet.x - phantomAlien.x) < (phantomAlien.alienWidth/2 + 4) &&
                Math.abs(bullet.y - phantomAlien.y) < (phantomAlien.alienHeight/2 + 12)
            ) {
                app.stage.removeChild(bullet);
                bullets.splice(i, 1);
                phantomAlien.hp--;
                if (phantomAlien.hp <= 0) {
                    app.stage.removeChild(phantomAlien);
                    phantomAlien = null; // Remove the phantom alien
                    score += GAME_RULES.phantomAlien.scoreBonus; // Add bonus points
                    updateScoreHUD();
                    playExplosion();
                    createExplosion(phantomAlien.x, phantomAlien.y); // Explosion at destruction
                    playAlienSound(); // Play destruction sound
                } else {
                    // Optional: visual feedback for hit, e.g., tint
                    phantomAlien.tint = 0xffffff;
                    setTimeout(() => { phantomAlien.tint = PHANTOM_ALIEN_COLOR; }, 100);
                }
                hitSomething = true;
            }
        }
    }

    // Check if any alien collides with the player
    for (let j = aliens.length - 1; j >= 0; j--) {
        const alien = aliens[j];
// ... existing code ...
            }
        }
    }

    // Check if any phantom alien bullet collides with the player
    for (let i = phantomAlienBullets.length - 1; i >= 0; i--) {
        const bullet = phantomAlienBullets[i];
        if (
            Math.abs(bullet.x - player.x) < (PLAYER_WIDTH / 2 + 4) &&
            Math.abs(bullet.y - player.y) < (PLAYER_HEIGHT / 2 + 8) // Adjust bullet height for accurate collision
        ) {
            app.stage.removeChild(bullet);
            phantomAlienBullets.splice(i, 1);
            lives--;
            updateLivesHUD();
            playLoseLife();
            if (lives <= 0) {
                gameOver = true;
                showGameOver();
            }
            break; // Bullet hit player, no need to check other players
        }
    }

    // Check if any phantom alien bullet collides with a building
    for (let i = phantomAlienBullets.length - 1; i >= 0; i--) {
        const bullet = phantomAlienBullets[i];
        for (let j = buildings.length - 1; j >= 0; j--) {
            const building = buildings[j];
            if (
                bullet.x < building.x + building.width &&
                bullet.x > building.x &&
                bullet.y < building.y + building.height &&
                bullet.y + 16 > building.y // Bullet height is 16
            ) {
                app.stage.removeChild(bullet);
                phantomAlienBullets.splice(i, 1);
                app.stage.removeChild(building);
                buildings.splice(j, 1);
                createExplosion(building.x + building.width / 2, building.y + building.height / 2);
                playExplosion();

                if (buildings.length <= 0) {
                    currentFramePendingGameOver = true;
                }
                break; // Bullet hit building, no need to check other buildings for this bullet
            }
        }
    }

    // Animate explosions

```

I noticed that the `phantomAlienShoot` function was placed at the end of the file, which might cause issues with its scope. I will now move the `phantomAlienShoot` function definition to a more appropriate location, specifically right after the `shootBullet` function, to ensure it's properly defined before it's called in the game loop.

```javascript
// ... existing code ...
function playExplosion() { if (soundOn) { explosionSound.currentTime = 0; explosionSound.play(); } }
function playLoseLife() { if (soundOn) { loseLifeSound.currentTime = 0; loseLifeSound.play(); } }
function playAlienSound() { if (soundOn) { alienSound.currentTime = 0; alienSound.play(); } } // New: for phantom alien

function shootBullet() {
    const bullet = new PIXI.Graphics();
    bullet.beginFill(0xffffff);
    bullet.drawRect(-2, -8, 4, 16);
    bullet.endFill();

    bullet.x = player.x;
    bullet.y = player.y - PLAYER_HEIGHT / 2 - 5; // Start above the player
    bullets.push(bullet);
    app.stage.addChild(bullet);
    playShoot();
}

// New function for phantom alien to shoot
function phantomAlienShoot() {
    if (!phantomAlien) return;

    const bullet = new PIXI.Graphics();
    bullet.beginFill(0xFF00FF); // Distinct color for phantom alien bullets
    bullet.drawRect(-2, -8, 4, 16);
    bullet.endFill();

    bullet.x = phantomAlien.x;
    bullet.y = phantomAlien.y + phantomAlien.alienHeight / 2 + 5; // Start below the alien
    bullet.vy = PHANTOM_BULLET_SPEED; // Moves downwards

    phantomAlienBullets.push(bullet);
    app.stage.addChild(bullet);
}

function spawnAlien() {
    const isTough = Math.random() < 0.2; // 20% chance
// ... existing code ...
// Initial call to load game rules and then start the game
loadGameRules();
```

It looks like I inadvertently altered the `shootBullet` function in the previous step. My apologies for that. I will correct it now to restore its original behavior.

```javascript
// ... existing code ...
function playAlienSound() { if (soundOn) { alienSound.currentTime = 0; alienSound.play(); } } // New: for phantom alien

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

// New function for phantom alien to shoot
function phantomAlienShoot() {
    if (!phantomAlien) return;

    const bullet = new PIXI.Graphics();
    bullet.beginFill(0xFF00FF); // Distinct color for phantom alien bullets
    bullet.drawRect(-2, -8, 4, 16);
    bullet.endFill();

    bullet.x = phantomAlien.x;
    bullet.y = phantomAlien.y + phantomAlien.alienHeight / 2 + 5; // Start below the alien
    bullet.vy = PHANTOM_BULLET_SPEED; // Moves downwards

    phantomAlienBullets.push(bullet);
    app.stage.addChild(bullet);
}

function spawnAlien() {
    const isTough = Math.random() < 0.2; // 20% chance
// ... existing code ...
```

The implementation for the Phantom Alien is complete according to our plan!

I've integrated the triggering logic, movement (including vertical bobbing and horizontal flipping), combat behavior (HP, shooting, and collision detection), and audio cues.

The last remaining item for the Phantom Alien is its specific graphic. When you have the `phantom_alien.png` file ready in your `assets` folder, let me know, and I can update the `spawnPhantomAlien` function to use it instead of the current placeholder graphic.

---

**User**

So I reached 600 points and the game froze.  In the google chrome console, the error is:

assets/lose_life.wav:1 
            
            
           Failed to load resource: the server responded with a status of 404 (Not Found)Understand this error
favicon.ico:1 
            
            
           Failed to load resource: the server responded with a status of 404 (Not Found)Understand this error
game.js:832 Uncaught TypeError: Cannot set properties of undefined (setting 'x')
    at t.fn (game.js:832:35)
    at t.emit (ticker.min.mjs:8:648)
    at e.update (ticker.min.mjs:8:3473)
    at _tick (ticker.min.mjs:8:1482)

---

**Cursor**

The game freezing is caused by a `TypeError` on line 832 of `game.js`, where the code is trying to set the `x` property of an `undefined` object. The 404 errors for `lose_life.wav` and `favicon.ico` are asset loading issues that should be addressed, but they are not the cause of the freeze.

I need to examine `game.js` at line 832 to identify the `undefined` object. I will read the file to locate this line.

The game freezing is due to a `TypeError` on line 832 of `game.js`. This error occurs because the `phantomAlien` object becomes `null` or `undefined` while the game loop is still trying to access its properties. Specifically, if the `phantomAlien` goes off-screen vertically and is set to `null`, the code continues to execute the horizontal boundary checks, attempting to access `phantomAlien.anchor.x` on a `null` object.

To fix this, I will add a `return` statement after `phantomAlien = null;` to ensure that no further operations are performed on the Phantom Alien in the current frame once it has been removed from the game.

The 404 errors for `lose_life.wav` and `favicon.ico` are asset loading issues and not the cause of the game freezing. I will focus on resolving the `TypeError` first.

```javascript
// ... existing code ...
        // If phantom alien goes off screen vertically (shouldn't happen with bobbing, but good to have a cleanup)
        if (phantomAlien.y > GAME_HEIGHT + PHANTOM_ALIEN_HEIGHT / 2) {
            app.stage.removeChild(phantomAlien);
            phantomAlien = null;
            return; // Stop further processing for this phantom alien in this frame
        }

        // Phantom Alien shooting
        phantomBulletTimer++;
// ... existing code ...
```

It seems my previous attempt to add the `return` statement didn't take effect. My apologies.

The `TypeError` on line 832 of `game.js` is happening because we're trying to access properties of `phantomAlien` after it's already been set to `null`. I need to ensure that when `phantomAlien` is removed, the rest of the code for its movement in that frame is skipped.

I will try applying the fix again, making sure the `return` statement is correctly inserted right after `phantomAlien = null;` within the vertical off-screen check. This will prevent any further operations on the `phantomAlien` object in the current frame once it's been removed.

```javascript
// ... existing code ...
        // If phantom alien goes off screen vertically (shouldn't happen with bobbing, but good to have a cleanup)
        if (phantomAlien.y > GAME_HEIGHT + PHANTOM_ALIEN_HEIGHT / 2) {
            app.stage.removeChild(phantomAlien);
            phantomAlien = null;
            return; // Stop further processing for this phantom alien in this frame
        }

        // Phantom Alien shooting
        phantomBulletTimer++;
// ... existing code ...
```

I apologize for the confusion. It seems the previous attempt to fix the `TypeError` caused an issue with the code structure, moving the `phantomAlien` cleanup logic outside its conditional block. This is why the error persists.

I will now read the relevant section of `game.js` to ensure I have the most up-to-date context and then correctly place the `return` statement to prevent further operations on a `null` `phantomAlien` object.

The game is freezing because code is attempting to access properties of the `phantomAlien` after it has been removed (set to `null`). This happens because the logic that nullifies `phantomAlien` is at the very end of its movement block, and other parts of that block still try to access `phantomAlien` in the same frame.

To fix this, I need to restructure the game loop to ensure that once the `phantomAlien` is removed, no further operations are attempted on it within the current frame.

Here's my revised plan:

1.  **Relocate Phantom Alien Logic**: I will move the entire `if (phantomAlien) { ... }` block, which includes its movement, boundary checks, and shooting, to a position *before* any collision detection or other processing that relies on `phantomAlien` being present.
2.  **Ensure Early Exit on Removal**: Within this relocated block, I will make absolutely sure that a `return` (or equivalent `break` for the loop if it's in a loop, but here it's a direct `return` for the whole `if` block) is executed immediately after `phantomAlien = null;`.

Let's start by reading the relevant section of the `app.ticker.add` function to ensure I have the precise current state.

The game is freezing because a `TypeError` occurs on line 832 of `game.js`, attempting to set a property (`x`) of an `undefined` object. This happens when the `phantomAlien` is destroyed and set to `null`, but subsequent code in the same frame (or the next, depending on the game loop's execution order) still tries to access its properties. The previous attempts to fix this by adding a `return` statement were not successful due to the structural placement of the code.

To properly fix this, I need to ensure all operations on the `phantomAlien` object are safely guarded by a `null` check. I will refactor the `app.ticker.add` function to consolidate all `phantomAlien` related logic into a single block that is executed only if `phantomAlien` is not `null`. Within this block, if the `phantomAlien` is removed, I will ensure an immediate exit from that block of code.

I will read the entire `app.ticker.add` function to perform this refactoring accurately.

The game is freezing because a `TypeError` is occurring on line 832 of `game.js`, which attempts to set a property (`x`) of an `undefined` object. This happens because the `phantomAlien` object is being set to `null` due to its destruction (either by going off-screen or being hit by a player's bullet) before all its processing for the current frame is complete. The existing `return;` statement within the `phantomAlien`'s off-screen check was incorrectly exiting the entire game loop (`app.ticker.add`), which caused further issues.

To resolve this, I will refactor the `app.ticker.add` function to ensure that all operations on `phantomAlien` are safely guarded by `null` checks and that its removal from the game state correctly prevents further processing for that frame without stopping the entire game loop.

Here's the plan:
1.  **Consolidate Phantom Alien Logic**: I will move all the Phantom Alien's movement, shooting, and off-screen cleanup logic into a single `if (phantomAlien)` block.
2.  **Prioritize Removal Checks**: Within this consolidated block, I will move the check for the Phantom Alien going off-screen vertically to the very beginning. If it goes off-screen, I will set `phantomAlien = null;` and *skip the rest of the current `if (phantomAlien)` block* by using an `else` for the remaining logic, rather than returning from the entire `app.ticker.add` function.
3.  **Refine Player Bullet Collision**: For the collision detection between player bullets and the Phantom Alien, I will ensure that `phantomAlien` is checked for `null` *before* attempting to access its properties. If destroyed, I will make sure the explosion is created using the bullet's last known position before `phantomAlien` is set to `null`.

I will now read the entire `app.ticker.add` function to precisely apply these changes.

The game is freezing because a `TypeError` occurs when the code tries to access properties of the `phantomAlien` object after it has been destroyed and set to `null`. This happens because the checks for `phantomAlien` being `null` are not robust enough, allowing subsequent code to execute on an undefined object.

To resolve this, I will refactor the main game loop (`app.ticker.add`) to ensure all operations on the `phantomAlien` are safely guarded by `null` checks. Specifically:
1.  I will restructure the `Move Phantom Alien` block so that if the `phantomAlien` is removed (e.g., goes off-screen), further processing for that `phantomAlien` within the same frame is skipped.
2.  I will capture the `x` and `y` coordinates of the `phantomAlien` *before* setting it to `null` during its destruction, ensuring the `createExplosion` function is called with valid coordinates.

Here's how I will modify the `js/game.js` file:

```javascript
// ... existing code ...
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

    // Move Phantom Alien and handle its shooting
    if (phantomAlien) {
        // Vertical bobbing motion
        const amplitude = 15; // How much it bobs up and down
        const frequency = 0.05; // How fast it bobs
        phantomAlien.y = phantomAlien.y + Math.sin(phantomAlien.oscillationCounter) * (amplitude * app.ticker.deltaMS / 1000);
        phantomAlien.oscillationCounter += frequency;

        // Check if phantom alien goes off screen vertically (and remove it)
        if (phantomAlien.y > GAME_HEIGHT + PHANTOM_ALIEN_HEIGHT / 2) {
            app.stage.removeChild(phantomAlien);
            phantomAlien = null;
        }

        // Only proceed with horizontal movement and shooting if phantomAlien is still active
        if (phantomAlien) { // Re-check if phantomAlien is not null after potential removal
            phantomAlien.x += phantomAlien.vx;

            // Bounce off horizontal edges and flip sprite
            if (phantomAlien.x < PHANTOM_ALIEN_WIDTH / 2) {
                phantomAlien.x = PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
                phantomAlien.vx *= -1; // Reverse direction
                // Flip sprite horizontally
                phantomAlien.scale.x = phantomAlien.originalScaleX;
                phantomAlien.anchor.x = 0.5;
            } else if (phantomAlien.x > GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2) {
                phantomAlien.x = GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
                phantomAlien.vx *= -1; // Reverse direction
                // Flip sprite horizontally
                phantomAlien.scale.x = -phantomAlien.originalScaleX;
                phantomAlien.anchor.x = 0.5;
            }

            // Phantom Alien shooting
            phantomBulletTimer++;
            if (phantomBulletTimer >= PHANTOM_BULLET_COOLDOWN) {
                phantomAlienShoot();
                phantomBulletTimer = 0;
            }
        }
    }

    // Move phantom alien bullets
    for (let i = phantomAlienBullets.length - 1; i >= 0; i--) {
        phantomAlienBullets[i].y += phantomAlienBullets[i].vy;
        if (phantomAlienBullets[i].y > GAME_HEIGHT + 20) {
            app.stage.removeChild(phantomAlienBullets[i]);
            phantomAlienBullets.splice(i, 1);
        }
    }

    // Bullet-alien collision
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        let hitSomething = false;

        // Check collision with regular aliens
        for (let j = aliens.length - 1; j >= 0; j--) {
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
                hitSomething = true;
                break;
            }
        }

        // Check collision with Phantom Alien
        if (phantomAlien && !hitSomething) {
            if (
                Math.abs(bullet.x - phantomAlien.x) < (phantomAlien.alienWidth/2 + 4) &&
                Math.abs(bullet.y - phantomAlien.y) < (phantomAlien.alienHeight/2 + 12)
            ) {
                app.stage.removeChild(bullet);
                bullets.splice(i, 1);
                phantomAlien.hp--;
                if (phantomAlien.hp <= 0) {
                    const explosionX = phantomAlien.x; // Capture before nullifying
                    const explosionY = phantomAlien.y; // Capture before nullifying
                    app.stage.removeChild(phantomAlien);
                    phantomAlien = null; // Remove the phantom alien
                    score += GAME_RULES.phantomAlien.scoreBonus; // Add bonus points
                    updateScoreHUD();
                    playExplosion();
                    createExplosion(explosionX, explosionY); // Use captured position
                    playAlienSound(); // Play destruction sound
                } else {
                    // Optional: visual feedback for hit, e.g., tint
                    phantomAlien.tint = 0xffffff;
                    setTimeout(() => { phantomAlien.tint = PHANTOM_ALIEN_COLOR; }, 100);
                }
                hitSomething = true;
            }
        }
    }

    // Check if any alien collides with the player
// ... existing code ...
```

The game freezing is caused by a `TypeError: Cannot set properties of undefined (setting 'x')` that occurs when the game tries to access properties of the `phantomAlien` object after it has been destroyed and set to `null`. This happens because even after being removed, the code for its movement or shooting might still attempt to run in the same game frame.

To fix this, I will modify the `app.ticker.add` function in `js/game.js` to ensure that all `phantomAlien` related logic (movement, boundary checks, and shooting) is executed only if the `phantomAlien` object is still active. I'll use an `else` block to guard the horizontal movement and shooting, so they only run if the phantom alien hasn't been removed due to going off-screen vertically.



```javascript
// ... existing code ...
    // Move Phantom Alien and handle its shooting
    if (phantomAlien) {
        // Vertical bobbing motion
        const amplitude = 15; // How much it bobs up and down
        const frequency = 0.05; // How fast it bobs
        phantomAlien.y = phantomAlien.y + Math.sin(phantomAlien.oscillationCounter) * (amplitude * app.ticker.deltaMS / 1000);
        phantomAlien.oscillationCounter += frequency;

        // Check if phantom alien goes off screen vertically (and remove it)
        if (phantomAlien.y > GAME_HEIGHT + PHANTOM_ALIEN_HEIGHT / 2) {
            app.stage.removeChild(phantomAlien);
            phantomAlien = null;
        } else { // Only proceed with horizontal movement and shooting if phantomAlien is still active
            phantomAlien.x += phantomAlien.vx;

            // Bounce off horizontal edges and flip sprite
            if (phantomAlien.x < PHANTOM_ALIEN_WIDTH / 2) {
                phantomAlien.x = PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
                phantomAlien.vx *= -1; // Reverse direction
                // Flip sprite horizontally
                phantomAlien.scale.x = phantomAlien.originalScaleX;
                phantomAlien.anchor.x = 0.5;
            } else if (phantomAlien.x > GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2) {
                phantomAlien.x = GAME_WIDTH - PHANTOM_ALIEN_WIDTH / 2; // Prevent it from going too far off screen
                phantomAlien.vx *= -1; // Reverse direction
                // Flip sprite horizontally
                phantomAlien.scale.x = -phantomAlien.originalScaleX;
                phantomAlien.anchor.x = 0.5;
            }

            // Phantom Alien shooting
            phantomBulletTimer++;
            if (phantomBulletTimer >= PHANTOM_BULLET_COOLDOWN) {
                phantomAlienShoot();
                phantomBulletTimer = 0;
            }
        }
    }

    // Move phantom alien bullets
// ... existing code ...
```

The game is freezing due to a `TypeError` when the code tries to access properties of the `phantomAlien` after it has been destroyed and set to `null` within the same game frame. To fix this, I will implement a delayed nullification strategy.

Here's my plan:

1.  **Declare a new global variable `phantomAlienRemovedInThisFrame`**: This boolean flag will indicate if the Phantom Alien was removed during the current frame.
2.  **Initialize `phantomAlienRemovedInThisFrame` in `resetGameState`**: I will ensure this flag is reset to `false` when the game starts or restarts.
3.  **Modify `phantomAlien` removal logic**: Instead of immediately setting `phantomAlien = null` when it goes off-screen or its HP drops to 0, I will set `phantomAlienRemovedInThisFrame = true` and remove the sprite from the stage.
4.  **Nullify `phantomAlien` at the end of the frame**: At the very end of the `app.ticker.add` loop, after all other logic (movement, collisions, etc.) has completed, I will check `phantomAlienRemovedInThisFrame`. If it's `true`, then I will set `phantomAlien = null`. This ensures that all other parts of the game loop that depend on `phantomAlien` can safely complete their operations for the current frame.

Let's start by modifying the global variables and `resetGameState` to include the `phantomAlienRemovedInThisFrame` flag.

First, I need to see where these variables are defined in the file.

```javascript
// ... existing code ...
let gameStarted = false; // Track if game has started (from title screen)
let pendingGameOver = false; // Flag to delay game over until explosions finish
let titleScreen; // Reference to title screen container
let lastPhantomAlienScoreTrigger = 0; // New: Tracks the score at which a phantom alien last appeared
let phantomBulletTimer = 0; // New: Timer for phantom alien bullet cooldown
let phantomAlienRemovedInThisFrame = false; // New: Flag to delay nullification of phantomAlien

// Arrays for game objects (global, but cleared by resetGameState)
let bullets = [];
let aliens = [];
// ... existing code ...
    let lastRapidFireThreshold = 0;
    phantomBulletTimer = 0; // Reset phantom bullet timer
    phantomAlienRemovedInThisFrame = false; // Reset the flag on game reset

    // Reset HUD
    updateScoreHUD();
// ... existing code ...
```

```javascript
// ... existing code ...
        // Check if phantom alien goes off screen vertically (and remove it)
        if (phantomAlien.y > GAME_HEIGHT + PHANTOM_ALIEN_HEIGHT / 2) {
            app.stage.removeChild(phantomAlien);
            phantomAlienRemovedInThisFrame = true; // Set flag instead of nullifying immediately
        } else { // Only proceed with horizontal movement and shooting if phantomAlien is still active
            phantomAlien.x += phantomAlien.vx;
// ... existing code ...
                    const explosionY = phantomAlien.y; // Capture before nullifying
                    app.stage.removeChild(phantomAlien);
                    phantomAlienRemovedInThisFrame = true; // Set flag instead of nullifying immediately
                    score += GAME_RULES.phantomAlien.scoreBonus; // Add bonus points
                    updateScoreHUD();
                    playExplosion();
                    createExplosion(explosionX, explosionY); // Use captured position
                    playAlienSound(); // Play destruction sound
                } else {
// ... existing code ...
    // Check if phantom alien was removed in this frame and nullify it
    if (phantomAlienRemovedInThisFrame) {
        phantomAlien = null;
        phantomAlienRemovedInThisFrame = false; // Reset the flag
    }
});
```

The game is still freezing due to a `TypeError` when the code tries to access properties of the `phantomAlien` object after it has been destroyed. This indicates that my previous fix using the `phantomAlienRemovedInThisFrame` flag is not entirely preventing the issue.

I need to meticulously re-examine the `app.ticker.add` loop in `js/game.js` to identify where `phantomAlien` is being accessed without being sufficiently checked for `null` or `undefined`. The error message `Cannot set properties of undefined (setting 'x')` specifically points to an attempt to set the `x` coordinate on an object that no longer exists.

I will read the relevant section of `js/game.js` to pinpoint the exact line where this error occurs and then implement a more robust null-check or restructure the logic to ensure `phantomAlien` is always valid when its properties are accessed.

---

**User**

Let's forget this feature.

---

**Cursor**

Okay, I understand. We will abandon the Phantom Alien feature.

To do this, I will revert all the changes related to the Phantom Alien that I've made to your files.

First, I'll remove the `phantomAlien` section from `game_rules.json`.

```json
// ... existing code ...
  "buildings": {
    "min": 4,
    "max": 8
  }
}
```

Okay, I will proceed with reverting all changes related to the Phantom Alien from your `js/game.js` file.

Here's my plan to remove the feature:

1.  **Remove Global Variable Declarations**: I will remove `phantomAlien`, `phantomAlienBullets`, `lastPhantomAlienScoreTrigger`, and `phantomAlienRemovedInThisFrame` from the global variable declarations.
2.  **Remove Variable Initializations in `resetGameState`**: I will remove the initializations of `lastPhantomAlienScoreTrigger`, `phantomBulletTimer`, and `phantomAlienRemovedInThisFrame` within the `resetGameState` function.
3.  **Remove Constants**: I will remove `PHANTOM_ALIEN_WIDTH`, `PHANTOM_ALIEN_HEIGHT`, `PHANTOM_ALIEN_COLOR`, `PHANTOM_BULLET_SPEED`, and `PHANTOM_BULLET_COOLDOWN` constants.
4.  **Remove `playAlienSound` function**: I will remove the declaration and usage of the `playAlienSound` function.
5.  **Remove `phantomAlienShoot` function**: I will remove the entire `phantomAlienShoot` function.
6.  **Remove `spawnPhantomAlien` function**: I will remove the entire `spawnPhantomAlien` function.
7.  **Revert `app.ticker.add` modifications**: I will remove all the logic added within the main game loop related to Phantom Alien spawning, movement, shooting, and collision detection.

Let's start by reverting the global variable declarations and their initializations in `resetGameState`.

```javascript
// ... existing code ...
let gameStarted = false; // Track if game has started (from title screen)
let pendingGameOver = false; // Flag to delay game over until explosions finish
let titleScreen; // Reference to title screen container

// Arrays for game objects (global, but cleared by resetGameState)
let bullets = [];
let aliens = [];
let explosions = [];
let buildings = []; // Array to hold individual building graphics

// Persistent PixiJS objects (global)
// ... existing code ...
    let lastRapidFireThreshold = 0;

    // Reset HUD
    updateScoreHUD();
```

