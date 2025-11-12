import './style.css'

import { createApp } from 'vue'
import App from './App.vue'

// Import test utilities to expose quickTest to window
import './utils/testRunner'

createApp(App).mount('#app')
