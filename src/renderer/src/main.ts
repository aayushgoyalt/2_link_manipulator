/**
 * Renderer Process Entry Point
 * 
 * This is the main entry point for the Vue 3 application running in the renderer process.
 * It initializes the Vue app and mounts it to the DOM.
 * 
 * Responsibilities:
 * - Import global styles (Tailwind CSS)
 * - Create Vue application instance
 * - Mount the app to the #app div in index.html
 * 
 * Note: This runs in the browser context (renderer process), not Node.js
 */

import './style.css'
import { createApp } from 'vue'
import App from './App.vue'

// Create and mount the Vue application
createApp(App).mount('#app')
