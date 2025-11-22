# 2-Link Manipulator - LLM Context Document

## Purpose
This document provides structured context for Large Language Models to understand and work with this codebase effectively. It includes architecture, patterns, conventions, and key implementation details.

---

## Project Identity

**Name**: 2-Link Manipulator  
**Type**: Hybrid Desktop/Web Application  
**Framework**: Electron + Vue 3 + TypeScript  
**Domain**: Robotics Visualization / Educational Tool  
**Version**: 1.0.0

---

## Core Functionality

### What It Does
Visualizes a 2-link robotic manipulator with interactive controls for:
- Joint angles (θ₁, θ₂): -180° to 180°
- Link lengths (L₁, L₂): 50px to 250px
- Real-time forward kinematics calculation
- **Inverse kinematics solver** with target position control
- **Trajectory tracking** with visual path history
- Automatic animation mode
- Visual workspace representation
- Elbow configuration control (up/down)

### Mathematical Model
```
Forward Kinematics:
  Joint 1 Position:
    x₁ = L₁ · cos(θ₁)
    y₁ = L₁ · sin(θ₁)
  
  End Effector Position:
    x = L₁ · cos(θ₁) + L₂ · cos(θ₁ + θ₂)
    y = L₁ · sin(θ₁) + L₂ · sin(θ₁ + θ₂)
  
  Inverse Kinematics:
    Given target (x, y), solve for (θ₁, θ₂):
    
    d = √(x² + y²)  // Distance to target
    
    θ₂ = ±acos((L₁² + L₂² - d²) / (2·L₁·L₂))  // Law of cosines
    θ₁ = atan2(y, x) - atan2(L₂·sin(θ₂), L₁ + L₂·cos(θ₂))
    
    Two solutions: + for elbow up, - for elbow down
  
  Workspace:
    Maximum Reach: L₁ + L₂
    Minimum Reach: |L₁ - L₂|
    Reachable: |L₁ - L₂| ≤ d ≤ L₁ + L₂
```

---

## Architecture

### Process Model (Electron)
```
Main Process (Node.js)
  ├── Window Management
  ├── Application Lifecycle
  └── IPC Handlers (if needed)
  
Preload Script (Bridge)
  └── Context Bridge (Security Layer)
  
Renderer Process (Browser)
  └── Vue 3 Application
      ├── Reactive State
      ├── Canvas Rendering
      └── User Interface
```

### Component Hierarchy
```
App.vue (Root)
  └── Manipulator.vue (State & Logic)
       ├── ManipulatorCanvas.vue (Visualization)
       └── ManipulatorControls.vue (UI Controls)
```

### Data Flow
```
User Input (Controls)
  → Event Emission
    → State Update (Manipulator)
      → Computed Properties Recalculate
        → Props Update
          → Canvas Redraws
```

---

## Technology Stack

### Runtime Environments
- **Main Process**: Node.js (Electron)
- **Renderer Process**: Chromium (Browser)

### Core Dependencies
```json
{
  "electron": "^28.2.0",
  "vue": "^3.4.15",
  "typescript": "^5.3.3",
  "vite": "^5.0.12",
  "tailwindcss": "^4.1.17"
}
```

### Build Tools
- **electron-vite**: Unified build system
- **electron-builder**: Desktop packaging
- **vue-tsc**: TypeScript checking for Vue
- **ESLint + Prettier**: Code quality

---

## File Structure

### Critical Files
```
src/
├── main/index.ts              # Electron main process entry
├── preload/index.ts           # IPC bridge (security)
└── renderer/
    ├── index.html             # HTML entry point
    ├── src/
    │   ├── main.ts            # Vue app initialization
    │   ├── App.vue            # Root component
    │   ├── style.css          # Global styles (Tailwind)
    │   ├── components/
    │   │   ├── Manipulator.vue        # State management
    │   │   ├── ManipulatorCanvas.vue  # Canvas rendering
    │   │   └── ManipulatorControls.vue # UI controls
    │   └── utils/
    │       └── inverseKinematics.ts   # IK solver algorithms
    └── vite.config.ts         # Renderer build config

electron.vite.config.ts        # Electron build config
vite.config.web.mjs            # Web build config
package.json                   # Dependencies & scripts
tsconfig.json                  # TypeScript config
```

