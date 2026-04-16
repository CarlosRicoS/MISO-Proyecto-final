#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const runAll = args.has('--all');
const forceEnabled = args.has('--enable');
const forceDisabled = args.has('--disable');

const STYLE_EXTENSIONS = new Set(['.scss']);
const TEMPLATE_EXTENSIONS = new Set(['.html']);
const TS_EXTENSIONS = new Set(['.ts']);

function parseBooleanFlag(value) {
  if (!value) return false;

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function isGuardrailsEnabled() {
  if (forceEnabled && forceDisabled) {
    console.error('frontend-guardrails: cannot use --enable and --disable together.');
    process.exit(1);
  }

  if (forceEnabled) {
    return true;
  }

  if (forceDisabled) {
    return false;
  }

  return parseBooleanFlag(process.env.FRONTEND_GUARDRAILS_ENABLED);
}

function run(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function getRepoRoot() {
  const root = run('git rev-parse --show-toplevel');
  if (root) {
    return root;
  }

  return path.resolve(process.cwd(), '..');
}

function walkFiles(dirPath, collector) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, collector);
      continue;
    }

    collector.push(fullPath);
  }
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/');
}

function toRelative(rootPath, filePath) {
  return normalizeSlashes(path.relative(rootPath, filePath));
}

function resolveDiffRange() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const before = process.env.GITHUB_EVENT_BEFORE;
  const sha = process.env.GITHUB_SHA;

  const candidates = [];

  if (baseRef) {
    candidates.push(`origin/${baseRef}...HEAD`);
    candidates.push(`${baseRef}...HEAD`);
  }

  if (before && sha) {
    candidates.push(`${before}...${sha}`);
  }

  candidates.push('HEAD~1...HEAD');

  for (const candidate of candidates) {
    const output = run(`git diff --name-only --diff-filter=ACMR ${candidate} -- user_interface/src`);
    if (output !== '') {
      return candidate;
    }
  }

  return null;
}

function parseAddedLinesFromDiff(diffText) {
  const addedLinesByFile = new Map();

  let currentFile = null;
  let newLineNumber = 0;

  for (const rawLine of diffText.split('\n')) {
    if (rawLine.startsWith('+++ b/')) {
      currentFile = rawLine.slice(6);
      continue;
    }

    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/\+(\d+)/);
      newLineNumber = match ? Number(match[1]) : 0;
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      const list = addedLinesByFile.get(currentFile) || [];
      list.push({ line: newLineNumber, text: rawLine.slice(1) });
      addedLinesByFile.set(currentFile, list);
      newLineNumber += 1;
      continue;
    }

    if (rawLine.startsWith('-') && !rawLine.startsWith('---')) {
      continue;
    }

    if (rawLine.startsWith(' ')) {
      newLineNumber += 1;
    }
  }

  return addedLinesByFile;
}

function getAllFrontendFiles(repoRoot) {
  const srcDir = path.join(repoRoot, 'user_interface', 'src');

  if (!fs.existsSync(srcDir)) {
    return [];
  }

  const allPaths = [];
  walkFiles(srcDir, allPaths);

  return allPaths
    .filter((filePath) => {
      const ext = path.extname(filePath);
      return STYLE_EXTENSIONS.has(ext) || TEMPLATE_EXTENSIONS.has(ext) || TS_EXTENSIONS.has(ext);
    })
    .map((absolutePath) => ({
      file: toRelative(repoRoot, absolutePath),
      lines: fs.readFileSync(absolutePath, 'utf8').split('\n').map((text, index) => ({
        line: index + 1,
        text,
      })),
    }));
}

function getChangedFrontendFiles(repoRoot) {
  const range = resolveDiffRange();

  if (range) {
    const diff = run(`git diff --unified=0 --no-color ${range} -- user_interface/src`);
    if (diff) {
      const parsed = parseAddedLinesFromDiff(diff);
      return Array.from(parsed.entries()).map(([file, lines]) => ({ file, lines }));
    }
  }

  const stagedDiff = run('git diff --cached --unified=0 --no-color -- user_interface/src');
  if (stagedDiff) {
    const parsed = parseAddedLinesFromDiff(stagedDiff);
    return Array.from(parsed.entries()).map(([file, lines]) => ({ file, lines }));
  }

  const unstagedDiff = run('git diff --unified=0 --no-color -- user_interface/src');
  if (unstagedDiff) {
    const parsed = parseAddedLinesFromDiff(unstagedDiff);
    return Array.from(parsed.entries()).map(([file, lines]) => ({ file, lines }));
  }

  return [];
}

function shouldIgnoreStyleLine(trimmedLine) {
  if (!trimmedLine) return true;
  if (trimmedLine.startsWith('//')) return true;
  if (trimmedLine.startsWith('/*')) return true;
  if (trimmedLine.startsWith('*')) return true;
  if (trimmedLine.startsWith('*/')) return true;
  return false;
}

