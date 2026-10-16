#!/usr/bin/env python3
"""A stub backend whose writes reach its reads.

Copy, then change: the read route, the write route, the state's fields, the
JSON shape the change expects, and the auth header if the change does not use
a bearer token. Run it from the home directory (a sandbox /tmp is often
noexec), on its own port, with the artifact pointed at it.
"""

import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get("STUB_TOKEN", "stub-token")
WRITES = os.environ["STUB_WRITES"]  # path of the timestamped write log
STATE = json.loads(os.environ["STUB_STATE"])  # the mutable state, list of dicts


def snapshot():
    """The state as the change's read expects it. Change this shape."""
    return sorted(STATE, key=lambda item: item["key"])


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _authed(self):
        if self.headers.get("Authorization") != "Bearer " + TOKEN:
            self.send_response(401)
            self.end_headers()
            return False
        return True

    def do_GET(self):
        if not self._authed():
            return
        if self.path == "/read":  # the read route
            body = json.dumps(snapshot()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_PATCH(self):
        if not self._authed():
            return
        length = int(self.headers.get("Content-Length", 0))
        payload = json.loads(self.rfile.read(length) or b"{}")
        key = self.path.rsplit("/", 1)[-1]
        for item in STATE:  # the write lands in the state the next read serves
            if str(item["key"]) == key:
                item.update(payload)
        with open(WRITES, "a") as log:
            log.write("%.6f PATCH %s %s\n" % (time.time(), self.path, json.dumps(payload)))
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), Handler).serve_forever()
