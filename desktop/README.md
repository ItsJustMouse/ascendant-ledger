# Ascendant Ledger Desktop

The desktop edition packages the existing Ascendant Ledger server and web UI into a normal desktop application. Users do not need Docker, a terminal, a NAS, or a web server.

## User experience

1. Download the installer for Windows, macOS, or Linux.
2. Install/open Ascendant Ledger.
3. Choose Magnates or Entrepreneurs.
4. Import Sim Companies CSV exports.

The application starts its private local API automatically on `127.0.0.1` using a random available port. It is not exposed to the LAN.

Data lives in the operating system's standard application-data directory:

- Windows: `%APPDATA%\\Ascendant Ledger\\data`
- macOS: `~/Library/Application Support/Ascendant Ledger/data`
- Linux: `~/.config/Ascendant Ledger/data`

The desktop **File** menu includes database backup, restore, data-folder access, and logs. The application menus also include update checks, GitHub, bug reporting, version information, and attribution.

## Development

Requirements:

- Node.js 22+
- npm

From `desktop/`:

```bash
npm ci
npm run dev
```

`npm run dev` builds a desktop-safe server runtime, installs its production dependencies, starts Electron, and opens the existing Ascendant Ledger UI.

## Local packaging

```bash
npm ci
npm run dist:win
npm run dist:linux
npm run dist:mac:x64
npm run dist:mac:arm64
```

Build the target on the matching operating system. GitHub Actions handles official cross-platform release artifacts.

## Signing note

The community build workflow currently produces **unsigned** installers. Windows SmartScreen and macOS Gatekeeper may warn users until the project adopts Windows code signing and an Apple Developer ID/notarization workflow. The application remains open source and the build workflow is public.

**Created by NullBot | Copyright 2026**
