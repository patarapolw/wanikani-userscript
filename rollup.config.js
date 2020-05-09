import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/external/external-def.ts',
  output: {
    dir: 'lib',
    format: 'iife',
    globals: {
      // https://www.npmjs.com/package/@lyo/cheerio
      cheerio: 'cheerio'
    }
  },
  external: ['cheerio'],
  plugins: [typescript({
    module: 'es2015'
  })]
}