### Build Outputs
- `out/`: Electron desktop builds
- `dist-web/`: Web static files

---

## Code Patterns & Conventions

### Vue 3 Composition API
```typescript
// Standard pattern used throughout
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// Reactive state
const value = ref<number>(0)

// Computed properties
const derived = computed(() => value.value * 2)

// Watchers
watch(() => value.value, (newVal) => {
  console.log('Changed:', newVal)
})

// Lifecycle
onMounted(() => { /* init */ })
onUnmounted(() => { /* cleanup */ })
</script>
```

### TypeScript Interfaces
```typescript
// Props interface pattern
interface Props {
  theta1: number
  theta2: number
  L1: number
  L2: number
  joint1: { x: number; y: number }
  endEffector: { x: number; y: number }
}

const props = defineProps<Props>()
```

### Event Emission Pattern
```typescript
// Emitter definition
const emit = defineEmits<{
  'update:theta1': [value: number]
  'update:theta2': [value: number]
  start: []
  stop: []
  reset: []
}>()

// Usage
emit('update:theta1', newValue)
emit('start')
```

### Canvas Rendering Pattern
```typescript
// Standard canvas setup
const canvas = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

onMounted(() => {
  if (canvas.value) {
    ctx.value = canvas.value.getContext('2d')
    draw()
  }
})

const draw = () => {
  if (!ctx.value || !canvas.value) return
  
  const c = ctx.value
  c.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Transform coordinate system
  c.save()
  c.translate(width/2, height/2)
  c.scale(1, -1)  // Flip Y-axis
  
  // Drawing operations...
  
  c.restore()
}
```

---

## State Management

### Manipulator.vue State
```typescript
// Primary state (reactive refs)
const theta1 = ref(45)      // Joint 1 angle (degrees)
const theta2 = ref(30)      // Joint 2 angle (degrees)
const L1 = ref(150)         // Link 1 length (pixels)
const L2 = ref(100)         // Link 2 length (pixels)
const isMoving = ref(false) // Animation state
const trajectory = ref<Array<{ x: number; y: number }>>([]) // Path history
const showTrajectory = ref(true)  // Trajectory visibility
const targetX = ref(100)    // IK target X coordinate
const targetY = ref(100)    // IK target Y coordinate
const elbowUp = ref(true)   // Elbow configuration (up/down)

// Derived state (computed)
const joint1 = computed(() => ({
  x: L1.value * Math.cos(theta1.value * Math.PI / 180),
  y: L1.value * Math.sin(theta1.value * Math.PI / 180)
}))

const endEffector = computed(() => {
  const t1 = theta1.value * Math.PI / 180
  const t2 = theta2.value * Math.PI / 180
  return {
    x: L1.value * Math.cos(t1) + L2.value * Math.cos(t1 + t2),
    y: L1.value * Math.sin(t1) + L2.value * Math.sin(t1 + t2)
  }
})

const isTargetReachable = computed(() => {
  const distance = Math.sqrt(targetX.value ** 2 + targetY.value ** 2)
  return distance <= L1.value + L2.value && 
         distance >= Math.abs(L1.value - L2.value)
})
```

### State Flow
1. User interacts with controls
2. Controls emit events
3. Manipulator updates state
4. Computed properties recalculate
5. Props propagate to child components
6. Canvas redraws automatically (via watch)

---

## Key Algorithms

