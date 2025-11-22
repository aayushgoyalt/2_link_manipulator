# 2-Link Manipulator - Developer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Development Workflow](#development-workflow)
7. [Key Concepts](#key-concepts)
8. [Component Details](#component-details)
9. [Build & Deployment](#build--deployment)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is This?
A **2-link robotic manipulator visualization tool** that demonstrates forward kinematics in robotics. Users can interactively control joint angles and link lengths to see how a robotic arm moves in 2D space.

### Purpose
- **Educational**: Learn robotic kinematics concepts visually
- **Interactive**: Real-time manipulation of robot parameters
- **Cross-platform**: Runs as desktop app (Electron) or web app

### Key Features
- Real-time 2D visualization with HTML5 Canvas
- Interactive sliders for joint angles (θ₁, θ₂) and link lengths (L₁, L₂)
- **Inverse Kinematics (IK)**: Calculate joint angles to reach target positions
- **Trajectory Tracking**: Visual path history of end effector movement
- Automatic animation mode
- Visual workspace boundary showing maximum reach
- Coordinate grid and axes for spatial reference
- Dark theme UI with color-coded components
- Elbow configuration control (up/down) for IK solutions

---

## Architecture

### Application Type
**Hybrid Desktop/Web Application**
- **Desktop**: Electron app (Windows, macOS, Linux)
- **Web**: Static SPA deployable to any hosting service

### Process Architecture (Electron)

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │ Main Process │◄───────►│   Preload    │            │
│  │  (Node.js)   │   IPC   │   Script     │            │
│  └──────────────┘         └──────┬───────┘            │
│        │                          │                     │
│        │ Creates Window           │ Context Bridge      │
│        ▼                          ▼                     │
│  ┌─────────────────────────────────────────┐          │
│  │      Renderer Process (Browser)         │          │
│  │  ┌─────────────────────────────────┐   │          │
│  │  │         Vue 3 App               │   │          │
│  │  │  ┌──────────────────────────┐  │   │          │
│  │  │  │   Manipulator Component  │  │   │          │
│  │  │  │  ┌────────┐  ┌─────────┐ │  │   │          │
│  │  │  │  │ Canvas │  │Controls │ │  │   │          │
│  │  │  │  └────────┘  └─────────┘ │  │   │          │
│  │  │  └──────────────────────────┘  │   │          │
│  │  └─────────────────────────────────┘   │          │
│  └─────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy (Vue)

```
App.vue (Root)
  └── Manipulator.vue (State Management)
       ├── ManipulatorCanvas.vue (Visualization)
       └── ManipulatorControls.vue (UI Controls)
```

---

## Technology Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Electron** | 28.2.0 | Desktop application framework |
| **Vue 3** | 3.4.15 | Reactive UI framework (Composition API) |
| **TypeScript** | 5.3.3 | Type-safe JavaScript |
| **Vite** | 5.0.12 | Build tool and dev server |
| **Tailwind CSS** | 4.1.17 | Utility-first CSS framework |

### Build Tools
- **electron-vite**: Unified build system for Electron + Vite
- **electron-builder**: Package and distribute desktop apps
- **vue-tsc**: TypeScript type checking for Vue
- **ESLint**: Code linting
- **Prettier**: Code formatting

### Key Libraries
- `@electron-toolkit/utils`: Electron utilities
- `@electron-toolkit/preload`: Secure IPC bridge
- `@vitejs/plugin-vue`: Vue 3 support for Vite

---

## Project Structure

```
2-link-manipulator/
│
├── src/                          # Source code
│   ├── main/                     # Electron main process
│   │   └── index.ts              # App lifecycle, window management
│   │
│   ├── preload/                  # Preload scripts (IPC bridge)
│   │   ├── index.ts              # Context bridge setup
│   │   └── index.d.ts            # TypeScript definitions
│   │
│   └── renderer/                 # Renderer process (UI)
│       ├── index.html            # HTML entry point
│       ├── vite.config.ts        # Renderer build config
│       └── src/
│           ├── main.ts           # Vue app initialization
│           ├── App.vue           # Root component
│           ├── style.css         # Global styles (Tailwind)
│           └── components/
│               ├── Manipulator.vue        # Main logic & state
│               ├── ManipulatorCanvas.vue  # Canvas rendering
│               └── ManipulatorControls.vue # UI controls
│
├── resources/                    # Application resources
│   └── icon.png                  # App icon
│
├── dist-web/                     # Web build output (generated)
├── out/                          # Electron build output (generated)
│
├── electron.vite.config.ts       # Electron build configuration
├── vite.config.web.mjs           # Web build configuration
├── electron-builder.yml          # Desktop packaging config
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config (root)
├── tsconfig.node.json            # TypeScript config (Node.js)
├── tsconfig.web.json             # TypeScript config (Web)
├── tailwind.config.cjs           # Tailwind CSS config
├── postcss.config.cjs            # PostCSS config
│
├── .env.example                  # Environment variables template
├── README.md                     # Quick start guide
├── SETUP.md                      # Setup instructions
├── DEPLOY.md                     # Deployment guide
├── FEATURES.md                   # Feature documentation
├── TESTING.md                    # Testing guide for IK and features
├── CONTEXT_FOR_DEV.md            # This file (developer documentation)
└── CONTEXT_FOR_LLM.md            # LLM context document
```

### Directory Explanations

#### `/src/main/`
**Electron Main Process** - Runs in Node.js environment
- Creates and manages application windows
- Handles system-level operations (file system, OS integration)
- Manages application lifecycle (startup, quit)
- Sets up IPC communication channels

#### `/src/preload/`
**Security Bridge** - Runs before renderer loads
- Exposes safe APIs from main process to renderer
- Uses `contextBridge` for secure communication
- Prevents direct Node.js access from renderer (security)

#### `/src/renderer/`
**UI Layer** - Runs in browser environment
- Vue 3 application with Composition API
- HTML5 Canvas for visualization
- Reactive state management
- No direct Node.js access (sandboxed)

#### `/resources/`
**Static Assets**
- Application icon (used for desktop app)
- Other static resources

---

## Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Git**: For version control

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd 2-link-manipulator

# Install dependencies
npm install
```

### Development

```bash
# Run in development mode (Electron)
npm run dev

# Run web version in development
npm run build:web
npm run preview:web
```

### First Run
1. The app will open in a window (1400x900)
2. You'll see a 2-link manipulator in the center
3. Use the right panel to adjust parameters
4. Click "Start Movement" to see automatic animation

---

## Development Workflow

### Daily Development

```bash
# Start development server with hot reload
npm run dev
```

This starts:
- Electron main process with hot reload
- Vite dev server for renderer
- TypeScript compilation
- Automatic window refresh on changes

### Code Quality

```bash
# Type checking
npm run typecheck          # Check all
npm run typecheck:node     # Check main/preload
npm run typecheck:web      # Check renderer

# Linting
npm run lint               # Auto-fix issues

# Formatting
npm run format             # Format all files
```

### Building

```bash
# Build for Electron (all platforms)
npm run build

# Build for web deployment
npm run build:web

# Build platform-specific desktop apps
npm run build:win          # Windows
npm run build:mac          # macOS
npm run build:linux        # Linux
```

### Testing Changes

1. **Development**: Use `npm run dev` for instant feedback
2. **Production Build**: Test with `npm run build` then `npm start`
3. **Web Version**: Test with `npm run build:web` then `npm run preview:web`

---

## Key Concepts

### 1. Robotic Manipulator Basics

#### What is a 2-Link Manipulator?
A robotic arm with two rigid links connected by rotational joints:
- **Base**: Fixed point at origin (0, 0)
- **Link 1**: First arm segment (length L₁)
- **Joint 1**: Elbow joint (angle θ₁)
- **Link 2**: Second arm segment (length L₂)
- **Joint 2**: Wrist joint (angle θ₂)
- **End Effector**: Tip of the arm (the "hand")

#### Forward Kinematics
Calculate end effector position from joint angles:

```typescript
// Convert degrees to radians
const t1 = (theta1 * Math.PI) / 180
const t2 = (theta2 * Math.PI) / 180

// Joint 1 position (elbow)
const joint1 = {
  x: L1 * Math.cos(t1),
  y: L1 * Math.sin(t1)
}

// End effector position (tip)
const endEffector = {
  x: L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2),
  y: L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2)
}
```

#### Inverse Kinematics
Calculate joint angles needed to reach a target position:

```typescript
// Uses geometric method with law of cosines
// θ₂ = ±acos((x² + y² - L₁² - L₂²) / (2·L₁·L₂))
// θ₁ = atan2(y, x) - atan2(L₂·sin(θ₂), L₁ + L₂·cos(θ₂))

const solution = solveIK(targetX, targetY, L1, L2, elbowUp)
// Returns: { theta1, theta2, isValid, elbow }
```

**Key Features**:
- Two solutions exist for most positions (elbow up/down)
- Target must be within workspace to be reachable
- Solution verified using forward kinematics

#### Workspace
The **workspace** is the set of all reachable positions:
- **Maximum reach**: L₁ + L₂ (fully extended)
- **Minimum reach**: |L₁ - L₂| (fully folded)
- **Shape**: Annular region (ring) or full circle

### 2. Vue 3 Composition API

This project uses Vue 3's Composition API with `<script setup>`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

// Reactive state
const angle = ref(45)

// Computed properties (auto-update)
const radians = computed(() => angle.value * Math.PI / 180)

// Methods
const reset = () => { angle.value = 0 }
</script>
```

**Key Features**:
- `ref()`: Create reactive primitive values
- `computed()`: Derived values that auto-update
- `watch()`: React to state changes
- Lifecycle hooks: `onMounted()`, `onUnmounted()`

### 3. Canvas Rendering

The visualization uses HTML5 Canvas 2D API:

```typescript
// Get context
const ctx = canvas.getContext('2d')

// Transform coordinate system
ctx.translate(width/2, height/2)  // Center origin
ctx.scale(1, -1)                  // Flip Y-axis

// Draw shapes
ctx.beginPath()
ctx.arc(x, y, radius, 0, Math.PI * 2)
ctx.fill()
```

**Coordinate System**:
- Origin at canvas center
- Y-axis points upward (mathematical convention)
- Units in pixels

### 4. Electron IPC (Inter-Process Communication)

Communication between main and renderer processes:

```typescript
// Main process (src/main/index.ts)
ipcMain.on('channel-name', (event, data) => {
  // Handle message
})

// Preload script (src/preload/index.ts)
contextBridge.exposeInMainWorld('api', {
  sendMessage: (data) => ipcRenderer.send('channel-name', data)
})

// Renderer process (Vue component)
window.api.sendMessage({ foo: 'bar' })
```

**Note**: This project doesn't currently use IPC, but the infrastructure is in place.

---

## Component Details

### Manipulator.vue
**Role**: State management and business logic

**State**:
- `theta1`, `theta2`: Joint angles (-180° to 180°)
- `L1`, `L2`: Link lengths (50px to 250px)
- `isMoving`: Animation state flag
- `animationId`: RequestAnimationFrame ID
- `trajectory`: Array of end effector positions for path tracking
- `showTrajectory`: Toggle trajectory visibility
- `targetX`, `targetY`: IK target position
- `elbowUp`: Elbow configuration for IK (up/down)

**Computed Properties**:
- `joint1`: Elbow position from forward kinematics
- `endEffector`: Tip position from forward kinematics
- `isTargetReachable`: Whether IK target is within workspace

**Methods**:
- `updateTheta1/2`, `updateL1/2`: Parameter setters
- `updateTargetX/Y`: IK target position setters
- `startMovement()`: Begin automatic animation
- `stopMovement()`: Stop animation
- `reset()`: Restore default values
- `applyIK()`: Solve and apply inverse kinematics
- `toggleElbow()`: Switch between elbow up/down configurations
- `toggleTrajectory()`: Show/hide trajectory path
- `clearTrajectory()`: Clear trajectory history

**Animation Logic**:
```typescript
const animate = () => {
  theta1.value += 1      // Increment θ₁ by 1°/frame
  theta2.value += 0.5    // Increment θ₂ by 0.5°/frame
  
  // Wrap angles to [-180, 180]
  if (theta1.value > 180) theta1.value = -180
  if (theta2.value > 180) theta2.value = -180
  
  animationId = requestAnimationFrame(animate)
}
```

### ManipulatorCanvas.vue
**Role**: Visualization and rendering

**Rendering Pipeline**:
1. Clear canvas
2. Set up coordinate system (center, flip Y, auto-scale)
3. Draw grid (50px spacing, fills entire canvas)
4. Draw axes (X and Y, full canvas width/height)
5. Draw base (red circle)
6. Draw link 1 (cyan line)
7. Draw joint 1 (yellow circle)
8. Draw link 2 (light cyan line)
9. Draw end effector (red circle)
10. Draw workspace circle (dashed, maximum reach)
11. Draw trajectory path (red trail, if enabled)
12. Draw IK target marker (yellow crosshair)

**Responsive Behavior**:
- Canvas resizes with window
- Auto-scales to fit workspace with padding
- Maximum scale limited to 70% for large screens
- Redraws on parameter changes
- Grid and axes extend to fill entire canvas

**Color Scheme**:
- Background: `#0a0a0a` (very dark gray)
- Grid: `#333` (dark gray)
- Axes: `#666` (medium gray)
- Base/End Effector: `#ff6b6b` (red)
- Link 1: `#4ecdc4` (cyan)
- Joint 1: `#ffe66d` (yellow)
- Link 2: `#95e1d3` (light cyan)
- Workspace: `#444` (dashed gray)
- Trajectory: `#ff6b6b` (red trail, 60% opacity)
- IK Target: `#ffe66d` (yellow crosshair)

### inverseKinematics.ts
**Role**: Mathematical algorithms for IK solving

**Exported Functions**:

1. **solveIK()**
   - Calculates joint angles to reach target position
   - Uses geometric method with law of cosines
   - Returns solution with validity flag
   - Supports both elbow configurations

2. **isReachable()**
   - Checks if target is within workspace
   - Returns boolean for reachability

3. **verifyIKSolution()**
   - Validates IK solution using forward kinematics
   - Returns actual end effector position
   - Used for debugging and error checking

**Algorithm Details**:
```typescript
// Law of cosines for θ₂
cos(θ₂) = (L₁² + L₂² - d²) / (2·L₁·L₂)

// Geometric method for θ₁
θ₁ = atan2(y, x) - atan2(L₂·sin(θ₂), L₁ + L₂·cos(θ₂))
```

### ManipulatorControls.vue
**Role**: User interface and input handling

**Control Sections**:

1. **Joint Angles**
   - θ₁ slider: -180° to 180°, step 1°
   - θ₂ slider: -180° to 180°, step 1°
   - Real-time value display

2. **Link Lengths**
   - L₁ slider: 50px to 250px, step 5px
   - L₂ slider: 50px to 250px, step 5px
   - Real-time value display

3. **End Effector Position**
   - Read-only X, Y coordinates
   - 2 decimal places precision
   - Highlighted display box

4. **Animation Controls**
   - Start/Stop button (toggles based on state)
   - Reset button (always available)

5. **Inverse Kinematics**
   - Target X slider: -300 to 300, step 5
   - Target Y slider: -300 to 300, step 5
   - Elbow Up/Down toggle button
   - Apply IK button (yellow when reachable, red when unreachable)

6. **Trajectory Controls**
   - Show/Hide toggle button
   - Clear button to reset trajectory path

**Event Emission**:
```typescript
// Slider changes
emit('update:theta1', newValue)
emit('update:targetX', newValue)

// Button clicks
emit('start')
emit('stop')
emit('reset')
emit('applyIK')
emit('toggleElbow')
emit('toggleTrajectory')
emit('clearTrajectory')
```

---

## Build & Deployment

### Desktop Application

#### Build for All Platforms
```bash
npm run build
```

#### Platform-Specific Builds
```bash
# Windows (.exe installer)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage, .deb)
npm run build:linux
```

**Output**: `out/` directory contains installers

#### Configuration
Edit `electron-builder.yml` to customize:
- App name and ID
- Icons
- File associations
- Auto-update settings
- Code signing

### Web Application

#### Build
```bash
npm run build:web
```

**Output**: `dist-web/` directory (static files)

#### Deployment Options

**1. Netlify** (Recommended)
```bash
# Option A: CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist-web

# Option B: GitHub integration
# Push to GitHub, connect repo in Netlify dashboard
# Settings auto-detected from netlify.toml
```

**2. Vercel**
```bash
npm install -g vercel
vercel --prod
```

**3. GitHub Pages**
```bash
npx gh-pages -d dist-web
```

**4. Any Static Host**
- Upload `dist-web/` contents to any web server
- No server-side processing required
- Works with: AWS S3, Azure Static Web Apps, Firebase Hosting, etc.

#### Local Preview
```bash
npm run preview:web
# Opens http://localhost:4173
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors
**Cause**: Missing dependencies
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScript errors
**Cause**: Type mismatches or outdated types
**Solution**:
```bash
npm run typecheck
# Fix reported errors
```

#### 3. Build fails
**Cause**: Various (check error message)
**Solutions**:
```bash
# Clean build artifacts
rm -rf out dist-web

# Rebuild
npm run build
```

#### 4. Electron window doesn't open
**Cause**: Main process crash
**Solution**:
- Check console for errors
- Verify `src/main/index.ts` syntax
- Try: `npm run dev` to see detailed errors

#### 5. Canvas not rendering
**Cause**: Context not initialized or resize issue
**Solution**:
- Check browser console for errors
- Verify canvas ref is not null
- Try resizing window to trigger redraw

#### 6. Hot reload not working
**Cause**: Vite dev server issue
**Solution**:
```bash
# Restart dev server
# Kill process (Ctrl+C)
npm run dev
```

### Development Tips

1. **Use TypeScript**: Catch errors before runtime
2. **Check Console**: Browser DevTools (F12) shows errors
3. **Use Vue DevTools**: Install browser extension for debugging
4. **Test Both Modes**: Desktop and web may behave differently
5. **Clean Builds**: When in doubt, delete `out/` and `dist-web/`

### Performance Optimization

1. **Canvas Rendering**:
   - Only redraw when necessary (use `watch`)
   - Avoid drawing in animation loop if not needed
   - Use `requestAnimationFrame` for smooth animation

2. **Vue Reactivity**:
   - Use `computed` for derived values
   - Avoid unnecessary watchers
   - Debounce rapid updates if needed

3. **Build Size**:
   - Tree-shaking automatically removes unused code
   - Tailwind purges unused CSS
   - Vite optimizes bundle size

---

## Additional Resources

### Project Documentation
- [FEATURES.md](./FEATURES.md) - Feature list and descriptions
- [TESTING.md](./TESTING.md) - Testing guide for IK and trajectory features
- [SETUP.md](./SETUP.md) - Setup instructions
- [DEPLOY.md](./DEPLOY.md) - Deployment guide

### External Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [Vue 3 Docs](https://vuejs.org/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

### Robotics
- [Forward Kinematics](https://en.wikipedia.org/wiki/Forward_kinematics)
- [Inverse Kinematics](https://en.wikipedia.org/wiki/Inverse_kinematics)
- [Robotic Manipulator](https://en.wikipedia.org/wiki/Robotic_arm)

### Tools
- [Vue DevTools](https://devtools.vuejs.org/)
- [Electron DevTools](https://www.electronjs.org/docs/latest/tutorial/devtools-extension)

---

## Contributing

### Code Style
- Use TypeScript for type safety
- Follow ESLint rules (`npm run lint`)
- Format with Prettier (`npm run format`)
- Add comments for complex logic
- Use meaningful variable names

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add: your feature description"

# Push and create PR
git push origin feature/your-feature
```

### Commit Message Format
- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Modify existing feature
- `Refactor:` Code restructuring
- `Docs:` Documentation changes
- `Style:` Formatting changes

---

## License

[Add your license information here]

---

## Contact

[Add contact information or links here]

---

**Last Updated**: 2024
**Version**: 1.1.0

---

## Recent Changes (v1.1.0)

### New Features
1. **Inverse Kinematics Solver** (`src/renderer/src/utils/inverseKinematics.ts`)
   - Geometric method with law of cosines
   - Elbow up/down configuration support
   - Reachability validation
   - Solution verification using forward kinematics

2. **Trajectory Tracking**
   - Visual path history (up to 1000 points)
   - Show/hide toggle
   - Clear functionality
   - Red trail with 60% opacity

3. **Enhanced Canvas Rendering**
   - Auto-scaling to fit workspace
   - IK target marker (yellow crosshair)
   - Trajectory path visualization
   - Full-canvas grid and axes

4. **New UI Controls**
   - IK target position sliders (X, Y: -300 to 300)
   - Elbow configuration toggle button
   - Apply IK button with reachability indicator
   - Trajectory show/hide and clear buttons

### Modified Files
- `src/renderer/src/components/Manipulator.vue` - Added IK state and methods
- `src/renderer/src/components/ManipulatorCanvas.vue` - Added trajectory and target rendering
- `src/renderer/src/components/ManipulatorControls.vue` - Added IK and trajectory controls
- `src/renderer/src/utils/inverseKinematics.ts` - New file with IK algorithms

### New Documentation
- `FEATURES.md` - Feature overview
- `TESTING.md` - Comprehensive testing guide for IK and trajectory features
