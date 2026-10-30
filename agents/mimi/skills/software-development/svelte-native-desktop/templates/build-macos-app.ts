/// <reference types="bun" />
// Copy beside an app as build.ts, rename the constants, and wire:
//   "build": "bun build.ts", "build:app": "bun build.ts --app"
// `bun build.ts` compiles the entry into one executable (Bun runtime + Svelte + GPUI addon).
// `--app` wraps it as <NAME>.app on macOS: Info.plist, icon, ad-hoc signature.
// Needs Bun; the addon is the host platform's prebuilt one, so build on the target OS.

import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BunPlugin } from 'bun';
import { load_module, load_svelte, resolve_native_cjs, resolve_svelte } from 'gpuix-svelte/plugin';

const NAME = 'App';
const TITLE = 'App';
const BUNDLE_ID = 'se.example.app';
const MIN_MACOS = '15.0';
const ENTRY = './standalone.ts';

const root = fileURLToPath(new URL('./', import.meta.url));
const dist = join(root, 'dist');
const app = process.argv.includes('--app');
const binary = join(dist, process.platform === 'win32' ? `${NAME}.exe` : NAME);
const bundle = join(dist, `${NAME}.app`);
const icon = join(root, 'icon.png');
const identity = process.env.CODESIGN_IDENTITY;

if (app && process.platform !== 'darwin') {
	console.error(`[build] --app wraps a macOS bundle; nothing to wrap on ${process.platform}`);
	process.exit(1);
}

const PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleExecutable</key><string>${NAME}</string>
	<key>CFBundleIconFile</key><string>AppIcon</string>
	<key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
	<key>CFBundleName</key><string>${TITLE}</string>
	<key>CFBundlePackageType</key><string>APPL</string>
	<key>LSMinimumSystemVersion</key><string>${MIN_MACOS}</string>
	<key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`;

// Only needed for a real Developer ID under the hardened runtime: the addon is
// dlopen'd without our signature and JSC needs executable memory.
const ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
	<key>com.apple.security.cs.allow-jit</key><true/>
	<key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
	<key>com.apple.security.cs.disable-executable-page-protection</key><true/>
	<key>com.apple.security.cs.allow-dyld-environment-variables</key><true/>
	<key>com.apple.security.cs.disable-library-validation</key><true/>
</dict></plist>
`;

const conditions = ['custom-renderer', 'production'];
let components = 0;
const plugin: BunPlugin = {
	name: 'gpuix-svelte',
	setup(build) {
		build.onResolve({ filter: /^@gpuix\/native$/ }, resolve_native_cjs);
		build.onResolve({ filter: /^svelte(\/|$)/ }, resolve_svelte(conditions));
		build.onLoad({ filter: /\.svelte\.[jt]s$/ }, load_module);
		build.onLoad({ filter: /\.svelte$/ }, (args) => {
			components++;
			return load_svelte(args);
		});
	}
};

rmSync(binary, { force: true });
rmSync(bundle, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const result = await Bun.build({
	entrypoints: [join(root, ENTRY)],
	target: 'bun',
	conditions,
	define: { 'process.env.NODE_ENV': '"production"' },
	minify: true,
	plugins: [plugin],
	throw: false,
	compile: {
		outfile: binary,
		autoloadBunfig: false,
		autoloadDotenv: false,
		...(process.platform === 'win32' && { windows: { hideConsole: true } })
	}
});

if (!result.success || components === 0) {
	for (const log of result.logs) console.error(log);
	if (components === 0) console.error('no .svelte file went through the plugin');
	process.exit(1);
}

// The addon is at least 12MB: a smaller output lost it and will fail at launch.
const size = statSync(binary).size;
const floor = statSync(process.execPath).size + 12 * 1024 * 1024;
if (size < floor) {
	console.error(`[build] ${relative(root, binary)} is ${(size / 1048576).toFixed(1)} MB, under the addon floor`);
	process.exit(1);
}
console.log(`[build] ${relative(root, binary)} (${(size / 1048576).toFixed(1)} MB)`);

if (app) {
	const macos = join(bundle, 'Contents', 'MacOS');
	const resources = join(bundle, 'Contents', 'Resources');
	mkdirSync(macos, { recursive: true });
	mkdirSync(resources, { recursive: true });
	copyFileSync(binary, join(macos, NAME));
	chmodSync(join(macos, NAME), 0o755);
	writeFileSync(join(bundle, 'Contents', 'Info.plist'), PLIST);
	write_icns(icon, join(resources, 'AppIcon.icns'));

	if (identity) {
		const entitlements = join(dist, 'entitlements.plist');
		writeFileSync(entitlements, ENTITLEMENTS);
		run('codesign', ['--force', '--options', 'runtime', '--timestamp', '--entitlements', entitlements, '--sign', identity, bundle]);
	} else {
		// No Developer ID: ad-hoc is enough for the machine that built it.
		run('codesign', ['--force', '--deep', '--sign', '-', bundle]);
	}
	run('codesign', ['--verify', '--strict', bundle]);
	console.log(`[build] ${relative(root, bundle)}`);
}

// iconutil reads the ten standard sizes from an .iconset that sips cuts from the source.
function write_icns(png: string, out: string): void {
	const iconset = join(dist, 'AppIcon.iconset');
	rmSync(iconset, { recursive: true, force: true });
	mkdirSync(iconset);
	for (const points of [16, 32, 128, 256, 512]) {
		run('sips', ['-z', `${points}`, `${points}`, png, '--out', join(iconset, `icon_${points}x${points}.png`)]);
		run('sips', ['-z', `${points * 2}`, `${points * 2}`, png, '--out', join(iconset, `icon_${points}x${points}@2x.png`)]);
	}
	run('iconutil', ['-c', 'icns', iconset, '-o', out]);
	rmSync(iconset, { recursive: true, force: true });
}

function run(command: string, args: string[]): void {
	const { status, stdout, stderr } = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	if (status !== 0) {
		console.error(`[build] ${command} ${args.join(' ')} failed:\n${stderr || stdout}`);
		process.exit(1);
	}
}
