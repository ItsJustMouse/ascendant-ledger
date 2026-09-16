# Changelog

## 1.2.0

- Added a normal desktop edition for Windows, macOS, and Linux using Electron.
- Desktop users no longer need Docker, a terminal, a NAS, or manual localhost setup.
- The desktop app embeds the existing Ascendant Ledger backend and UI rather than duplicating the accounting engine.
- Desktop backend binds to a random `127.0.0.1` port and is not exposed to the LAN.
- Desktop data is stored in the operating system application-data directory.
- Added native Backup Database, Restore Backup, Open Data Folder, and Open Logs Folder actions.
- Restore automatically creates a safety copy before replacing the current database.
- Added GitHub release update checks and bug-report/repository shortcuts.
- Added desktop attribution: `Created by NullBot | Copyright 2026`.
- Added automated GitHub Actions builds for Windows x64, Linux x64, macOS Apple Silicon, and macOS Intel.
- Existing Docker/self-hosted deployment remains supported.

## 1.1.0

- First privacy-scrubbed public release.
- Added independent Magnates and Entrepreneurs Realm ledgers.
- Added a global Realm selector with Realm-specific company names.
- Scoped dashboard, statements, transactions, analytics, imports, rollback, data quality, raw data, settings, and exports to the selected Realm.
- Added an explicit import-destination banner and commit confirmation to reduce wrong-Realm imports.
- Fixed bodyless JSON POST requests for rollback and logout.
- Added Realm-specific export filenames.
- Added Docker deployment, optional single-user authentication, backup support, CI, issue templates, security guidance, and an MIT license.
- Public tests use synthetic data only.
