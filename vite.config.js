import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import mkcert from'vite-plugin-mkcert'

import * as path from 'path'
import * as fs from 'fs'

// Plugin for Oauth Callback URL
const getPanelPlugin = () => {
  return {
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (req.originalUrl?.includes('/get-panel')) {
            res.setHeader('Content-Type', 'text/html')
            res.writeHead(200)
            res.write(fs.readFileSync(path.join(__dirname, 'public/get-panel/index.html')))
            res.end()
          }
          next()
        })
      }
    },
    name: 'get-panel',
  }
}

export default defineConfig({
  plugins: [vue(), getPanelPlugin(), mkcert({
    hosts: [ 'localhost' ],

    // NOTE: By default the CERTs are saved in [USER-HOME]/.vite-plugin-mkcert directory .. override using following setting
    // savePath: path.resolve(process.cwd(), 'node_modules/.mkcert'),

  })],

  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          let fileExt = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|woff|woff2/.test(fileExt)) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      './runtimeConfig': './runtimeConfig.browser', //fix production build
    },
  },
  server: {
    https: true,    
    port: 9898,
  },
  define: {},

})
