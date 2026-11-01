# Tool parity: measuring a drop-in replacement

Use when asked to compare X against Y (formatter, linter, bundler, runtime) and the answer must justify a swap. The deliverable is two numbers — speed and byte-level parity — plus a verdict.

## 1. Pick a real corpus

Take a repository the tool already formats: real code, real config, thousands of files.

```bash
git clone -q --depth 1 https://github.com/<org>/<repo>.git /tmp/corpus
cd /tmp/corpus
git ls-files | grep -E '\.(ts|js|mjs|json|md|css)$' > /tmp/corpus-files.txt
```

Check what formatter the repo actually uses before assuming: `ls -a | grep -Ei 'prettier|oxfmt|editorconfig|biome'`. A repo without `.prettierrc` may still carry `.oxfmtrc.json` or `.editorconfig` that only one tool honours.

## 2. Install the reference tool where resolution works

```bash
mkdir -p ~/fmtbench && cd ~/fmtbench
npm i --no-save prettier@3.9.10 prettier-plugin-svelte@4
./node_modules/.bin/prettier --version
```

Under `$HOME`, not `/tmp`: a noexec `/tmp` makes `node_modules/.bin/*` fail with `Permission denied`, and Prettier resolves plugins from the config file's directory, so a corpus in `/tmp` errors with `Cannot find package '<plugin>'`. Keep the corpus and both output copies inside one scratch parent so plugin and `node_modules` lookup succeeds.

## 3. Two copies, matched flags

```bash
mkdir -p ~/fmtbench/J ~/fmtbench/K
cd /tmp/corpus && tar -cf - $(cat /tmp/corpus-files.txt) | tar -xf - -C ~/fmtbench/J
cd ~/fmtbench/J && rm -f .oxfmtrc.json .editorconfig   # or keep and pass nothing to either tool
cp -a . ../K/

cd ../J && ~/fmtbench/node_modules/.bin/prettier --write . \
  --print-width 80 --use-tabs false --single-quote false --semi true --trailing-comma all
cd ../K && bun fmt --no-script --print-width=80 --use-tabs=false \
  --single-quote=false --no-semi=false .
```

`--no-script` stops `bun fmt` from running `package.json`'s `fmt` script, which would call the other tool and measure nothing.

## 4. Bucket the diff

```python
import subprocess, os, collections
out = subprocess.run(['diff','-rq','J','K'], capture_output=True, text=True).stdout
files = [l.split(' and ')[0].replace('Files J/','').strip() for l in out.strip().split('\n') if l.strip()]
print(len(files), collections.Counter(os.path.splitext(f)[1] for f in files))
```

For each differing file, decide whether the tool changed it at all by comparing against the pristine copy; a tool reporting "N unchanged" may simply have skipped the file. Then read two or three diffs by hand — the class of difference (key sorting, tab inside a Markdown code block, union-type layout) matters more than the count.

## 5. Speed and memory

```bash
python3 -c "
import subprocess,resource,time
files=open('/tmp/corpus-files.txt').read().split()
t=time.time(); subprocess.run(['bun','fmt','--check','--no-script']+files, capture_output=True)
print('bun %.2fs %d MB'%(time.time()-t, resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss//1024))"
```

One Python process per tool — `ru_maxrss` for `RUSAGE_CHILDREN` is the running maximum, so a shared process attributes the first tool's peak to the second.

## Expected shape (sanity baseline)

Prettier 3.9.10 versus `bun fmt` 1.4.4, 1,062 files of sveltejs/kit, matched flags, 2-CPU sandbox:

- Prettier 15.66 s / 294 MB; `bun fmt` 0.11 s / 31 MB (about 140x, 10x lighter).
- 993 of 1,008 non-`package.json` files byte-identical (98.5%); the rest were Markdown tabs in code blocks and union-type layouts.
- `package.json` sorting alone explained 51 of 66 differing files — bun sorts keys by default, switchable with `sortPackageJson = false`.
- On a repo already formatted by the incumbent with its real config, `bun fmt` changed 0 of 86 files.

A parity run that returns far below 95% means a config was honoured by one tool and not the other, not that the new tool is wrong.
