# Releasing a tinyjs app

## The gate

- A release is a pull request: the Baseline ruleset refuses a push to the default branch, requires an approving review, and the workflow token cannot approve.
- The version in the file is the trigger. Raise `version` in `tinyjs.json` on the branch that carries the work; merging that pull request is the release. No `release: v` commit.
- When the work is already on `main` without a bump, the operator may ask for the bump alone. Open a `chore:` pull request that raises `version` and adds the changelog entry for what landed since the last tag.
- The release moves the minor, not the patch: `1.12.0` to `1.13.0`. The operator's "next 1.x" means that number.
- A bump also updates every current-state sentence that names the binary — the no-network line, the acceptance header, the roadmap — in the product and system documents. Changelog entries keep their own versions, so grep the old number and change only the sentences that mean the shipped build.
- A push that leaves the version alone publishes nothing: the run finds `v<version>` tagged and stops ("already tagged and released; nothing to publish"). A docs push after a release is safe.
- Tag only after every build succeeds.
- A pull request opened with `GITHUB_TOKEN` starts no other workflows. Where a required check exists, open it with `RELEASE_TOKEN` (`repo` and `workflow` scope) or it waits for a check that never runs.
- Merge the callee before the caller: one pinned at `tinyjs-publish.yml@main` cannot resolve until that file is on the branch.

## The standard

- `aivara-se/.github/docs/RELEASES.md` owns the rules, not one shared workflow. Each repository carries its own `.github/workflows/publish.yml`; a tinyjs app's builds the three platforms itself.
- Read that repository's `publish.yml` before changing a release: it is the copy that runs.

## What the build produces

- macOS: `dist/<title>.app`, zipped per architecture with `ditto -c -k --keepParent`. `tinyjs build --arch arm64|x86_64` builds either CPU from an Apple-silicon runner.
- Windows: `dist/<name>.exe` plus `dist/launcher.exe`, `resources/` and `executables/`; a bare `.exe` does not run without its launcher.
- Linux: `dist/<name>` and `launcher`; tar the folder.
- Name each asset with the app name, version, OS and architecture.

## After the merge: check the run

- `gh run list --repo <owner>/<repo> --limit 5`, then `gh run view <id> --json jobs -q '.jobs[] | "\(.name) \(.conclusion)"'`. A step that never ran is `skipped` while its job reports `success`: `gh api repos/<owner>/<repo>/actions/jobs/<job-id> -q '.steps[] | "\(.number) \(.name): \(.conclusion)"'`
- Signing and notarization skip when their secrets are empty: the job is green and the macOS build is ad-hoc. Say that, instead of calling the release signed.
- A fast job is not a skipped build. Confirm with the step table and the artifact, never the duration.
- `gh release view v<version> --json assets -q '.assets[] | "\(.name) \(.size)"'`: one archive per OS and architecture, megabytes rather than a stub.
- Identify each binary with `file` (Mach-O arm64 and x86_64, PE32+ x86-64, ELF x86-64), and the macOS bundle version from `Contents/Info.plist` with `python3 -c "import plistlib; print(plistlib.load(open('Pereda.app/Contents/Info.plist','rb'))['CFBundleShortVersionString'])"` — `plutil` does not exist on Linux.
- Run the Linux archive under Xvfb: `/proc/<pid>/cmdline` prints `launcher … <title> <WxH> <version>`, the released build, checked without an About panel.

## A test build on a pull request

- Build the `.app` for both architectures in the validation workflow, gated on the test job and only on `pull_request`.
- Name the zip with the number — `<name>-pr-<n>-macos-<arch>.zip`. One carrying only the version looks like the release in a Downloads folder.
- No signing secret in a pull-request workflow: the bundle is ad-hoc, so the first open is right click → Open, or `xattr -dr com.apple.quarantine <app>.app`. Say which.
- Prove the artifact came from the branch: download it, `file` the binary, read `CFBundleShortVersionString`, and grep `Resources/app/frontend/` for a string only the branch adds.

## Signing

- Without `TINYJS_SIGN_IDENTITY` the macOS build is ad-hoc and Gatekeeper blocks it on another Mac. Notarization needs the certificate plus `notarytool` credentials. Document the secrets in the repository, never the workflow.

## YAML

- Quote any `if:` containing a colon-space, or YAML parses it as a mapping. Run `actionlint` before pushing.
