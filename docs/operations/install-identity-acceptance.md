# Install identity acceptance

All installations use **What's for Supper?**. Icons and localized informational
hints distinguish stable, demo, beta and beta-demo. Identity has no feature flag;
runtime `DEMO_MODE` and the baked channel select the variant. PDF sharing keeps
its separate existing gate.

## Production browser matrix

From the repository root, with the installed dependencies and Playwright browser:

```sh
python3 -B pwa/e2e/run-install-identity.py
```

This runs targeted `task test:e2e:ci` checks for both baked channels, demo off/on
and PDF off/on independently, then invalid demo input for both channels (ten
cases, four tests each). It builds with opposite demo/PDF values and starts a
fresh production server with the tested runtime values. The runtime channel
override is opposite to the baked channel. No identity feature flag is set.
The API address is unavailable; browser API calls use repository mocks, with
every API request aborted in the backend-independent welcome test.

The runner temporarily changes the channel artifact, restores its original
bytes on normal completion or failure, and stops at the first failure. Run it
without concurrent builds or channel edits. It never builds Docker images or
publishes/deploys anything. Logs/results live under ignored
`.task/identity-T4/production-matrix/`. A production Next.js build has a build ID,
not a Docker image ID. Browser media checks do not qualify an installed app's
light/dark appearance, cropping or OS metadata refresh.

Run the production matrix before finish, with no concurrent build/dev server or
dependency installation. Next.js regenerates the tracked `pwa/next-env.d.ts`:
production uses `.next/types`, while the development server used by finish's
impact checks uses `.next/dev/types`. A first finish that changes those imports
must discard its success under the immutable-content guard. Review the exact
generated diff, retain the dev declarations, prepare/review the resulting delta,
then run `task agent:finish` again without another production build in between.
Do not hand-edit generated declarations, reset the task baseline, ignore the
mutation result or weaken the guard. This is a framework-generated prerequisite;
the production matrix remains separate acceptance evidence for its recorded
source/build identities.

## Physical iOS and Android acceptance

Use existing authorized HTTPS deployments on separate origins; this checklist
does not authorize deployment. Record the exact PWA image ID/digest and baked
channel for each origin. On each physical platform install stable, demo, beta
and beta-demo together. Keep one origin for each variant; changing demo mode on
one origin preserves manifest `id: /` and does not create a separate app.

| Check | Observation required on each physical platform |
|---|---|
| Coexistence | All four launchers coexist and open their corresponding origins. All labels use the common name; note any OS truncation. |
| Artwork | Original backgrounds/artwork remain; DEMO and BETA marks are legible at launcher size. Inspect the actual OS rounded/masked crops. |
| Light/dark | Inspect launcher, installed splash/startup and welcome/main hint under both OS appearances. Record unwanted cropping or contrast problems. |
| Refresh | After an authorized same-origin demo toggle/recreation, record fresh manifest/Apple metadata and the actual old installed icon behavior after reopening. No immediate OS refresh is promised. |
| Reinstall | Remove/reinstall only the disposable acceptance installation and confirm current artwork/name and correct origin. Record whether reinstallation was needed. |
| Existing behavior | Authentication remains required for main routes; launch retained shortcuts. Keep PDF gates and backend demo behavior unchanged. |

Record iOS model, iOS version, Safari version and Add to Home Screen procedure;
record Android model, OS version, browser/version and installation procedure.
Simulator, desktop WebKit, mobile viewport, screenshot and browser assertions
are separate evidence and cannot replace these physical installs.

Use this record for each platform/origin:

```text
Date and tester:
Physical device / OS / browser version:
Origin / baked channel / runtime DEMO_MODE:
PWA image ID or digest / source revision:
Coexistence and launch destinations: passed | failed | blocked | not-run
Common name / marks / real OS crop: passed | failed | blocked | not-run
OS light/dark launcher, splash, in-app hint: passed | failed | blocked | not-run
Refresh steps and observed old/new icon:
Reinstall steps and resulting icon/name:
Authentication / shortcuts / unchanged PDF gate:
Artifacts and remaining blockers:
```

If devices, origins or exact image identity are unavailable, record that
acceptance as **blocked**. Do not mark ID-T4 complete until its required browser
and physical-device acceptance passes. The user's T3 GitHub amd64 deferral is
recorded in the [task evidence](../../.kiro/specs/pwa-install-identity/tasks.md);
arm64 results do not prove amd64 agreement.
