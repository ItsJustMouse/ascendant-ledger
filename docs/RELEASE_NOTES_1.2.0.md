# Ascendant Ledger v1.2.0

v1.2.0 adds a normal desktop edition while keeping the existing Docker/self-hosted release fully supported.

## Desktop apps

Users can now run Ascendant Ledger as a regular application on:

- Windows x64
- macOS Apple Silicon
- macOS Intel
- Linux x64

No Docker, NAS, terminal commands, `.env` file, or manual localhost setup is required.

The desktop app automatically starts the same Ascendant Ledger server used by the self-hosted edition on a random loopback-only port. The server is reachable only from the local computer (`127.0.0.1`) and shuts down with the application.

## Desktop data management

The File menu adds:

- Import CSV
- Backup Database
- Restore Backup
- Open Data Folder
- Open Logs Folder

Restores validate the SQLite file, create a snapshot-consistent safety backup first, and attempt automatic recovery if a restore fails.

## Security

The Electron renderer uses:

- context isolation
- Node integration disabled
- sandboxing
- device permissions denied by default
- external links opened in the system browser
- local-only navigation
- a restrictive Content Security Policy
- loopback-only backend binding

## Updates

**Check for Updates** checks the latest GitHub release and opens the release page when a newer version is available.

## Self-hosted edition

Docker Compose remains supported with the same SQLite database model, CSV import engine, dual-Realm support, statements, transactions, analytics, backup system, and data-quality tools.

## Signing

The first desktop community builds are unsigned. Windows SmartScreen and macOS Gatekeeper can therefore warn on first launch. Signing/notarization can be added later without changing the application architecture.

**Created by NullBot | Copyright 2026**