### Forward Kinematics
```typescript
/**
 * Calculate end effector position from joint angles
 * 
 * @param theta1 - First joint angle (degrees)
 * @param theta2 - Second joint angle (degrees)
 * @param L1 - First link length (pixels)
 * @param L2 - Second link length (pixels)
 * @returns End effector position {x, y}
 */
function forwardKinematics(
  theta1: number,
  theta2: number,
  L1: number,
  L2: number
): { x: number; y: number } {
  const t1 = (theta1 * Math.PI) / 180
  const t2 = (theta2 * Math.PI) / 180
  
  return {
    x: L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2),
    y: L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2)
  }
}
```

### Inverse Kinematics
```typescript
/**
 * Solve inverse kinematics for 2-link manipulator
 * Uses geometric method with law of cosines
 * 
 * @param targetX - Desired X coordinate
 * @param targetY - Desired Y coordinate
 * @param L1 - Length of first link
 * @param L2 - Length of second link
 * @param elbowUp - Elbow configuration (true = up, false = down)
 * @returns IK solution with joint angles
 */
function solveIK(
  targetX: number,
  targetY: number,
  L1: number,
  L2: number,
  elbowUp: boolean = true
): IKSolution {
  // Calculate distance to target
  const distance = Math.sqrt(targetX * targetX + targetY * targetY)
  
  // Check reachability
  const minReach = Math.abs(L1 - L2)
  const maxReach = L1 + L2
  if (distance > maxReach || distance < minReach) {
    return { theta1: 0, theta2: 0, isValid: false, elbow: elbowUp ? 'up' : 'down' }
  }
  
  // Calculate θ₂ using law of cosines
  const cosTheta2 = (L1 * L1 + L2 * L2 - distance * distance) / (2 * L1 * L2)
  const theta2Rad = elbowUp ? Math.acos(cosTheta2) : -Math.acos(cosTheta2)
  
  // Calculate θ₁ using geometry
  const alpha = Math.atan2(targetY, targetX)
  const beta = Math.atan2(L2 * Math.sin(theta2Rad), L1 + L2 * Math.cos(theta2Rad))
  const theta1Rad = alpha - beta
  
  return {
    theta1: (theta1Rad * 180) / Math.PI,
    theta2: (theta2Rad * 180) / Math.PI,
    isValid: true,
    elbow: elbowUp ? 'up' : 'down'
  }
}
```

### Animation Loop
```typescript
/**
 * Automatic animation using requestAnimationFrame
 * Increments angles at different rates for visual interest
 */
const startMovement = () => {
  if (isMoving.value) return
  isMoving.value = true

  const animate = () => {
    theta1.value += 1      // 1°/frame (~60°/sec at 60fps)
    theta2.value += 0.5    // 0.5°/frame (~30°/sec at 60fps)

    // Wrap angles to [-180, 180] range
    if (theta1.value > 180) theta1.value = -180
    if (theta2.value > 180) theta2.value = -180

    animationId = requestAnimationFrame(animate)
  }

  animationId = requestAnimationFrame(animate)
}
```

### Canvas Coordinate Transform
```typescript
/**
 * Transform canvas to standard mathematical coordinate system
 * - Origin at center
 * - Y-axis pointing upward
 */
const setupCoordinates = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.save()
  ctx.translate(width / 2, height / 2)  // Center origin
  ctx.scale(1, -1)                      // Flip Y-axis
  
  // Now (0,0) is center, Y increases upward
}
```

---

## Styling System

### Tailwind CSS Usage
- **Utility-first**: Classes directly in templates
- **Custom colors**: Hex values for dark theme
- **Responsive**: Flexbox layouts
- **No custom CSS**: Everything via Tailwind utilities

### Color Palette
```css
/* Dark Theme */
--bg-primary: #1a1a1a      /* Main background */
--bg-secondary: #0a0a0a    /* Canvas background */
--border: #333             /* Borders and grid */
--text-primary: #ffffff    /* Main text */
--text-secondary: #ccc     /* Labels */
--text-muted: #888         /* Hints */

/* Accent Colors */
--accent-cyan: #4ecdc4     /* Link 1, primary actions */
--accent-yellow: #ffe66d   /* Joint 1 */
--accent-red: #ff6b6b      /* Base, end effector, stop */
--accent-light-cyan: #95e1d3 /* Link 2 */
```

