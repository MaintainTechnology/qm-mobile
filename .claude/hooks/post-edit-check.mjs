// Lints the file Claude just edited and feeds any errors straight back so they get fixed
// in the same turn. Exits 0 (silently doing nothing) until the Expo app is scaffolded.
//
// Invoked by the PostToolUse hook in .claude/settings.json. Claude Code sends the tool payload
// on stdin; exit code 2 sends stderr back to Claude as a correction.

import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const eslintBin = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');

// Nothing to lint against yet — stay out of the way.
if (!existsSync(eslintBin)) process.exit(0);

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let file;
try {
  file = JSON.parse(Buffer.concat(chunks).toString('utf8'))?.tool_input?.file_path;
} catch {
  process.exit(0);
}

if (!file || !/\.[jt]sx?$/.test(file) || !existsSync(file)) process.exit(0);

try {
  // ponytail: single file only. Whole-project tsc belongs in a commit/CI gate, not every edit.
  execFileSync(process.execPath, [eslintBin, '--max-warnings', '0', file], {
    cwd: root,
    stdio: 'pipe',
  });
} catch (err) {
  const report = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
  // No output means eslint itself is missing or misconfigured, not that the code is bad.
  if (!report) process.exit(0);
  console.error(`ESLint failed on ${path.relative(root, file)}:\n${report}`);
  process.exit(2);
}
