import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const resourcesRoot = path.join(projectRoot, 'src-tauri', 'resources');
const runtimeRoot = path.join(resourcesRoot, 'backend-runtime');
const runtimeArchive = path.join(resourcesRoot, 'backend-runtime.tar.gz');
const appRoot = path.join(runtimeRoot, 'app');

function copyDir(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing source path: ${source}`);
  }
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    dereference: false,
    filter: (src) => !src.includes(`${path.sep}.DS_Store`),
  });
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.chmodSync(target, fs.statSync(source).mode | 0o200);
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

function parseLinkedLibraries(binaryPath) {
  return run('otool', ['-L', binaryPath])
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(' ')[0])
    .filter(Boolean);
}

function resolveLinkedLibrary(reference, originDir) {
  if (reference.startsWith('/usr/lib/') || reference.startsWith('/System/Library/')) {
    return null;
  }
  if (reference.startsWith('@rpath/')) {
    const name = reference.slice('@rpath/'.length);
    const candidates = [
      path.join(originDir, '..', 'lib', name),
      path.join(originDir, name),
      path.join(path.dirname(process.execPath), '..', 'lib', name),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }
  if (reference.startsWith('@loader_path/')) {
    const relative = reference.slice('@loader_path/'.length);
    const candidate = path.resolve(originDir, relative);
    return fs.existsSync(candidate) ? candidate : null;
  }
  return fs.existsSync(reference) ? reference : null;
}

function collectDylibs(entryBinary) {
  const collected = new Map();
  const queued = new Set();
  const queue = [entryBinary];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentRealPath = fs.realpathSync(current);
    if (queued.has(currentRealPath)) {
      continue;
    }
    queued.add(currentRealPath);

    const originDir = path.dirname(current);

    for (const reference of parseLinkedLibraries(current)) {
      const resolved = resolveLinkedLibrary(reference, originDir);
      if (!resolved) {
        continue;
      }

      const realPath = fs.realpathSync(resolved);
      const name = path.basename(realPath);
      const alias = path.basename(reference);
      if (!collected.has(name)) {
        collected.set(name, realPath);
        queue.push(realPath);
      }
      if (alias && !alias.startsWith('@') && !collected.has(alias)) {
        collected.set(alias, realPath);
      }
    }
  }

  return collected;
}

function rewriteDylibReferences(binaryPath, dylibs) {
  try {
    execFileSync('install_name_tool', ['-add_rpath', '@executable_path/../lib', binaryPath]);
  } catch {
    // The rpath may already exist; dependency rewriting below is the important part.
  }

  for (const reference of parseLinkedLibraries(binaryPath)) {
    const resolved = resolveLinkedLibrary(reference, path.dirname(binaryPath));
    if (!resolved) {
      continue;
    }
    const name = path.basename(fs.realpathSync(resolved));
    if (dylibs.has(name)) {
      execFileSync('install_name_tool', ['-change', reference, `@rpath/${name}`, binaryPath]);
    }
  }
}

function codesignAdHoc(filePath) {
  try {
    execFileSync('codesign', ['--force', '--sign', '-', filePath], { stdio: 'ignore' });
  } catch {
    // Local unsigned binaries still run in development; signing is best-effort.
  }
}

function copyNodeRuntime() {
  const nodeTarget = path.join(runtimeRoot, 'bin', 'node');
  const libTarget = path.join(runtimeRoot, 'lib');
  const dylibs = collectDylibs(process.execPath);

  copyFile(process.execPath, nodeTarget);
  fs.mkdirSync(libTarget, { recursive: true });

  for (const [name, source] of dylibs) {
    copyFile(source, path.join(libTarget, name));
  }

  rewriteDylibReferences(nodeTarget, dylibs);
  codesignAdHoc(nodeTarget);

  for (const name of dylibs.keys()) {
    const dylibPath = path.join(libTarget, name);
    try {
      execFileSync('install_name_tool', ['-id', `@rpath/${name}`, dylibPath]);
    } catch {
      // Some libraries may not allow id rewriting; keep going and rewrite dependencies.
    }
    rewriteDylibReferences(dylibPath, dylibs);
    codesignAdHoc(dylibPath);
  }
}

function packagePath(packageName) {
  return path.join('node_modules', ...packageName.split('/'));
}

function collectDependencies(lockPath, packageNames) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const packages = lock.packages ?? {};
  const collected = new Set();
  const queue = [...packageNames];

  while (queue.length > 0) {
    const packageName = queue.shift();
    if (collected.has(packageName)) {
      continue;
    }

    const meta = packages[packagePath(packageName)];
    if (!meta) {
      console.warn(`Dependency not found in lockfile ${lockPath}: ${packageName}`);
      continue;
    }

    collected.add(packageName);
    for (const dependencyGroup of [meta.dependencies, meta.optionalDependencies]) {
      for (const dependencyName of Object.keys(dependencyGroup ?? {})) {
        if (!collected.has(dependencyName)) {
          queue.push(dependencyName);
        }
      }
    }
  }

  return collected;
}

function copyNodeDependencies(sourceRoot, packageNames) {
  for (const packageName of packageNames) {
    const source = path.join(sourceRoot, packagePath(packageName));
    const target = path.join(appRoot, packagePath(packageName));
    if (fs.existsSync(source)) {
      copyDir(source, target);
    }
  }
}

fs.rmSync(runtimeRoot, { recursive: true, force: true });
fs.rmSync(runtimeArchive, { force: true });
fs.mkdirSync(resourcesRoot, { recursive: true });
fs.mkdirSync(path.join(runtimeRoot, 'bin'), { recursive: true });
fs.mkdirSync(appRoot, { recursive: true });

copyNodeRuntime();

copyDir(path.join(projectRoot, 'backend', 'src'), path.join(appRoot, 'backend', 'src'));

const backendDependencies = collectDependencies(
  path.join(projectRoot, 'package-lock.json'),
  ['better-sqlite3', 'cors', 'express'],
);
copyNodeDependencies(projectRoot, backendDependencies);

const agentDependencyLock = path.join(repoRoot, 'package-lock.json');
if (fs.existsSync(agentDependencyLock)) {
  const agentDependencies = collectDependencies(
    agentDependencyLock,
    ['dotenv', 'openai', 'playwright', 'playwright-core'],
  );
  copyNodeDependencies(repoRoot, agentDependencies);
}

for (const dir of ['agents', 'core', 'src', 'config']) {
  copyDir(path.join(repoRoot, dir), path.join(appRoot, dir));
}

fs.writeFileSync(
  path.join(appRoot, 'backend', 'package.json'),
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
);

fs.writeFileSync(
  path.join(runtimeRoot, 'manifest.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    null,
    2,
  )}\n`,
);

execFileSync('tar', ['-czf', runtimeArchive, '-C', resourcesRoot, 'backend-runtime'], {
  stdio: 'inherit',
});

fs.rmSync(runtimeRoot, { recursive: true, force: true });

console.log(`Prepared backend runtime archive: ${runtimeArchive}`);