### Component Styling Pattern
```vue
<template>
  <div class="flex w-screen h-screen bg-[#1a1a1a] text-white">
    <!-- Inline Tailwind classes -->
  </div>
</template>
```

---

## Build System

### Development
```bash
npm run dev              # Electron dev mode (hot reload)
npm run build:web        # Build web version
npm run preview:web      # Preview web build
```

### Production
```bash
npm run build            # Build Electron app
npm run build:win        # Windows installer
npm run build:mac        # macOS .dmg
npm run build:linux      # Linux packages
```

### Build Configurations

**Electron Build** (`electron.vite.config.ts`):
```typescript
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  renderer: {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: { '@renderer': resolve('src/renderer/src') }
    }
  }
})
```

**Web Build** (`vite.config.web.mjs`):
```javascript
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true
  }
})
```

---

## Testing Strategy

### Current State
- No automated tests currently implemented
- Manual testing via development mode

### Recommended Testing Approach
1. **Unit Tests**: Forward kinematics calculations
2. **Component Tests**: Vue component behavior
3. **E2E Tests**: Full application workflows
4. **Visual Regression**: Canvas rendering consistency

### Test Frameworks to Consider
- **Vitest**: Unit testing (Vite-native)
- **Vue Test Utils**: Component testing
- **Playwright**: E2E testing
- **Chromatic**: Visual regression

---

## Common Modifications

### Adding New Parameters
1. Add state in `Manipulator.vue`:
   ```typescript
   const newParam = ref(defaultValue)
   ```
2. Add control in `ManipulatorControls.vue`:
   ```vue
   <input type="range" :value="newParam" @input="emit('update:newParam', $event.target.value)" />
   ```
3. Add prop and emitter definitions
4. Update canvas rendering if needed

### Changing Animation Behavior
Modify `startMovement()` in `Manipulator.vue`:
```typescript
const animate = () => {
  // Change increment rates
  theta1.value += 2      // Faster
  theta2.value += -0.5   // Reverse direction
  
  // Add oscillation
  theta1.value = 45 * Math.sin(Date.now() / 1000)
  
  animationId = requestAnimationFrame(animate)
}
```

### Adding Canvas Elements
In `ManipulatorCanvas.vue` `drawManipulator()`:
```typescript
// Add after existing drawing code
c.strokeStyle = '#color'
c.lineWidth = 2
c.beginPath()
c.moveTo(x1, y1)
c.lineTo(x2, y2)
c.stroke()
```

### Changing Color Scheme
Update color values in component templates:
```vue
<!-- Find and replace hex colors -->
bg-[#1a1a1a]  →  bg-[#newcolor]
text-[#4ecdc4] →  text-[#newcolor]
```

---

## Performance Considerations

### Canvas Rendering
- **Reactive Redraw**: Only redraws when parameters change (via `watch`)
- **RequestAnimationFrame**: Smooth 60fps animation
- **Efficient Clearing**: `clearRect()` before each frame
- **Transform Reuse**: Save/restore context state

### Vue Reactivity
- **Computed Properties**: Cached until dependencies change
- **Minimal Watchers**: Only watch what's necessary
- **Ref vs Reactive**: Use `ref` for primitives (better performance)

### Bundle Size
- **Tree Shaking**: Vite removes unused code
- **CSS Purging**: Tailwind removes unused styles
- **Code Splitting**: Automatic for web build

---

## Security Considerations

### Electron Security
- **Context Isolation**: Enabled (preload script)
- **Node Integration**: Disabled in renderer
- **Context Bridge**: Safe API exposure
- **CSP**: Content Security Policy in HTML

### Web Security
- **No Backend**: Static files only
- **No Sensitive Data**: All calculations client-side
- **CSP Headers**: Set in HTML meta tag

---

## Debugging Tips

