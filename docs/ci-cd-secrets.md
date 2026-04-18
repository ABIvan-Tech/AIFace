# CI/CD Secrets & Release Setup

This document explains how CI/CD works in this repository and what secrets/variables you must configure in GitHub.

## 1) CI/CD workflow overview

This repository uses **5 primary workflows**:

### 1. `mcp-npm` (`.github/workflows/mcp-npm.yml`)

- **Workflow name:** `MCP npm CI/CD`
- **Triggers:**
  - Pull requests to `main`
  - Push to `main`
  - Push tags matching `v*`
  - Manual run (`workflow_dispatch`)
- **What it does:**
  - Runs MCP CI: lint, type-check, test, build
  - Publishes package to npm on version tags (owner-gated)
- **Artifacts / outputs:**
  - `mcp-dist` artifact (from `mcp/dist/**`) on successful CI
  - Published npm package on tag builds (`v*`), using `NPM_TOKEN`

### 2. `mobile-android` (`.github/workflows/mobile-android.yml`)

- **Workflow name:** `Mobile Android`
- **Triggers:**
  - Pull requests to `main`
  - Push tags matching `v*`
- **What it does:**
  - PR: builds debug APK
  - Tag release: builds signed release APK + AAB
- **Artifacts / outputs:**
  - PR: `android-debug-apk`
  - Tag: `android-release-apk`, `android-release-aab`

### 3. `mobile-ios` (`.github/workflows/mobile-ios.yml`)

- **Workflow name:** `Mobile iOS`
- **Triggers:**
  - Push to `main`
  - Push tags matching `v*`
- **What it does:**
  - Builds signed iOS archive and exports IPA
  - On tags, creates GitHub Release and uploads IPA
- **Artifacts / outputs:**
  - Workflow artifact: `ios-app` (`*.ipa`)
  - Tag builds: IPA attached to GitHub Release

### 4. `desktop-macos` (`.github/workflows/desktop-macos.yml`)

- **Workflow name:** `Desktop macOS`
- **Triggers:**
  - Push to `main`
  - Push tags matching `v*`
- **What it does:**
  - Builds macOS DMG
  - On tags: signs + notarizes DMG
- **Artifacts / outputs:**
  - On `main`: `macos-dmg`
  - On tags: intermediate `macos-dmg-build` and final notarized `macos-dmg`

### 5. `desktop-windows` (`.github/workflows/desktop-windows.yml`)

- **Workflow name:** `Desktop Windows MSI`
- **Triggers:**
  - Push to `main`
  - Push tags matching `v*`
- **What it does:**
  - Builds MSI package
  - On tags: signs MSI with PFX certificate
- **Artifacts / outputs:**
  - `windows-msi` (unsigned on main, signed on tags)

---

## 2) Required GitHub Secrets (by workflow)

> Add these in **Settings → Secrets and variables → Actions**.

### For `mcp-npm`

- `NPM_TOKEN` — npm authentication token for publishing.

### For `mobile-android`

- `ANDROID_KEYSTORE_BASE64` — Base64-encoded keystore file.
- `ANDROID_KEYSTORE_PASSWORD` — Keystore password.
- `ANDROID_KEY_ALIAS` — Key alias.
- `ANDROID_KEY_PASSWORD` — Key password.

### For `mobile-ios`

- `BUILD_CERTIFICATE_BASE64` — Base64-encoded `.p12` certificate.
- `P12_PASSWORD` — Certificate password.
- `BUILD_PROVISION_PROFILE_BASE64` — Base64-encoded provisioning profile.
- `KEYCHAIN_PASSWORD` — Temporary keychain password.
- `APPLE_TEAM_ID` — **Repository variable (optional)**; if omitted, the workflow attempts to read Team ID from provisioning profile.

### For `desktop-macos`

- `MACOS_CERTIFICATE_BASE64` — Base64-encoded signing certificate.
- `MACOS_CERTIFICATE_PASSWORD` — Certificate password.
- `NOTARIZATION_APPLE_ID` — Apple ID used for notarization.
- `NOTARIZATION_PASSWORD` — App-specific password.
- `NOTARIZATION_TEAM_ID` — Apple Team ID.
- `KEYCHAIN_PASSWORD` — Temporary keychain password.

### For `desktop-windows`

- `WINDOWS_CERT_PFX_BASE64` — Base64-encoded PFX certificate.
- `WINDOWS_CERT_PASSWORD` — Certificate password.
- `WINDOWS_TIMESTAMP_URL` (**optional**) — Timestamp server URL.

---

## 3) How to encode files to Base64

### macOS / Linux

```bash
base64 -i file.ext | pbcopy
```

This copies Base64 content to clipboard (macOS workflow). Paste it into the GitHub secret value.

### Windows (PowerShell)

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("file.ext"))
```

Copy the output and paste it into the corresponding GitHub secret.

---

## 4) GitHub Environments setup (optional, recommended)

For stronger release safety, create environments:

- `ci`
- `release-android`
- `release-apple`
- `release-windows`
- `release-npm`

Recommended protection rules:

1. **Required reviewers** for release environments (manual approval gate).
2. **Deployment branches/tags restrictions** (for example, only `main` and `v*` tags).
3. Put sensitive release credentials into **environment secrets** instead of broad repository secrets when possible.

This ensures publish/sign/notarize jobs do not start until an authorized reviewer approves deployment.

---

## 5) Testing workflows safely

### PR validation (debug/CI)

Use a pull request to `main` to validate non-release paths:

- `mcp-npm` CI checks (lint/type-check/test/build)
- `mobile-android` debug APK build

### Tag-based release validation

Use a version tag to trigger release flows:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers tag-gated jobs (npm publish, signed Android artifacts, iOS release IPA, notarized macOS DMG, signed Windows MSI).

---

## Notes

- Never store raw certificate/keystore files in the repository.
- Rotate signing credentials periodically.
- For forks, many release jobs are intentionally blocked by workflow guards.
