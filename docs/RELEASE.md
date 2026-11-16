# Build, Signing & Delivery

## Test APKs (every 📱 gate)
1. Claude Code merges the phase PR once CI is green, then runs `android.yml` on `main` with the input `release_tag=phase-N` (decision T-16).
2. `android.yml` creates the tag and publishes a GitHub pre-release with `FocusBubble-phase-N-debug.apk`.
3. Claude Code verifies the asset exists (`gh release view phase-N --json assets`) and reports the URL and byte size.
4. Owner opens the release page on the phone (signed in to GitHub if the repo is private), downloads, installs (allow "Install unknown apps" for the browser once).
Debug APKs are for testing only; never upload them to Play.

## Release signing
- Use **Play App Signing** (Google holds the app signing key). We hold only an **upload key**.
- Owner generates the upload keystore once on any computer with a JDK:
  `keytool -genkeypair -v -keystore focusbubble-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000`
- Store in GitHub Secrets: `UPLOAD_KEYSTORE_BASE64`, `UPLOAD_KEYSTORE_PASSWORD`, `UPLOAD_KEY_ALIAS`, `UPLOAD_KEY_PASSWORD`. Back the `.jks` file and passwords up offline (two places). Losing it means a key reset request to Google.
- Never commit keystores, passwords, `google-services.json` (not used anyway) or `.env`.

## Release build (Phase 7)
1. Bump `version` (`1.0.0`) and `android.versionCode` (1, +1 every upload) in `app.config.ts`.
2. Tag `v1.0.0-rcN` → `android.yml` runs `./gradlew bundleRelease` with the secrets → uploads `FocusBubble-1.0.0-rcN.aab` as a CI artifact (not a public release asset) plus a release-config APK for owner testing.
3. Checks before upload: permission dump, AAB size, `minSdk 26`, `targetSdk` meets the current Play requirement, no `INTERNET`, debug screen absent, R8 mapping file saved as a CI artifact.

## EAS Build (optional alternative)
`eas build -p android --profile production` with EAS-managed credentials also works. The free plan has a monthly build quota and a low-priority queue, so CI stays the default path.

## Deliverables at the end of Phase 7
Source, CI workflows, signed AAB (artifact), release-config APK, `QA_REPORT.md`, `PROGRESS.md`, privacy policy page, store listing text and graphics, known limitations.
