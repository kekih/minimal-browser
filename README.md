# Minimal Browser

Lightweight, optimized Electron-based browser with:

- **Minimal resource usage** — disabled unnecessary Chromium features, optional hardware acceleration off
- **Bitwarden support** — place the unpacked extension in `extensions/bitwarden`
- **Flexible customization** — homepage, theme, start maximized, clear on exit, custom CSS
- **Data persistence** — cookies, localStorage, cache saved in persistent partition
- **Settings panel** and keyboard shortcuts

Built for Windows and Linux. GitHub Actions automatically builds releases.

## Download

Go to [Releases](https://github.com/kekih/minimal-browser/releases) and download the latest build for your OS:

- **Windows**: `.exe` installer or portable
- **Linux**: `.AppImage` or `.deb`

## Features

- Clean dark UI with address bar, navigation buttons
- Persistent browsing data (unless "Clear data on exit" is enabled)
- Settings saved with `electron-store`
- DevTools (F12)
- Open external links in the same view

## Bitwarden

1. Download the Bitwarden Chrome extension CRX from the [Chrome Web Store](https://chromewebstore.google.com/detail/bitwarden-password-manage/nngceckbapebfimnlniiiahkandclblb) (use a CRX downloader if needed) or from [crx4chrome](https://www.crx4chrome.com/).
2. Rename `.crx` to `.zip` and extract it.
3. Place the extracted folder as `extensions/bitwarden` next to the browser executable (or in the project root for development).
4. Restart the browser. Bitwarden should load automatically.

Alternatively, you can use the Bitwarden desktop app + browser integration, or install other password managers the same way.

## Development

```bash
git clone https://github.com/kekih/minimal-browser.git
cd minimal-browser
npm install
npm start
```

## Build locally

```bash
npm run build:win    # Windows
npm run build:linux  # Linux
```

Artifacts appear in `dist/`.

## GitHub Actions

On every push to `main` and on tags `v*`, the workflow builds Windows and Linux packages and uploads them as release assets (for tags) or artifacts.

## Optimization notes

- Disabled: Translate, background networking, default apps, sync, Safe Browsing auto-update, first-run
- Persistent partition only for the main session
- Small UI footprint
- You can further reduce RAM by uncommenting `app.disableHardwareAcceleration()` in `main.js` (may affect scrolling smoothness)

## License

MIT
