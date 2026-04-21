# Slab Rush!

A sleek, minimalist stacking game built with HTML5 Canvas and Vanilla JavaScript. How high can you go?

![Slab Rush! Logo](assets/images/game_logo.png)

## Features

- **Satisfying Gameplay**: Stack slabs as high as you can.
- **Dynamic Difficulty**: Block speed increases as you go higher.
- **Economy System**: Earn coins for every successful stack. Total balance is saved locally.
- **Audio Feedback**: Immersive sound effects for placement, speed-ups, and game over.
- **Responsive Design**: Play on desktop or mobile with optimized controls.

## How to Play

- **Desktop**: Press **Space**, **Click**, or **Tap** to place a slab.
- **Mobile**: **Tap** anywhere on the screen.

## Installation / Hosting

1. Clone this repository.
2. Open `index.html` in any modern web browser.
3. To host on GitHub Pages:
   - Go to repository **Settings** -> **Pages**.
   - Select the `main` branch and `/root` folder.
   - Click **Save**.
   

## Deployment & Versioning (Manual)

When pushing a new update, you must increment the version string across several files to ensure the Service Worker (PWA) triggers a refresh and bypasses stale browser caches.

### Steps to Update Version (e.g., to 1.9.0):

1.  **`sw.js`**:
    *   Update `CACHE_NAME` to `'slab-rush-1.9.0'`.
    *   Update all URLs in the `ASSETS` array to use `?v=1.9.0`.
2.  **`index.html`**:
    *   Update the version text in `<div id="version-tag">v1.9.0</div>`.
    *   Update all `?v=1.8.0` occurrences in `<link>` and `<script>` tags to `?v=1.9.0`.
    *   Update the logo `<img>` sources to use `?v=1.9.0`.
3.  **`js/game.js`**:
    *   Update the `src` paths in the `audioAssets` array inside `initAssets()`.
    *   Update the `loadImage` path for the game logo.

This process ensures that when the Service Worker activates, it fetches fresh copies of all game assets and forces a page reload for the user.


## Attributions

1. **Chime Sound Effect** by [freesound_community](https://pixabay.com/users/freesound_community-46691455/) from [Pixabay](https://pixabay.com/sound-effects/)
2. **Game over Sound Effect** by [Ribhav Agrawal](https://pixabay.com/users/ribhavagrawal-39286533/) from [Pixabay](https://pixabay.com/sound-effects/)
3. **Swoosh Sound Effect** by [Universfield](https://pixabay.com/users/universfield-28281460/) from [Pixabay](https://pixabay.com/)
4. **Personal Best Sound Effect** by [Universfield](https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=402152) from [Pixabay](https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=402152)
5. **CSS Background Patterns** by [MagicPattern](https://www.magicpattern.design/tools/css-backgrounds)
6. **Physics Engine (Matter.js)** by [liabru](https://github.com/liabru/matter-js)

## Support

If you enjoy the game and want to support the developer, feel free to [buy me a coffee on Ko-fi!](https://ko-fi.com/U7U21XXYR2)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
