<div align="center">

# BEKANTAN MANGROVE ADVENTURE

**A story-driven browser runner inspired by the proboscis monkey and mangrove habitats.**

An arcade project built with Canvas, modular JavaScript, and responsive controls.

</div>

---

## Overview

Bekantan Mangrove Adventure follows Banu, a young proboscis monkey travelling through coastal and mangrove environments. The game combines an endless-runner foundation with a story introduction, character controls, obstacles, collectibles, and progression-oriented systems.

The project uses an original browser game engine organized into dedicated modules for physics, entities, scenery, audio, game management, and interface behavior.

## Gameplay systems

- Story and player-name introduction.
- Canvas-based runner gameplay with responsive landscape-oriented presentation.
- Jump and double-jump behavior, plus ducking controls.
- Obstacles, collectible items, projectiles, and boss encounters.
- Shop and power-up management modules.
- Score, currency, and locally stored progress.
- Touch-oriented controls and keyboard input.
- Adaptive viewport handling and fullscreen support where available.

## Controls

| Action | Input |
| --- | --- |
| Jump / double jump | Space or Arrow Up |
| Duck | Arrow Down |
| Throw banana | X |
| Menu navigation | On-screen controls or keyboard prompts |

Exact bindings may vary as the game evolves; follow the in-game control guide.

## Technology

- HTML5 and CSS3
- Vanilla JavaScript with ES modules
- HTML Canvas 2D API
- Browser storage for local progress
- Jest and jsdom for selected logic tests

## Requirements

- A modern desktop or mobile browser.
- Node.js and npm for the JavaScript test tooling.
- Python 3 or another static HTTP server for local browser testing.

## Run the game locally

The checked-in package script references a serve.js file that is not present in the current repository tree. Use a static server for local play:

    git clone https://github.com/gusti111/Monkey_Advanture.git
    cd Monkey_Advanture
    python -m http.server 8080

Open http://localhost:8080.

## Run the tests

    npm install
    npm test

The repository includes focused tests for physics and local-storage behavior. These tests do not replace full browser playtesting across devices and screen orientations.

## Project structure

    Monkey_Advanture/
    ├── assets/           # Images and audio
    ├── css/              # Game styles
    ├── js/
    │   ├── engine/       # Audio, input, physics, and storage
    │   ├── entities/     # Player, obstacles, bosses, and power-ups
    │   ├── gameManager.js
    │   ├── shopManager.js
    │   ├── uiManager.js
    │   └── main.js
    ├── index.html
    ├── package.json
    └── README-playtest.md

## Project notes

The game is an independent educational project. Its ecological narrative is intended to encourage awareness of proboscis monkeys and mangrove habitats; it is not a wildlife-management or scientific simulation.

## Project status

A playable browser-game codebase with supporting tests. Continue validating gameplay balance, mobile orientation behavior, asset loading, and the local-server workflow before a public release.

## Author

**Gusty Faqikh** · [GitHub](https://github.com/gusti111)