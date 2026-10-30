#!/bin/sh
# One mutation in a committed tree: replace a clause, run only the test that
# must catch it, restore, print RED or STILL GREEN. Run from the repo root as
# `sh scripts/mutation-pass.sh <file> <old> <new> <test-regex> [package]`.
# Exits non-zero when the test stayed green or the tree could not be read.
set -eu

file=$1
old=$2
new=$3
test=$4
pkg=${5:-./internal/receiver}

GOTMPDIR=${GOTMPDIR:-$HOME/.cache/go-tmp}
export GOTMPDIR
mkdir -p "$GOTMPDIR"
log=$GOTMPDIR/mutation.log

count=$(python3 - "$file" "$old" <<'PY'
import pathlib, sys
print(pathlib.Path(sys.argv[1]).read_text().count(sys.argv[2]))
PY
)
if [ "$count" != 1 ]; then
	echo "REFUSED      $file: the token occurs $count times, want 1" >&2
	exit 1
fi
git diff --quiet -- "$file" || { echo "REFUSED      $file has uncommitted edits; commit first" >&2; exit 1; }

python3 - "$file" "$old" "$new" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
p.write_text(p.read_text().replace(sys.argv[2], sys.argv[3]))
PY

status=0
if go test -count=1 -run "$test" "$pkg" >"$log" 2>&1; then
	echo "STILL GREEN  $file: $test"
	status=1
else
	echo "RED          $file: $test"
fi

git checkout -- "$file"
if ! git diff --quiet -- "$file"; then
	echo "WARNING      $file was not restored" >&2
fi
exit $status
