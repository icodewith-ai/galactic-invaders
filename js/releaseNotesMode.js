let releaseNotesModeActive = false;
let releaseNotesPopup;
let releaseNotesContent;
let pixiAppInstance; // To hold the PixiJS app instance

function toggleReleaseNotesMode() {
    // Check if other modes are active - if so, don't open release notes
    if (!releaseNotesModeActive) {
        if ((window.devModeControl && window.devModeControl.isDeveloperModeActive()) || 
            (window.helpModeControl && window.helpModeControl.isHelpModeActive())) {
            return; // Don't open release notes if other modes are active
        }
    }

    releaseNotesModeActive = !releaseNotesModeActive;

    if (releaseNotesPopup) {
        releaseNotesPopup.classList.toggle('active', releaseNotesModeActive);
    }

    if (releaseNotesModeActive) {
        fetchAndRenderReleaseNotes();
        if (pixiAppInstance) {
            pixiAppInstance.ticker.stop(); // Pause game when release notes are active
        }
    } else {
        if (pixiAppInstance) {
            pixiAppInstance.ticker.start(); // Resume game when release notes are off
        }
    }
}

async function fetchAndRenderReleaseNotes() {
    if (releaseNotesContent) {
        try {
            const response = await fetch('./release_notes.md');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let markdownText = await response.text();
            // Remove the first line (the main title) from the markdown content
            markdownText = markdownText.split('\n').slice(1).join('\n');
            releaseNotesContent.innerHTML = '<br><br>' + marked.parse(markdownText); // Convert markdown to HTML and add a line break
            // Add instruction about closing
            const closeInstruction = document.createElement('p');
            closeInstruction.style.fontSize = '0.8em';
            closeInstruction.style.marginTop = '10px';
            closeInstruction.style.textAlign = 'center';
            closeInstruction.style.color = '#aaa';
            closeInstruction.textContent = '(Press Shift+5 again or click X to close)';
            releaseNotesContent.prepend(closeInstruction); // Add to the top of the content

        } catch (error) {
            console.error('Error fetching release notes:', error);
            releaseNotesContent.textContent = 'Failed to load release notes.';
        }
    } else {
        console.warn('releaseNotesContent element not found during fetchAndRenderReleaseNotes.');
    }
}

// This function will be called from game.js
function initReleaseNotesMode(appInstance) {
    pixiAppInstance = appInstance;

    releaseNotesPopup = document.getElementById('release-notes-popup');
    releaseNotesContent = document.getElementById('release-notes-content');
    const closeButton = document.getElementById('release-notes-close-btn'); // Get the close button element

    // Add event listener for the close button
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            toggleReleaseNotesMode();
        });
    } else {
        console.error('Release Notes close button element not found!');
    }

    // Add event listener for the 'Shift+5' key to toggle release notes
    window.addEventListener('keydown', (e) => {
        if (e.key === '%' && e.shiftKey) {
            toggleReleaseNotesMode();
            e.preventDefault();
        }
    });


    // Return an object that game.js can use to check the release notes mode status
    return {
        isReleaseNotesModeActive: () => releaseNotesModeActive
    };
} 