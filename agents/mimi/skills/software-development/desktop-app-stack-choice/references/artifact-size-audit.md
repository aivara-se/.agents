# Auditing a desktop app's size

Use when someone asks why an artifact is large, or before quoting a size in a decision.

## 1. Measure the artifact as shipped

```bash
du -sb dist/App.app                     # directory bytes, not du's blocks
ditto -c -k --keepParent App.app a.zip  # what macOS ships
zip -9 -r b.zip App.app                 # compare: often no better
ls -l a.zip b.zip
```

Compress the directory with `tar -cJf app.tar.xz App.app` when the zip is too big to send; an
xz tarball is typically 30–40% smaller than a `ditto` zip.

## 2. Break a macOS binary into segments

A Mach-O executable names where its bytes went. No `otool` needed:

```python
import struct
d = open('App.app/Contents/MacOS/App','rb').read()
print(hex(struct.unpack('<I', d[:4])[0]), len(d))     # 0xfeedfacf = 64-bit LE
ncmds = struct.unpack('<I', d[16:20])[0]
off = 32
for _ in range(ncmds):
    cmd, size = struct.unpack('<II', d[off:off+8])
    if cmd == 0x19:                                   # LC_SEGMENT_64
        name = d[off+8:off+24].rstrip(b'\0').decode()
        _vmaddr, _vmsize, _fileoff, filesize = struct.unpack('<QQQQ', d[off+24:off+56])
        print(f'{name:15} {filesize/1048576:7.1f} MB')
    off += size
```

Read it as: `__TEXT` = executable code (the runtime, if one is embedded), `__BUN` = Bun's
appended payload (the native addon), `__LINKEDIT` small, `__DATA` small.

## 3. Isolate the fixed cost

```bash
printf 'console.log("hi")\n' > hello.ts
bun build --compile hello.ts --outfile hello
ls -l hello
```

A bare Bun compile is ~109 MB on Linux x64. If the app's binary is close to that, the app code
is not the problem and no amount of trimming will fix it.

## 4. Compare like with like

- tinyjs Pereda: 8.2 MB `.app` (5.9 MB runtime + 1.7 MB launcher + assets), 3.5 MB zip.
- gpuix Pereda: 114.8 MB `.app` (82.2 MB `__TEXT` + 24.2 MB `__BUN`), 51 MB zip, 32.5 MB xz.

Quote directory bytes and name the engine that accounts for them; "native" and "small" are
independent properties.
