# Galactic Invaders

A 2D retro space shooter game built with HTML, CSS, and JavaScript using PixiJS.

## Project Structure

- `www/` - Main game directory
  - `index.html` - Main HTML file
  - `js/` - JavaScript modules
    - `game.js` - Main game logic
    - `devMode.js` - Development mode functionality
    - `releaseNotesMode.js` - Release notes display
  - `assets/` - Game assets (images, sounds, CSS)
  - `game_rules.json` - Game configuration
  - `release_notes.md` - Release notes

## Technologies

- PixiJS for 2D rendering (via CDN)
- HTML5 Audio for sound effects
- JavaScript (ES6+)
- CSS3 for styling

## Development

The game uses a simple web server setup. No build process required.

## Commands

No specific build/test commands configured. Game runs directly in browser with a web server.

## Features

- Smooth player movement with keyboard controls
- Dynamic shooting mechanics
- Progressive difficulty with increasing alien waves
- Score tracking and lives system
- Sound effects and visual feedback
- Special nuke power-up
- Scrolling starfield background

## Controls

### Game Play
- ←, ↑, →, ↓ or [WASD]: Move
- [Space]: Shoot
- [Q]: Activate nuke (when available)
- [M]: Toggle sound on/off

### Other
- [Shift] 6: Toggle Developer Mode
- [Shift] 5: Show release notes
- [H]: Show/Hide help