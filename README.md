<p align="center">
  <img src="public/icon.svg" width="88" alt="Vanguard Energy app icon">
</p>

# Vanguard Energy

An offline energy tracker for **two or four Cardfight!! Vanguard players**, built for a shared Android phone. Large tap areas, opponent-facing controls, and a focused portrait layout keep the table moving.

[**Download Android APK**](https://github.com/tsunsora/energy-tracker/releases/latest/download/energy-tracker.apk) · [Releases](https://github.com/tsunsora/energy-tracker/releases) · [Report an issue](https://github.com/tsunsora/energy-tracker/issues)

## At a glance

- **Two or four players:** each player's controls face their side of the table.
- **Quick adjustments:** tap for +1 or −1, use the dedicated +3 button, or hold to clear one counter.
- **Individual energy limits:** stop at 10 by default; enable up to 9,999 for decks that need more.
- **Ready for the table:** portrait orientation, an awake display, and no vibration.
- **Offline from first launch on Android:** no account, ads, or network connection required.

## Install on Android

1. Download `energy-tracker.apk` from the [latest release](https://github.com/tsunsora/energy-tracker/releases/latest).
2. Open the APK on **Android 7.0 or newer**, with an up-to-date Android System WebView.
3. Allow installation from your browser or file manager if Android prompts you, then open Vanguard Energy.

The release is a debug-signed APK for sideloading. A SHA-256 checksum is included with each release. Use the release APK for installed updates; development builds from GitHub Actions use a temporary signing key and may not install over it.

## At the table

| Control | Action |
| --- | --- |
| Upper **ADD** half of a player's area | Add 1 energy |
| Lower **REMOVE** half | Remove 1 energy |
| **+3** button | Add 3 energy, up to that player's limit |
| Hold **REMOVE** for 0.6 seconds | Reset that player to zero; slide away to cancel |
| Center setup button | Choose two or four players and set individual energy limits |

All directions follow the player's orientation. Player names are labels; tapping them does not change energy or open settings.

In **Setup → Allow energy above 10**, enable the switch for each player who needs an extended counter. Lower their energy to 10 or less before switching it off. Changing the limit never silently discards energy.

### What gets saved?

Player preferences save automatically. Energy counts follow the current session:

| Where you play | Energy behavior |
| --- | --- |
| Android app | All four counters reset when the app closes and opens again, including after exiting with Back |
| Switching apps or locking the screen | Keeps the current Android game |
| Browser | Counts survive reloads in the same tab; a new tab starts at zero |

The Android app requests portrait orientation and keeps the display awake while open. Device or window-management overrides may still apply. The installed web app also requests portrait; a regular browser tab follows the browser's orientation.

## Run locally

The app uses **React, TypeScript, Vite, and Capacitor**. Install **Node.js 22+**, then:

```sh
git clone https://github.com/tsunsora/energy-tracker.git
cd energy-tracker
npm ci
npm run dev
```

Open `http://localhost:5173`. To build and preview the production browser app:

```sh
npm run build
npm run preview
```

The production browser app works offline after its first successful load and service-worker installation over HTTPS or localhost. Android bundles its assets and works offline from the first launch.

## Build for Android

On Windows, install **JDK 21** and **Android SDK 36**, then run:

```powershell
npm ci
npm run android:build
```

The APK is written to `releases/energy-tracker.apk`. The build script uses a local `.tools/jdk` and `.tools/sdk` when present; otherwise, configure `JAVA_HOME` and `ANDROID_HOME` for your installed tools. The optional [setup script](scripts/setup-android.ps1) downloads verified development tools and accepts Android SDK licenses.

To work in Android Studio 2025.2.1 or newer:

```sh
npm run android:sync
npm run android:open
```

Published updates must retain the same app ID and signing key to install over an existing release. Keep the signing key private and backed up. Test builds on a physical Android device before release.

## Checks

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run test:offline
```

These cover energy limits, player settings, adjustments, persistence, legacy-save migration, and small portrait and landscape layouts. The offline check reloads a saved value above 10 and continues charging without a network connection.

The [Android build workflow](.github/workflows/android-build.yml) runs unit, browser, and offline checks before producing a development APK on pushes to `main`, pull requests, and manual runs.

## Project guide

| Path | Contents |
| --- | --- |
| [`src/`](src/) | Tracker UI, energy rules, persistence, and unit tests |
| [`tests/`](tests/) | Playwright browser checks |
| [`android/`](android/) | Native Android project |
| [`scripts/`](scripts/) | Android setup/build helpers and offline check |
| [`public/licenses/`](public/licenses/) | Bundled font and icon notices |

## Credits

An unofficial fan project, unaffiliated with Bushiroad. No official card art or logos are included. Bundled fonts use the SIL Open Font License; Lucide icons use the ISC license. See [third-party notices](public/licenses/).

## Visitors

[![Vanguard Energy visitor counter](https://count.getloli.com/@tsunsora-energy-tracker?theme=rule34&padding=8&offset=0&align=top&scale=1&pixelated=1&darkmode=auto)](https://count.getloli.com/)

Powered by [Moe Counter](https://github.com/journey-ad/Moe-Counter). This counts image requests, not unique visitors; GitHub image caching can affect the total.
