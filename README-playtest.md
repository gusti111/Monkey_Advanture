# Local Browser Playtest

This note describes how to serve the game locally for browser-based playtesting.

## Prerequisites

- Python 3, or another static HTTP server.
- A modern desktop or mobile browser.

## Start a local server

The current package.json start script references serve.js, but that file is not present in the repository tree. Use Python's static server for the current source layout:

    python -m http.server 8080

Open the game at:

    http://localhost:8080

Run the command from the repository root so index.html and the asset directories resolve correctly.

## Run the automated tests

Install the development dependencies and run the Jest suite:

    npm install
    npm test

The available tests cover selected physics and local-storage behavior. They do not replace manual playtesting on desktop and mobile browsers.

## Playtest checklist

- Verify initial player-name and story screens.
- Test jump, double jump, duck, and projectile controls.
- Check collision behavior, collectibles, and game-over handling.
- Test portrait-to-landscape behavior on mobile devices.
- Verify audio playback and browser storage behavior.
- Check that assets load correctly from a local HTTP origin.

This document describes local development only. It does not indicate that a public game server or production deployment is configured.