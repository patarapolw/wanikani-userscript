// @ts-check

const { spawnSync } = require('child_process')
const { sync: glob } = require('fast-glob')

async function main() {
  const srcDir = 'src'
  const dstDir = 'lib'

  glob(['**/*.ts', '!deps/**/*'], {
    cwd: srcDir
  }).map((f) => {
    spawnSync(
      './node_modules/.bin/esbuild',
      [
        `${srcDir}/${f}`,
        '--bundle',
        `--outfile=${dstDir}/${f.replace(/\.ts$/, '.js')}`
      ],
      { stdio: 'inherit' }
    )
  })
}

if (require.main === module) {
  main()
}