### Development Tools
```typescript
// Add to component for debugging
watch(() => [theta1.value, theta2.value], (values) => {
  console.log('Angles:', values)
})

// Canvas debugging
const drawDebugInfo = () => {
  ctx.fillStyle = 'white'
  ctx.fillText(`θ₁: ${theta1.value}°`, 10, 20)
}
```

### Common Issues
1. **Canvas not rendering**: Check ref initialization
2. **Animation not stopping**: Verify `cancelAnimationFrame` call
3. **Angles wrapping incorrectly**: Check modulo logic
4. **Props not updating**: Verify event emission names

---

## Extension Points

### Easy Additions
- ~~**Inverse Kinematics**: Calculate angles from desired position~~ ✅ Implemented
- ~~**Trajectory Tracking**: Visual path history~~ ✅ Implemented
- **Trajectory Planning**: Smooth path following with interpolation
- **Collision Detection**: Workspace obstacles
- **3D Visualization**: Three.js integration
- **Export Functionality**: Save configurations/animations
- **Preset Positions**: Quick configuration buttons
- **Joint Limits**: Constrain angles to realistic ranges
- **Velocity Control**: Speed limits for realistic motion

### Architecture Supports
- **Additional Links**: Extend to 3+ link manipulator
- **Different Joint Types**: Prismatic joints
- **Multiple Manipulators**: Side-by-side comparison
- **Physics Simulation**: Gravity, momentum

---

## API Reference

### Manipulator.vue

**State**:
```typescript
theta1: Ref<number>      // Joint 1 angle (-180 to 180)
theta2: Ref<number>      // Joint 2 angle (-180 to 180)
L1: Ref<number>          // Link 1 length (50 to 250)
L2: Ref<number>          // Link 2 length (50 to 250)
isMoving: Ref<boolean>   // Animation state
trajectory: Ref<Array<{x: number, y: number}>>  // Path history
showTrajectory: Ref<boolean>  // Trajectory visibility
targetX: Ref<number>     // IK target X (-300 to 300)
targetY: Ref<number>     // IK target Y (-300 to 300)
elbowUp: Ref<boolean>    // Elbow configuration
```

**Computed**:
```typescript
joint1: ComputedRef<{x: number, y: number}>
endEffector: ComputedRef<{x: number, y: number}>
isTargetReachable: ComputedRef<boolean>
```

**Methods**:
```typescript
updateTheta1(value: number): void
updateTheta2(value: number): void
updateL1(value: number): void
updateL2(value: number): void
updateTargetX(value: number): void
updateTargetY(value: number): void
startMovement(): void
stopMovement(): void
reset(): void
applyIK(): void
toggleElbow(): void
toggleTrajectory(): void
clearTrajectory(): void
```

### ManipulatorCanvas.vue

**Props**:
```typescript
interface Props {
  theta1: number
  theta2: number
  L1: number
  L2: number
  joint1: { x: number; y: number }
  endEffector: { x: number; y: number }
  trajectory: Array<{ x: number; y: number }>
  showTrajectory: boolean
  targetX: number
  targetY: number
}
```

**Methods**:
```typescript
resizeCanvas(): void
drawManipulator(): void
```

### ManipulatorControls.vue

**Props**:
```typescript
interface Props {
  theta1: number
  theta2: number
  L1: number
  L2: number
  endEffector: { x: number; y: number }
  isMoving: boolean
  targetX: number
  targetY: number
  elbowUp: boolean
  showTrajectory: boolean
  isTargetReachable: boolean
}
```

**Events**:
```typescript
'update:theta1': (value: number) => void
'update:theta2': (value: number) => void
'update:L1': (value: number) => void
'update:L2': (value: number) => void
'update:targetX': (value: number) => void
'update:targetY': (value: number) => void
'start': () => void
'stop': () => void
'reset': () => void
'applyIK': () => void
'toggleElbow': () => void
'toggleTrajectory': () => void
'clearTrajectory': () => void
```

---

## Environment Variables

### Current Usage
```bash
# .env file (optional)
GEMINI_API_KEY=...           # Not currently used
GEMINI_MODEL=...             # Not currently used
# Other Gemini settings...   # Legacy from template
```

