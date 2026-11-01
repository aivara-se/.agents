# Cron jobs

A cron job is a prompt plus a schedule. The prompt runs in a fresh session with no chat context, and its final answer is what gets delivered — so the prompt must carry every path, command and rule the run needs.

## The prompt is the artifact

- **Keep the procedure in a skill, the call in the prompt.** A prompt past a page drifts from the skill that explains it: name the skill in `skills`, and let the prompt say what today's run needs (the date, the guard, the delivery). The blogger job does this with the `blogging` skill.
- **Self-contained or it fails at 03:00.** No "as we discussed". Name the repository, the clone path, the files, the gate commands and the reviewer.
- **Give it a guard for the state it depends on.** A daily job that edits a page reads the file on `origin/main` first and stops with one line when it is absent — a run that half-creates its own surface is worse than a skipped day.
- **`continuity: true`** injects the job's own last output, which is how a daily job avoids repeating yesterday. The repository is still the record; do not let continuity replace reading it.

## What runs where

- **`workdir` is checked against the gateway host's filesystem, not the agent's terminal backend.** When the tools run in a container and the gateway runs on the host, a workdir that exists in the sandbox is refused at create time (`Cron workdir does not exist`). Omit `workdir` and write `$HOME/<path>` in the prompt, which resolves in the session's own shell.
- **A cron run's transcript is not readable from a later session.** The output lands under the profile's `cron/output/<job_id>/` on the gateway host. Verify the effect where it is observable — the pull request, the commit, the published page — not by reading the run.
- **A fired run returns at once and reports later.** `action='run'` is asynchronous: its answer is delivered to the target as its own message. Do not wait, poll, or re-post it.

## Verifying a new job

- **Fire it once with a transient `prompt` that stops after the read pass.** "Run step 1 only and report whether the file is present" proves delivery, the guard and the credentials without publishing anything.
- **Then verify the real run in GitHub, not in the chat**: the pull request it opened, its reviewer, its auto-merge state, and the file count in the diff.
- A job whose answer paraphrases its own prompt has not run; the transcript echoes the prompt before the answer, so read the end of the output.
