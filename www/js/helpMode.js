let helpModeActive = false;
let helpPopup;
let helpContent;
let helpPixiAppInstance; // To hold the PixiJS app instance

function toggleHelpMode() {
    // Check if other modes are active - if so, don't open help
    if (!helpModeActive) {
        if ((window.devModeControl && window.devModeControl.isDeveloperModeActive()) || 
            (window.releaseNotesModeControl && window.releaseNotesModeControl.isReleaseNotesModeActive())) {
            return; // Don't open help if other modes are active
        }
    }

    helpModeActive = !helpModeActive;

    if (helpPopup) {
        helpPopup.classList.toggle('active', helpModeActive);
    }

    if (helpModeActive) {
        renderHelpContent();
        if (helpPixiAppInstance) {
            helpPixiAppInstance.ticker.stop(); // Pause game when help is active
        }
    } else {
        if (helpPixiAppInstance) {
            helpPixiAppInstance.ticker.start(); // Resume game when help is off
        }
    }
}

function renderHelpContent() {
    if (helpContent) {
        // Create help content based on controls from README.md
        const helpHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #FF00FF; margin-bottom: 40px;">Game Controls</h3>

                <div style="margin-bottom: 35px;">
                    <h4 style="color: #FFFF00; margin-bottom: 10px;">Objective</h4>
                    <p>Protect your city from alien invasion!</p>
                    <p>Destroy aliens to earn points and unlock nukes.</p>
                    <p>Avoid getting hit and prevent aliens from reaching your city.</p>
                </div>
                
                <div style="margin-bottom: 35px;">
                    <h4 style="color: #00FFFF; margin-bottom: 10px;">Game Play Controls</h4>
                    <p>←, ↑, →, ↓ or [WASD] : Move</p>
                    <p>[Space] : Shoot</p>
                    <p>[Q] : Activate nuke (when available)</p>
                    <p>[M] : Toggle sound on/off</p>
                </div>

                <div style="margin-bottom: 35px;">
                    <h4 style="color: #00FFFF; margin-bottom: 10px;">Other Controls</h4>
                    <p>[Shift] 6 : Toggle Developer Mode</p>
                    <p>[Shift] 5 : Show release notes</p>
                    <p>[H] : Show/Hide help (this window)</p>
                </div>
            </div>
        `;

        helpContent.innerHTML = helpHTML;


    } else {
        console.warn('helpContent element not found during renderHelpContent.');
    }
}

// This function will be called from game.js
function initHelpMode(appInstance) {
    helpPixiAppInstance = appInstance;

    helpPopup = document.getElementById('help-popup');
    helpContent = document.getElementById('help-content');
    const closeButton = document.getElementById('help-close-btn'); // Get the close button element

    // Add event listener for the close button
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            toggleHelpMode();
        });
    } else {
        console.error('Help close button element not found!');
    }

    // Make toggleHelpMode globally accessible
    window.toggleHelpMode = toggleHelpMode;

    // Return an object that game.js can use to check the help mode status and toggle help
    return {
        isHelpModeActive: () => helpModeActive,
        toggleHelpMode: toggleHelpMode
    };
}