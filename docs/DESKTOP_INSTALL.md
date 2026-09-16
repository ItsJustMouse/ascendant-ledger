# Installing Ascendant Ledger Desktop

The desktop edition is intended for players who do not want to install Docker or use a terminal.

## Windows

1. Open the Ascendant Ledger **Releases** page on GitHub.
2. Download the newest file ending in `win-x64.exe`.
3. Double-click the downloaded file.
4. Follow the installer.
5. Open **Ascendant Ledger** from the Start menu or desktop shortcut.
6. Choose **Magnates** or **Entrepreneurs**, then click **Import CSV**.

Windows may show a SmartScreen warning because community builds are not yet code-signed. The source code and build workflow are public on GitHub.

## macOS — Apple Silicon

Use this version if your Mac has an Apple chip such as M1, M2, M3, M4, or newer.

1. Download the newest `mac-arm64.dmg` file from GitHub Releases.
2. Open the DMG.
3. Drag **Ascendant Ledger** into Applications.
4. Open Ascendant Ledger.
5. If macOS blocks the first launch because the app is not notarized yet, open **System Settings → Privacy & Security** and choose **Open Anyway** for Ascendant Ledger.
6. Choose your Realm and import your CSV files.

## macOS — Intel

Follow the same instructions above, but download `mac-x64.dmg`.

## Linux

1. Download the newest `linux-x64.AppImage` file.
2. Make it executable in your file manager's permissions/properties screen, or run `chmod +x` on it.
3. Double-click the AppImage.
4. Choose your Realm and import your CSV files.

## Where is my data?

Your financial information stays on your own computer.

- Windows: `%APPDATA%\\Ascendant Ledger\\data`
- macOS: `~/Library/Application Support/Ascendant Ledger/data`
- Linux: `~/.config/Ascendant Ledger/data`

Use **File → Backup Database…** whenever you want an extra copy of your data.

**Created by NullBot | Copyright 2026**
