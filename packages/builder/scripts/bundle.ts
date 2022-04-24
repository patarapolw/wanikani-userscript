import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

import yaml from 'js-yaml';

async function main() {
  const dstDir = '../../lib';

  spawnSync('rm', ['-r', dstDir]);

  const list = yaml.load(readFileSync('userscripts.yaml', 'utf-8')) as {
    src: string;
    meta: string;
  }[];

  list.map(({ src, meta }) => {
    const dst =
      dstDir + '/' + src.replace(/^src\//, '').replace(/\.ts$/, '.user.js');

    spawnSync(
      './node_modules/.bin/esbuild',
      [src, '--bundle', `--outfile=${dst}`],
      { stdio: 'inherit' },
    );

    writeFileSync(dst, meta + '\n' + readFileSync(dst, 'utf-8'));
  });
}

if (require.main === module) {
  main();
}
