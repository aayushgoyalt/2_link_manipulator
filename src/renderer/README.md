# Renderer Process Directory

## Purpose
This directory contains the **renderer process** code - the Vue 3 application that runs in the browser environment.

## What is the Renderer Process?
The renderer process:
- Runs in a Chromium browser environment
- Handles all UI rendering and user interactions
- Uses web technologies (HTML, CSS, JavaScript/TypeScript)
- Cannot directly access Node.js APIs (security)
- Communicates with main process via IPC (through preload script)

## Structure

```
renderer/
├── index.html              # HTML entry point
├── vite.config.ts          # Vite build configuration
└── src/
    ├── main.ts             # Vue app initialization
    ├── App.vue             # Root Vue component
    ├── style.css           # Global styles (Tailwind)
    ├── env.d.ts            # TypeScript environment types
    └── components/         # Vue components
        ├── Manipulator.vue
        ├── ManipulatorCanvas.vue
        └── ManipulatorControls.vue
```

## Files

### `index.html`
**HTML entry point**
- Defines the `#app` mount point for Vue
- Includes Content Security Policy (CSP) meta tag
- Loads the main TypeScript entry point

### `vite.config.ts`
**Vite build configuration for renderer**
- Configures Vue plugin
- Sets up Tailwind CSS
- Defines path aliases (@renderer)
- Configures PostCSS

### `src/main.ts`
**Vue application initialization**
- Imports global styles
- Creates Vue app instance
- Mounts app to DOM

### `src/App.vue`
**Root Vue component**
- Top-level component
- Simply renders the Manipulator component

### `src/style.css`
**Global styles**
- Imports Tailwind CSS
- No custom CSS (all styling via Tailwind utilities)

### `src/env.d.ts`
**TypeScript environment declarations**
- Type definitions for Vue
- Type definitions for Vite
- Module declarations

## Components Directory

See [components/README.md](src/components/README.md) for detailed component documentation.

### Component Overview
- **Manipulator.vue**: State management and business logic
- **ManipulatorCanvas.vue**: Canvas rendering and visualization
- **ManipulatorControls.vue**: User interface controls

## Technology Stack

### Core
- **Vue 3**: UI framework (Composition API)
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server

### Styling
- **Tailwind CSS v4**: Utility-first CSS framework
- **PostCSS**: CSS processing

### APIs Used
- **HTML5 Canvas**: 2D graphics rendering
- **RequestAnimationFrame**: Smooth animations
- **Vue Reactivity**: State management

## Development

### Running Locally
```bash
# Development mode (with Electron)
npm run dev

# Web-only development
npm run build:web
npm run preview:web
```

### Hot Module Replacement (HMR)
- Changes to Vue components reload instantly
- CSS changes apply without page reload
- State is preserved during HMR when possible

### DevTools
- **Vue DevTools**: Install browser extension for debugging
- **Browser DevTools**: F12 for console, network, etc.
- **Vite DevTools**: Built into dev server

## Build Process

### Development Build
```bash
npm run dev
```
- Fast rebuilds
- Source maps enabled
- Hot module replacement
- No minification

### Production Build
```bash
npm run build        # Electron
npm run build:web    # Web
```
- Minified code
- Tree-shaking (removes unused code)
- CSS purging (removes unused Tailwind classes)
- Optimized chunks

## Architecture Patterns

### Composition API
All components use Vue 3 Composition API with `<script setup>`:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>
```

### Props & Events
```vue
<!-- Parent -->
<Child :value="data" @update="handleUpdate" />

<!-- Child -->
<script setup lang="ts">
interface Props {
  value: number
}
defineProps<Props>()

const emit = defineEmits<{
  update: [value: number]
}>()
</script>
```

### Reactive State
```typescript
// Primitive values
const count = ref(0)
count.value++

// Objects
const state = reactive({ x: 0, y: 0 })
state.x++

// Computed
const doubled = computed(() => count.value * 2)

