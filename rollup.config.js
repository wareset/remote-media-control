import { minify } from 'terser'
import pkg from './package.json'
import json from '@rollup/plugin-json'
import babel from '@rollup/plugin-babel'
import svelte from 'rollup-plugin-svelte'
import preprocess from 'svelte-preprocess'
import replace from '@rollup/plugin-replace'
import sucrase from '@rollup/plugin-sucrase'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import livereload from 'rollup-plugin-livereload'
// import css from 'rollup-plugin-css-only'

const production = !process.env.ROLLUP_WATCH

const terser = {
  async renderChunk(code) {
    return await minify(code, { safari10: true })
  }
}

const env = (browser) => replace({
  preventAssignment: true,
  values           : {
    'process.browser'     : JSON.stringify(!!browser),
    'process.env.DEV'     : JSON.stringify(!production),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
})

export default [
  // client
  {
    input : 'src/client/index.ts',
    output: {
      sourcemap: false,
      format   : 'iife',
      name     : 'app',
      file     : 'app/assets/bundle.js'
    },
    plugins: [
      env(true),
      json(),
      svelte({ preprocess: [preprocess()] }),
      resolve({ browser: true, dedupe: ['svelte'] }),
      sucrase({ exclude: ['node_modules/**'], transforms: ['typescript'] }),
      commonjs(),
      
      !production && livereload({ watch: 'app/assets', delay: 1000 }),

      production && babel({
        babelHelpers: 'bundled',
        // babelrc: false,
        presets     : [
          [
            '@babel/preset-env',
            {
              corejs     : 3,
              loose      : true,
              bugfixes   : true,
              modules    : false,
              useBuiltIns: 'entry', // 'entry', 'usage'
              targets    : '> 1%, not dead'
            }
          ]
        ],
        plugins: [
          [
            '@babel/plugin-transform-template-literals',
            { loose: true }
          ],
          [
            '@babel/plugin-proposal-class-properties',
            { loose: true }
          ],
          [
            '@babel/plugin-transform-block-scoping',
            { loose: true }
          ]
        ]
      }),
      production && terser,
      {
        renderChunk(code) {
          return '/* eslint-disable */\n' + code
        }
      }
    ],

    watch: { clearScreen: false }
  },

  // server
  {
    input : 'src/server/index.ts',
    output: {
      sourcemap: false,
      format   : 'cjs',
      file     : 'app/index.js'
    },
    plugins: [
      env(false),
      json(),
      sucrase({ transforms: ['typescript'] }),
      commonjs(),
      production && terser,
      {
        renderChunk(code) {
          return '/* eslint-disable */\n' + code
        }
      }
    ],

    external: Object.keys(pkg.dependencies).concat(require('module').builtinModules),

    preserveEntrySignatures: 'strict',
  
    watch: { clearScreen: false }
  }
]
