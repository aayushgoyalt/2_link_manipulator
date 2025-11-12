import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, bytecodePlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
// @ts-ignore - Tailwind v4 Vite plugin
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
      'process.env.GEMINI_MODEL': JSON.stringify(process.env.GEMINI_MODEL),
      'process.env.GEMINI_MAX_TOKENS': JSON.stringify(process.env.GEMINI_MAX_TOKENS),
      'process.env.GEMINI_TEMPERATURE': JSON.stringify(process.env.GEMINI_TEMPERATURE),
      'process.env.GEMINI_TIMEOUT': JSON.stringify(process.env.GEMINI_TIMEOUT)
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue(), tailwindcss()],
    css: {
      postcss: './postcss.config.cjs'
    }
  }
})