// Watchers
watch(() => count.value, (newVal) => {
  console.log('Changed:', newVal)
})
```

## Styling Approach

### Tailwind Utilities
All styling uses Tailwind utility classes:
```vue
<div class="flex w-screen h-screen bg-[#1a1a1a] text-white">
  <button class="px-6 py-3 bg-[#4ecdc4] hover:bg-[#5fd9d0]">
    Click Me
  </button>
</div>
```

### Custom Colors
Uses hex values for dark theme:
- Background: `#1a1a1a`, `#0a0a0a`
- Borders: `#333`, `#555`
- Text: `#ffffff`, `#ccc`, `#888`
- Accents: `#4ecdc4`, `#ffe66d`, `#ff6b6b`

### No Custom CSS
- No separate CSS files for components
- All styles inline via Tailwind
- Maintains consistency and reduces bundle size

## Security

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data:" />
```

### Context Isolation
- Renderer cannot access Node.js APIs directly
- Must use exposed APIs from preload script
- Prevents XSS attacks from accessing system

### Sandboxing
- Renderer runs in sandboxed environment
- Limited system access
- Safe execution of untrusted code

## Performance

### Optimization Techniques
1. **Computed Properties**: Cache derived values
2. **Lazy Loading**: Components loaded on demand (if needed)
3. **Tree Shaking**: Unused code removed
4. **CSS Purging**: Unused Tailwind classes removed
5. **Code Splitting**: Automatic chunk optimization

### Canvas Performance
- Only redraws when necessary (reactive)
- Uses `requestAnimationFrame` for smooth 60fps
- Efficient coordinate transformations
- Minimal state updates

## Common Tasks

### Adding a New Component
1. Create `ComponentName.vue` in `src/components/`
2. Define props interface
3. Implement logic with Composition API
4. Add Tailwind styling
5. Import and use in parent component

### Adding Global Styles
Edit `src/style.css`:
```css
@import "tailwindcss";

/* Custom global styles here */
```

### Accessing Electron APIs
Use exposed APIs from preload:
```typescript
// If exposed in preload script
window.api.someMethod()
window.electron.ipcRenderer.send('channel')
```

### State Management
For simple apps (like this one):
- Use props/events for parent-child communication
- Use composables for shared logic
- Keep state in parent components

For complex apps, consider:
- Pinia (Vue state management)
- Vuex (legacy option)

## Debugging Tips

### Vue DevTools
- Install browser extension
- Inspect component hierarchy
- View reactive state
- Track events
- Performance profiling

### Console Logging
```typescript
// Development only
if (import.meta.env.DEV) {
  console.log('Debug info:', data)
}
```

### Breakpoints
- Use browser DevTools
- Set breakpoints in TypeScript source
- Source maps enabled in development

## Testing

### Recommended Tools
- **Vitest**: Unit testing (Vite-native)
- **Vue Test Utils**: Component testing
- **Playwright**: E2E testing

### Example Test Structure
```typescript
import { mount } from '@vue/test-utils'
import Manipulator from './Manipulator.vue'

describe('Manipulator', () => {
  it('initializes with default values', () => {
    const wrapper = mount(Manipulator)
    expect(wrapper.vm.theta1).toBe(45)
  })
})
```

## Environment Variables

### Vite Environment Variables
```typescript
// Access in code
import.meta.env.MODE        // 'development' or 'production'
import.meta.env.DEV         // boolean
import.meta.env.PROD        // boolean
import.meta.env.BASE_URL    // base URL
```

### Custom Variables
Define in `.env`:
```bash
VITE_API_URL=https://api.example.com
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## Deployment

### Web Deployment
Build output (`dist-web/`) is static files:
- Can be hosted on any static file server
- No server-side processing required
- Works with: Netlify, Vercel, GitHub Pages, S3, etc.

### Electron Deployment
Renderer code is bundled into the Electron app:
- No separate deployment needed
- Included in desktop installers
- Updates via Electron auto-updater (if configured)

## Resources

- [Vue 3 Docs](https://vuejs.org/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [Canvas API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