function checkStyleLine(file, lineNumber, lineText, violations) {
  const trimmed = lineText.trim();

  if (shouldIgnoreStyleLine(trimmed)) {
    return;
  }

  const colorLiteral = /(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/;
  if (colorLiteral.test(lineText) && !lineText.includes('var(') && !lineText.includes('url(')) {
    violations.push({
      file,
      line: lineNumber,
      rule: 'theme-color-token',
      message: 'Use existing theme color tokens (var(--th-*)) instead of raw color literals.',
      snippet: trimmed,
    });
  }

  const tokenizableDeclaration = lineText.match(/^\s*(margin|padding|gap|row-gap|column-gap|border-radius|font-size|font-weight|line-height|letter-spacing)\s*:\s*([^;]+);/);
  if (!tokenizableDeclaration) {
    return;
  }

  const value = tokenizableDeclaration[2].trim();

  if (value.includes('var(')) return;
  if (value.startsWith('clamp(')) return;
  if (value.startsWith('calc(')) return;
  if (['0', '0px', 'inherit', 'auto', 'normal', 'initial', 'unset'].includes(value)) return;
  if (value.includes(' ')) return;
  if (value.includes('/')) return;
  if (value.includes(',')) return;
  if (value.endsWith('%') || value.endsWith('rem') || value.endsWith('em') || value.endsWith('vw') || value.endsWith('vh')) return;

  const isNumericTokenCandidate = /^-?\d+(\.\d+)?(px)?$/.test(value);
  if (!isNumericTokenCandidate) {
    return;
  }

  violations.push({
    file,
    line: lineNumber,
    rule: 'theme-spacing-typography-token',
    message: 'Use existing spacing/radius/typography tokens from theme variables instead of raw numeric values.',
    snippet: trimmed,
  });
}

function checkTemplateLine(file, lineNumber, lineText, violations) {
  const rawControl = /<\s*(button|input|select|textarea)\b/i;

  if (!rawControl.test(lineText)) {
    return;
  }

  if (lineText.includes('data-allow-native') || lineText.includes('guardrails:allow-native')) {
    return;
  }

  violations.push({
    file,
    line: lineNumber,
    rule: 'ionic-first-ui',
    message: 'Prefer Ionic controls (ion-button, ion-input, ion-select, ion-textarea) unless explicitly justified.',
    snippet: lineText.trim(),
  });
}

function checkTypeScriptLine(file, lineNumber, lineText, violations) {
  const selectorMatch = lineText.match(/selector\s*:\s*['\"](th-[^'\"]+)['\"]/);

  if (!selectorMatch) {
    return;
  }

  if (file.includes('user_interface/src/app/shared/components/')) {
    return;
  }

  violations.push({
    file,
    line: lineNumber,
    rule: 'shared-component-location',
    message: `Selector ${selectorMatch[1]} should be declared under user_interface/src/app/shared/components for reuse consistency.`,
    snippet: lineText.trim(),
  });
}

function runChecks(fileEntries) {
  const violations = [];

  for (const entry of fileEntries) {
    const ext = path.extname(entry.file);

    for (const line of entry.lines) {
      if (STYLE_EXTENSIONS.has(ext)) {
        checkStyleLine(entry.file, line.line, line.text, violations);
      }

      if (TEMPLATE_EXTENSIONS.has(ext)) {
        checkTemplateLine(entry.file, line.line, line.text, violations);
      }

      if (TS_EXTENSIONS.has(ext)) {
        checkTypeScriptLine(entry.file, line.line, line.text, violations);
      }
    }
  }

  return violations;
}

function printResult(violations) {
  if (violations.length === 0) {
    console.log('frontend-guardrails: no violations found.');
    return 0;
  }

  console.error(`frontend-guardrails: found ${violations.length} violation(s):`);

  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    console.error(`  ${violation.snippet}`);
  }

  console.error('\nFix the violations or add an explicit exception marker for native controls: data-allow-native or guardrails:allow-native.');
  return 1;
}

function main() {
  const enabled = isGuardrailsEnabled();

  if (!enabled) {
    console.log('frontend-guardrails: skipped (disabled by default). Use --enable or FRONTEND_GUARDRAILS_ENABLED=true to run checks.');
    process.exit(0);
  }

  const repoRoot = getRepoRoot();

  if (!fs.existsSync(path.join(repoRoot, '.git'))) {
    console.error('frontend-guardrails: unable to locate git repository root.');
    process.exit(1);
  }

  const fileEntries = runAll ? getAllFrontendFiles(repoRoot) : getChangedFrontendFiles(repoRoot);

  if (fileEntries.length === 0) {
    console.log('frontend-guardrails: no frontend changes detected.');
    process.exit(0);
  }

  const violations = runChecks(fileEntries);
  process.exit(printResult(violations));
}

main();
