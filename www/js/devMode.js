let developerModeActive = false;
let devModePopup;
let devRulesContent;
let pixiApp; // To hold the PixiJS app instance
let gameRules; // To hold the GAME_RULES object

function toggleDevMode() {
    developerModeActive = !developerModeActive;

    if (devModePopup) {
        devModePopup.classList.toggle('active', developerModeActive);
    }

    if (developerModeActive) {
        renderDevRules();
        if (pixiApp) {
            pixiApp.ticker.stop(); // Pause game when dev mode is active
        }
    } else {
        if (pixiApp) {
            pixiApp.ticker.start(); // Resume game when dev mode is off
        }
    }
}

function renderDevRules() {
    if (devRulesContent && gameRules) {
        // Pretty-print the JSON content
        devRulesContent.textContent = JSON.stringify(gameRules, null, 2);
    }
}

// This function will be called from game.js
function initDevMode(appInstance, rules) {
    pixiApp = appInstance;
    gameRules = rules;

    devModePopup = document.getElementById('developer-mode-popup');
    devRulesContent = document.getElementById('dev-rules-content');
    const closeButton = document.getElementById('developer-mode-close-btn'); // Get the close button element

    // Add event listener for the close button
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            toggleDevMode();
        });
    } else {
        console.error('Developer mode close button element not found!');
    }

    // Add event listener for the Shift + 6 (^) key to toggle developer mode
    window.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key === '^') {
            toggleDevMode();
            e.preventDefault(); // Prevent typing '^' in the browser
        }
    });

    // Return an object that game.js can use to check the dev mode status
    return {
        isDeveloperModeActive: () => developerModeActive
    };
} 