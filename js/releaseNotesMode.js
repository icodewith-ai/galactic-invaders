let releaseNotesModeActive = false;
let releaseNotesPopup;
let releaseNotesContent;
let pixiAppInstance; // To hold the PixiJS app instance

function toggleReleaseNotesMode() {
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
            // Add instruction about Escape key
            const escapeInstruction = document.createElement('p');
            escapeInstruction.style.fontSize = '0.8em';
            escapeInstruction.style.marginTop = '10px';
            escapeInstruction.style.textAlign = 'center';
            escapeInstruction.style.color = '#aaa';
            escapeInstruction.textContent = '(Press Escape to close)';
            releaseNotesContent.prepend(escapeInstruction); // Add to the top of the content

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
    const releaseNotesLink = document.getElementById('release-notes-link');
    const closeButton = document.getElementById('release-notes-close-btn'); // Get the close button element

    if (releaseNotesLink) {
        releaseNotesLink.addEventListener('click', () => {
            toggleReleaseNotesMode();
        });
    } else {
        console.error('Release Notes link element not found!');
    }

    // Add event listener for the close button
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            toggleReleaseNotesMode();
        });
    } else {
        console.error('Release Notes close button element not found!');
    }

    // Add event listener for the Escape key to close the popup
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && releaseNotesModeActive) {
            toggleReleaseNotesMode();
            e.preventDefault();
        }
    });

    // Return an object that game.js can use to check the release notes mode status
    return {
        isReleaseNotesModeActive: () => releaseNotesModeActive
    };
} 