# Releasing a tinyjs app

## The gate

- A release is a pull request. The Baseline ruleset refuses a push to the default branch and requires an approving review, and the workflow token cannot approve.
- The version in the file is the trigger, and it is raised in the change that earns it: bump `version` in `tinyjs.json` on the branch that carries the work, and merging that pull request is the release. There is no separate `release: v` commit and no version-bump pull request of its own.
- A push that leaves the version alone publishes nothing: the run reads the file, finds `v<version>` tagged and released, and stops ("already tagged and released; nothing to publish"). A docs or follow-up push after a release is safe.
- Tag only after every build succeeds, so a failed build leaves no tag.
- A pull request opened with `GITHUB_TOKEN` does not start other workflows. Where a required check exists, open it with a personal token (`RELEASE_TOKEN`, `repo` and `workflow` scope) or the release pull request waits for a check that never runs.
- Merge the callee before the caller. A caller pinned at `tinyjs-publish.yml@main` cannot resolve until that file is on the branch; merged alone, the caller makes every push to the default branch fail at startup.

## The standard

- The organisation's release standard is `aivara-se/.github/docs/RELEASES.md`: it owns the rules, not one shared workflow. Each repository carries its own `.github/workflows/publish.yml`, some calling a shared callee and some building inline; a tinyjs app's builds the three platforms itself.
- Read that repository's `publish.yml` before changing a release: it is the copy that runs.

## What the build produces

- macOS: `dist/<title>.app`; zip it per architecture with `ditto -c -k --keepParent`. `tinyjs build --arch arm64|x86_64` builds either CPU from an Apple-silicon runner.
- Windows: `dist/<name>.exe` plus `dist/launcher.exe`, `resources/` and `executables/`; zip the folder. A bare `.exe` does not run without its launcher.
- Linux: `dist/<name>` and `launcher`; tar the folder.
- Name each asset with the app name, version, OS and architecture; the release notes can be generated from the tag.

## After the merge: check the run

- `gh run list --repo <owner>/<repo> --limit 5`, then `gh run view <id> --json jobs -q '.jobs[] | "\(.name) \(.conclusion)"'`. Read the step table as well: a step that never ran is `skipped` while its job still reports `success`.
  `gh api repos/<owner>/<repo>/actions/jobs/<job-id> -q '.steps[] | "\(.number) \(.name): \(.conclusion)"'`
- Signing and notarization are the steps that skip when their secrets are empty: the job is green and the macOS build is ad-hoc. Say that in the report instead of calling the release signed.
- A fast job is not a skipped build. A small app checks out, builds, packages and uploads in seconds; confirm with the step table and the artifact, never with the duration.
- `gh release view v<version> --json assets -q '.assets[] | "\(.name) \(.size)"'`: one archive per OS and architecture, each megabytes rather than a stub.
- Identify the artifacts before calling the release good: `file` on each binary (Mach-O arm64 and x86_64, PE32+ x86-64, ELF x86-64), and the macOS bundle version from `Contents/Info.plist` with `python3 -c "import plistlib; print(plistlib.load(open('Pereda.app/Contents/Info.plist','rb'))['CFBundleShortVersionString'])"` — `plutil` does not exist on Linux.
- Run the Linux archive under Xvfb: `xdotool getwindowpid <id>`, then `/proc/<pid>/cmdline` prints `launcher … <title> <WxH> <version>`. That is the released build, title and version, checked without an About panel.

## A test build on a pull request

- Build the `.app` for both architectures in the validation workflow, gated on the test job and only on `pull_request`: `publish` already builds on `main`, so a push to the default branch skips it.
- Name the zip with the number — `<name>-pr-<n>-macos-<arch>.zip`. A test build that carries only the version looks like the release in a Downloads folder.
- No signing secret in a pull-request workflow: the bundle is ad-hoc, so the first open is right click → Open, or `xattr -dr com.apple.quarantine <app>.app`. Say which one when handing it over.
- Prove the artifact came from the branch, not a stale run: download it, `file` the binary for the architecture, read `CFBundleShortVersionString`, and grep the embedded `Resources/app/frontend/` for a string only the branch adds. A fast run and a matching version are not proof.

## Signing

- macOS signing is absent by default: without `TINYJS_SIGN_IDENTITY` the build is ad-hoc and Gatekeeper blocks it on another Mac. Notarization needs the signing certificate plus `notarytool` credentials. Document the secrets in the repository, never in the workflow.

## YAML

- Quote any `if:` expression that contains a colon-space, or YAML parses the value as a mapping. Run `actionlint` before pushing.