**Note**: The `.env.example` contains Gemini API configuration, but the current application doesn't use it. This is likely leftover from a project template.

---

## Dependencies Explained

### Production Dependencies
```json
{
  "@electron-toolkit/preload": "Context bridge utilities",
  "@electron-toolkit/utils": "Electron helper functions",
  "@tailwindcss/vite": "Tailwind v4 Vite plugin",
  "image-size": "Image dimension detection (unused)"
}
```

### Development Dependencies
```json
{
  "electron": "Desktop app framework",
  "vue": "UI framework",
  "typescript": "Type safety",
  "vite": "Build tool",
  "electron-vite": "Electron + Vite integration",
  "electron-builder": "Desktop packaging",
  "@vitejs/plugin-vue": "Vue support for Vite",
  "tailwindcss": "CSS framework",
  "eslint": "Code linting",
  "prettier": "Code formatting",
  "vue-tsc": "Vue TypeScript checking"
}
```

---

## Quick Reference

### File Locations
- **Main logic**: `src/renderer/src/components/Manipulator.vue`
- **Rendering**: `src/renderer/src/components/ManipulatorCanvas.vue`
- **UI controls**: `src/renderer/src/components/ManipulatorControls.vue`
- **Electron entry**: `src/main/index.ts`
- **Vue entry**: `src/renderer/src/main.ts`

### Key Concepts
- **Forward Kinematics**: Position from angles
- **Workspace**: Reachable area (circle)
- **End Effector**: Tip of the arm
- **Joint**: Rotational connection point

### Common Commands
```bash
npm run dev          # Development
npm run build        # Production build
npm run lint         # Check code
npm run format       # Format code
npm run typecheck    # Type checking
```

---

## Version History

**v1.1.0** (Current)
- Added inverse kinematics solver
- Added trajectory tracking and visualization
- Added elbow configuration control (up/down)
- Added IK target position controls
- Enhanced canvas rendering with target markers
- Improved UI with new control sections

**v1.0.0**
- Initial release
- 2-link manipulator visualization
- Interactive controls
- Animation mode
- Desktop and web builds

---

## Future Considerations

### Potential Features
- Inverse kinematics solver
- Path planning visualization
- Multiple manipulator configurations
- 3D visualization option
- Export/import configurations
- Preset positions library
- Velocity/acceleration visualization
- Workspace analysis tools

### Technical Debt
- Add automated tests (unit tests for IK solver)
- Remove unused Gemini API configuration
- Add error boundaries
- Implement state persistence
- Add accessibility features (ARIA labels)
- Optimize canvas rendering for large displays
- Add input validation for IK targets
- Implement smooth interpolation for IK movements
- Add visual feedback for unreachable targets

---

**Document Version**: 1.1.0  
**Last Updated**: 2024  
**Maintained For**: LLM Context & Code Understanding

---

## Recent Changes Summary (v1.1.0)

### New Capabilities
1. **Inverse Kinematics**: Solve for joint angles given target position
2. **Trajectory Tracking**: Visual path history of end effector movement
3. **Elbow Configuration**: Control IK solution (up/down)
4. **Enhanced Visualization**: Target markers and trajectory paths

### Implementation Details
- **New File**: `src/renderer/src/utils/inverseKinematics.ts` (IK algorithms)
- **Algorithm**: Geometric method with law of cosines
- **Validation**: Reachability checking and solution verification
- **UI**: New control sections for IK targets and trajectory

### Key Additions to State
```typescript
trajectory: Ref<Array<{x: number, y: number}>>  // Path history
targetX, targetY: Ref<number>                    // IK target
elbowUp: Ref<boolean>                            // IK configuration
isTargetReachable: ComputedRef<boolean>          // Validation
```

### Testing
See `TESTING.md` for comprehensive testing guide including:
- IK solver validation
- Trajectory tracking verification
- Elbow configuration testing
- Edge case handling
