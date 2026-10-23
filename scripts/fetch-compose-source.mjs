#!/usr/bin/env node
// Sparse-clones the Compose Material3, material3-ripple and graphics-shapes sources into .cache/androidx
// so `npm run tokens` can regenerate packages/tokens. Pass a ref to pin a commit.

import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const dir = '.cache/androidx';
const ref = process.argv[2] ?? 'androidx-main';
const git = (...args) => execFileSync('git', args, {stdio: 'inherit'});

if (!existsSync(dir)) {
  git(
    'clone',
    '--depth',
    '1',
    '--filter=blob:none',
    '--sparse',
    '--branch',
    ref,
    'https://github.com/androidx/androidx.git',
    dir,
  );
} else {
  git('-C', dir, 'fetch', '--depth', '1', 'origin', ref);
  git('-C', dir, 'checkout', 'FETCH_HEAD');
}
git(
  '-C',
  dir,
  'sparse-checkout',
  'set',
  'compose/material3/material3/src/commonMain',
  'compose/material3/material3-ripple/src/commonMain',
  'compose/ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics',
  'graphics/graphics-shapes/src/commonMain',
);
