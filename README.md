# Energy — Vanguard Tracker

A simple, offline Android energy tracker for two or four players.

[Download the latest Android APK](https://github.com/tsunsora/energy-tracker/releases/latest/download/energy-tracker.apk) · [All releases](https://github.com/tsunsora/energy-tracker/releases)

## Use

- Tap the upper half of a player's area to add one energy, or the lower half to subtract one. The + and − symbols sit just above and below the number, and controls follow each player's orientation. The name and **+3** buttons remain separate controls.
- Tap the center setup button to choose two or four players and configure energy limits. Opponent-facing seating is always enabled, including for older saves.
- Hold the − area for 0.6 seconds to set just that player's energy to zero. Slide away to cancel before the hold completes.
- Under **Allow energy above 10**, enable the switch for any player whose deck needs it. Other players still stop at 10. Extended counters support 0–9,999.
- Lower a player's energy to 10 or less before switching the normal limit back on; changing a setting never silently deletes energy.
- Tap a player's name to rename them, change their color, or rotate their area.

Energy and preferences save automatically on the device. The Android app is locked to portrait and keeps the display awake while open. The installed web app also requests portrait orientation; a regular browser tab follows the browser's orientation. Setup groups player layout and energy limits, with a scrollable settings area and a fixed Done button for small screens. No account, ads, tracking, or network connection is required.

The native manifest includes the [Android 16 compatibility setting](https://developer.android.com/about/versions/16/behavior-changes-16) for portrait restrictions on large screens. Device or window-management overrides may still apply; the web layout remains responsive when the OS overrides orientation.

Version 1.2 removes damage, soul, wins, turns, dice, timers, nations, themes, activity logs, and swipe pages. Only energy controls remain. Existing player names, colors, energy, count, and individual rotation preferences migrate from earlier versions. Setup no longer includes Undo, Reset energy, or a Face opponents switch.

## Android

Download `energy-tracker.apk` from [GitHub Releases](https://github.com/tsunsora/energy-tracker/releases/latest) and install it on Android 7.0+ with a current Android System WebView. This is a debug-signed APK for sideloading, not a Play Store release. Version 1.2.8 uses the same app ID and signing key as the previous local builds, allowing an update without uninstalling or clearing data. The release includes a SHA-256 checksum.

```powershell
npm ci
npm run android:build
```

The Windows build script uses the workspace toolchain under `.tools` if present. Otherwise install JDK 21 and Android SDK 36. `scripts/setup-android.ps1` downloads verified development tools and accepts SDK licenses. Android Studio 2025.2.1+ can also open the project:

```sh
npm run android:sync
npm run android:open
```

Future published updates must use the same signing key to install over the current release. Keep that key private and backed up. A successful build does not substitute for physical Android device testing.

## GitHub builds

The Android build workflow runs unit tests, browser tests, and the offline check, then builds an APK on pushes to `main`, pull requests, and manual runs. Its downloadable artifact is a development build signed with the runner's temporary debug key, so use the APK on the Releases page for installed updates. APKs and signing keys are excluded from Git history.

## Browser development and tests

Requires Node.js 22+.

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:offline
```

Development preview: `http://localhost:5173`. The production browser app supports offline use after its first successful load and service-worker installation over HTTPS or localhost. Android assets are bundled and work offline from first launch.

Tests cover normal and extended limits, independent player settings, +1/+3 adjustments, persistence above 10, legacy-save migration, reset/undo, and small portrait/landscape layouts. The offline test reloads a saved value above 10 and continues charging without a network connection.

Unofficial fan project, unaffiliated with Bushiroad. No official card art or logos are included. Fonts use the SIL Open Font License and Lucide icons use the ISC license; notices are bundled under `public/licenses`.
