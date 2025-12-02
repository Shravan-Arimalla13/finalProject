import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import jsconfigPaths from 'vite-jsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), jsconfigPaths(),,tailwindcss()],
  base: '/', 
  server: {
    host: true,
    port: 5173
  },
  resolve: {
    alias: {
      // Crucial: Force browser version of buffer
      buffer: 'buffer/',
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Global polyfills for libraries expecting Node environment
    'global': 'window',
    'process.env': {},
  },
  optimizeDeps: {
    // Force pre-bundling of problematic dependencies
    include: ['siwe', 'buffer', 'ethers'],
    esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
            global: 'globalThis',
        },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
        // Explicitly tell Rollup NOT to externalize these
        external: [], 
        output: {
            // Ensure proper chunking
            manualChunks: {
                vendor: ['react', 'react-dom', 'react-router-dom'],
                web3: ['ethers', 'siwe', 'buffer']
            }
        }
    }
  }
})