# Live check of a signed webhook server

Prove the asking path, not only the handlers: build the binary, post a real signed delivery, read the record it wrote, then stop it with a signal.

1. Build to a path the repository ignores (`go build -o ./dispatch ./cmd/dispatch`).
2. Copy the example config to a temp directory and change `listen` to a free high port, so the checkout stays clean and the port does not collide.
3. Start it with the secret in the environment variable `secret_name` names. Wait until `curl -s -o /dev/null http://127.0.0.1:<port><path>` answers; 405 means the server is up.
4. Sign exactly the bytes you post, and send them with `--data-binary`:

   ```sh
   sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$secret" -hex | sed 's/^.*= //')
   curl -s -o /dev/null -w '%{http_code}\n' -X POST "http://127.0.0.1:<port><path>" \
     -H "X-GitHub-Event: pull_request" \
     -H "X-GitHub-Delivery: live-1" \
     -H "X-Hub-Signature-256: sha256=$sig" \
     --data-binary "$body"
   ```

   `-d` strips newlines and breaks the HMAC; `--data-binary` sends the bytes.

5. Read the record with the driver or with `python3`:

   ```sh
   python3 - "$db" <<'PY'
   import sqlite3, sys
   print(sqlite3.connect(sys.argv[1]).execute("select * from jobs").fetchall())
   PY
   ```

6. Send the terminal delivery (a close) and assert the end state. Then `kill -TERM $pid; wait $pid` and read the exit status; a clean shutdown exits 0.
7. Repeat with a duplicate delivery id and with a wrong-secret signature: the row counts prove dedupe, and the 401 proves nothing was parsed.
