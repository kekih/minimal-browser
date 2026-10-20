# Minimal Browser (Rust)

Lightweight desktop browser written in **Rust** using [tao](https://github.com/tauri-apps/tao) + [wry](https://github.com/tauri-apps/wry).

Uses the **system WebView** (WebView2 on Windows, WebKitGTK on Linux) — much lower RAM/CPU than Electron/Chromium embeds.

## Features

- Minimal resource usage (native WebView, LTO release build)
- Dark theme by default
- Settings panel (homepage, theme, start maximized, clear on exit)
- Settings saved to `~/.config/minimal-browser/settings.json` (or OS equivalent)
- URL bar + search via DuckDuckGo
- Back / Forward / Reload

## Download

GitHub Actions builds Windows and Linux binaries on every push:

https://github.com/kekih/minimal-browser/actions

For permanent downloads, create a tag `v2.0.0` and push it — files appear under **Releases**.

## Run from source

### Windows
Needs [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually already installed on Win10/11).

```bash
cargo run --release
```

### Linux
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev
cargo run --release
```

## Bitwarden

System WebViews **do not** support Chrome extensions. Use the [Bitwarden desktop app](https://bitwarden.com/download/) — it can autofill in other apps / browsers via OS integration.

On Windows, wry can load some extension paths (`with_extension_path`), but full Chrome Web Store compatibility is not guaranteed.

## Why not Electron?

| | Electron v1 | Rust v2 |
|--|--|--|
| Engine | Full Chromium | System WebView |
| Idle RAM | ~150–300 MB | typically much lower |
| Binary | ~100+ MB | a few MB (+ system WebView) |
| Extensions | Chrome extensions | limited / desktop app |

## License

MIT
