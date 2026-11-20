# Reviewing a design mock

A mock is reviewed by rendering it, not by reading its HTML. The operator reloads one URL after every edit, so the file on disk must be the file the browser draws.

## Serve it

- Serve the directory that holds the mock, not the file: sibling assets and links resolve from the same root.
- `python3 -m http.server` sends no cache headers and the browser serves a stale copy. Use a ten-line `SimpleHTTPRequestHandler` subclass that adds `Cache-Control: no-store, max-age=0` to every response, bound to `127.0.0.1`.
- Start it with `terminal(background=True)`; a foreground call that starts a long-lived server is refused. Verify with `curl -sI` in a separate call and read the `cache-control` line.

## Share it

- `cloudflared` is often absent. Download the release binary to `~/bin`, `chmod +x`, and run `cloudflared tunnel --no-autoupdate --url http://127.0.0.1:<port> > /tmp/cf.log 2>&1` in the background.
- Read the URL from the log (`grep -o 'https://[a-z0-9-]*\.trycloudflare\.com'`), then fetch it once: `200` and the no-store header prove the tunnel reaches the right port. Say that the link lives while the sandbox does.

## Check it

- The browser harness can return to `about:blank` between calls. Do `new_tab`, `wait_for_load`, the click and the read in one `browser_exec` call; a second call can land on a blank page and fail on a null selector.
- Verify by DOM, not by the source: the record count (`a.item`), the open panel's `innerText`, and the absence of the old string. A renderer that still reads a renamed field draws an empty block and no error.
- For a visual pass, shoot the page with Playwright's Chromium (`--headless=new --screenshot=<absolute path> --window-size=1440,1100`), then `vision_analyze` the file. Ask about layout, clipping and contrast; the model does not know the palette rules, so judge its colour advice against `DESIGN.md`.

## Render the states

- A state variant is a record in the product surface: a job in the list, a page in the detail. Never build a states page, a gallery or an appendix below the mock — the operator reads it as documentation beside the product and rejects it.
- One data object drives the surface. Adding a state means adding a record, not markup. Build the embedded JSON with a serializer (`json.dumps`), never string interpolation: an escaped `$` in the generator writes a literal backslash into the data and the header draws `\$0.00`.
- The repeated step is the unit. Each action block carries its own type, actor, exit and output; do not hoist output to the task when several steps can each produce one. Cost is out of the surface for now: the operator removed it from the stats and the action header, so neither is a sum the mock should draw.
- When flows are plural, the header names the flow beside the pull request (`keysmash#36` then `REVIEW`); the list data already carries `flow`, so the label is one span, not a second lookup.
- When the wrapper holds no data its steps do not, drop the wrapper from the detail panel. The list may still group by it; the panel starts at the first action.
- A blocked record opens on the step that failed, not on its first step. Derive what the data no longer carries: the avatar and header actor come from the first prompt action; a script-only or engine-only step names the engine; a failed step is marked in `--bad`, later steps dim as skipped, and the stop line names what failed.
- Keep the variants realistic — real repositories, titles and timestamps — so the states read as the product, not as a test fixture.
- The mock is not a mirror of `config/flows/`. A sample job may show a task the example flow does not define (a script preflight, a label step): the config directory is an example of the schema, the mock a demonstration of states. Judge it by whether the state reads true, not by whether the file could run; do not "fix" the mismatch into a task the flow does not need.
