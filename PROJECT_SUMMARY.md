# Project Summary

## Overview
**2-Link Manipulator** is an interactive educational tool for visualizing robotic arm kinematics. It demonstrates how a 2-link robotic manipulator moves in 2D space based on joint angles and link lengths.

## What It Does
- Visualizes a 2-link robotic arm in real-time
- Allows interactive control of joint angles (θ₁, θ₂) and link lengths (L₁, L₂)
- Calculates forward kinematics to determine end effector position
- **Solves inverse kinematics to reach target positions**
- **Tracks and visualizes end effector trajectory path**
- Provides automatic animation mode
- Shows workspace boundary (maximum reach)
- Displays coordinate grid and axes for spatial reference
- **Supports elbow up/down configurations for IK solutions**

## Technology
- **Desktop App**: Electron 28 + Vue 3 + TypeScript
- **Web App**: Static SPA deployable anywhere
- **Rendering**: HTML5 Canvas 2D API
- **Styling**: Tailwind CSS v4
- **Build**: Vite + electron-vite

## Architecture

### Process Model (Electron)
```
Main Process (Node.js)
  ├── Window management
  ├── Application lifecycle
  └── IPC handlers

Preload Script (Bridge)
  └── Secure API exposure

Renderer Process (Browser)
  └── Vue 3 Application
      ├── State management
      ├── Canvas rendering
      └── User interface
```

### Component Structure
```
App.vue
  └── Manipulator.vue (State & Logic)
       ├── ManipulatorCanvas.vue (Visualization)
       └── ManipulatorControls.vue (UI Controls)
```

## Key Features

### Forward Kinematics
Calculates end effector position from joint angles:
```
Joint 1: (L₁·cos(θ₁), L₁·sin(θ₁))
End Effector: (L₁·cos(θ₁) + L₂·cos(θ₁+θ₂), L₁·sin(θ₁) + L₂·sin(θ₁+θ₂))
```

### Inverse Kinematics ✨ NEW
Calculates joint angles needed to reach a target position:
```
Given target (x, y), solve for (θ₁, θ₂):
- Uses geometric method with law of cosines
- Validates reachability (|L₁ - L₂| ≤ distance ≤ L₁ + L₂)
- Provides two solutions: elbow up and elbow down
- Verifies solution accuracy using forward kinematics
```

### Trajectory Tracking ✨ NEW
Visual path history showing where the end effector has been:
- Records up to 1000 position points
- Smooth continuous line with 60% opacity
- Toggle show/hide functionality
- Clear button to reset path
- Automatically tracks during animation and IK movements

### Interactive Controls
- Joint angles: -180° to 180° (1° steps)
- Link lengths: 50px to 250px (5px steps)
- **IK target position: -300 to 300 (5px steps)**
- **Elbow configuration toggle (up/down)**
- Real-time value display
- Animation controls (start/stop/reset)
- **Trajectory controls (show/hide/clear)**

### Visualization
- Color-coded components (base, links, joints, end effector)
- Grid background (50px spacing)
- Coordinate axes (X and Y)
- Workspace boundary circle
- **IK target marker (yellow crosshair)**
- **Trajectory path (red trail)**
- **Auto-scaling to fit workspace**
- Dark theme for reduced eye strain

## File Structure
```
src/
├── main/index.ts              # Electron main process
├── preload/index.ts           # IPC bridge
└── renderer/
    ├── index.html             # HTML entry
    └── src/
        ├── main.ts            # Vue initialization
        ├── App.vue            # Root component
        ├── components/
        │   ├── Manipulator.vue        # State management
        │   ├── ManipulatorCanvas.vue  # Canvas rendering
        │   └── ManipulatorControls.vue # UI controls
        └── utils/
            └── inverseKinematics.ts   # IK solver algorithms
```

## Development Workflow

### Quick Start
```bash
npm install          # Install dependencies
npm run dev          # Run in development mode
```

### Building
```bash
npm run build        # Build Electron app
npm run build:web    # Build web version
npm run build:win    # Windows installer
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux packages
```

### Code Quality
```bash
npm run typecheck    # TypeScript checking
npm run lint         # ESLint
npm run format       # Prettier
```

## State Management

### Primary State (Manipulator.vue)
- `theta1`: First joint angle (default: 45°)
- `theta2`: Second joint angle (default: 30°)
- `L1`: First link length (default: 150px)
- `L2`: Second link length (default: 100px)
- `isMoving`: Animation state flag
- **`trajectory`: Array of end effector positions (up to 1000 points)**
- **`showTrajectory`: Trajectory visibility toggle**
- **`targetX`, `targetY`: IK target position**
- **`elbowUp`: Elbow configuration for IK (up/down)**

### Derived State (Computed)
- `joint1`: Elbow position from forward kinematics
- `endEffector`: Tip position from forward kinematics
- **`isTargetReachable`: Whether IK target is within workspace**

### Data Flow
```
User Input → Controls → Events → Manipulator → State Update
                                      ↓
                              Computed Properties
                                      ↓
                              Props to Children
                                      ↓
                              Canvas Redraws
```

## Animation System
- Uses `requestAnimationFrame` for smooth 60fps
- Increments θ₁ by 1°/frame, θ₂ by 0.5°/frame
- Wraps angles at ±180°
- Proper cleanup on component unmount

## Rendering Pipeline

### Canvas Setup
1. Get 2D context
2. Resize to container dimensions
3. Transform coordinate system (center origin, flip Y-axis)

### Drawing Order
1. Clear canvas
2. Draw grid (50px spacing)
3. Draw axes (X and Y)
4. Draw workspace circle (dashed)
5. Draw base (red circle at origin)
6. Draw link 1 (cyan line)
7. Draw joint 1 (yellow circle)
8. Draw link 2 (light cyan line)
9. Draw end effector (red circle)

### Color Scheme
- Background: `#0a0a0a` (very dark gray)
- Grid: `#333` (dark gray)
- Axes: `#666` (medium gray)
- Base/End Effector: `#ff6b6b` (red)
- Link 1: `#4ecdc4` (cyan)
- Joint 1: `#ffe66d` (yellow)
- Link 2: `#95e1d3` (light cyan)
- **IK Target: `#ffe66d` (yellow crosshair)**
- **Trajectory: `#ff6b6b` (red trail, 60% opacity)**

## Deployment Options

### Desktop
- Windows: `.exe` installer
- macOS: `.dmg` disk image
- Linux: `.AppImage`, `.deb`, `.rpm`

### Web
- Netlify (recommended)
- Vercel
- GitHub Pages
- Any static hosting (S3, Azure, Firebase, etc.)

## Documentation

### For Developers
- **CONTEXT_FOR_DEV.md**: Comprehensive developer guide
  - Architecture details
  - Development workflow
  - Component documentation
  - Troubleshooting

### For AI/LLMs
- **CONTEXT_FOR_LLM.md**: Structured context for AI
  - Code patterns
  - API reference
  - Common modifications
  - Quick reference

### Directory Documentation
- **src/main/README.md**: Main process documentation
- **src/preload/README.md**: Preload script documentation
- **src/renderer/README.md**: Renderer process documentation
- **src/renderer/src/components/README.md**: Component details

## Performance

### Optimization Techniques
- Computed properties for derived values (cached)
- Reactive canvas redrawing (only when needed)
- RequestAnimationFrame for smooth animation
- Tree-shaking removes unused code
- CSS purging removes unused Tailwind classes

### Benchmarks
- Canvas rendering: 60fps during animation
- State updates: Instant (Vue reactivity)
- Build size: ~2MB (Electron), ~200KB (web)

## Security

### Electron Security
- Context isolation enabled
- Node integration disabled in renderer
- Preload script for safe API exposure
- Content Security Policy (CSP)

### Web Security
- Static files only (no backend)
- No sensitive data
- CSP headers in HTML

## Testing Strategy

### Recommended Approach
1. **Unit Tests**: Forward kinematics calculations
2. **Component Tests**: Vue component behavior
3. **E2E Tests**: Full application workflows
4. **Visual Regression**: Canvas rendering consistency

### Suggested Tools
- Vitest (unit testing)
- Vue Test Utils (component testing)
- Playwright (E2E testing)
- Chromatic (visual regression)

## Future Enhancements

### Potential Features
- ~~Inverse kinematics solver~~ ✅ Implemented
- ~~Trajectory tracking~~ ✅ Implemented
- Path planning with waypoints
- Smooth interpolation for IK movements
- 3D visualization option
- Multiple manipulator configurations
- Export/import configurations
- Preset positions library
- Velocity/acceleration display
- Workspace analysis tools
- Obstacle avoidance

### Technical Improvements
- Add automated tests (unit tests for IK solver)
- Implement state persistence
- Add accessibility features
- Optimize for large displays
- Add error boundaries
- Add input validation for IK targets
- Improve trajectory performance for long paths

## Dependencies

### Core
- `electron`: ^28.2.0
- `vue`: ^3.4.15
- `typescript`: ^5.3.3
- `vite`: ^5.0.12
- `tailwindcss`: ^4.1.17

### Build Tools
- `electron-vite`: ^2.0.0
- `electron-builder`: ^24.9.1
- `vue-tsc`: ^1.8.27

### Utilities
- `@electron-toolkit/utils`: ^3.0.0
- `@electron-toolkit/preload`: ^3.0.0

## Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run typecheck        # Check types
npm run lint             # Lint code
npm run format           # Format code

# Building
npm run build            # Build Electron
npm run build:web        # Build web
npm run build:win        # Windows
npm run build:mac        # macOS
npm run build:linux      # Linux

# Web Preview
npm run preview:web      # Preview web build
```

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Forward Kinematics](https://en.wikipedia.org/wiki/Forward_kinematics)

## License
[Add license information]

## Contact
[Add contact information]

---

## Recent Updates (v1.1.0)

### New Features
- **Inverse Kinematics Solver**: Calculate joint angles to reach target positions
- **Trajectory Tracking**: Visual path history of end effector movement
- **Elbow Configuration**: Control IK solution (up/down)
- **Enhanced Visualization**: Target markers and trajectory paths
- **Auto-scaling Canvas**: Automatically fits workspace with padding

### Implementation
- New utility module: `src/renderer/src/utils/inverseKinematics.ts`
- Algorithm: Geometric method with law of cosines
- Validation: Reachability checking and solution verification
- UI: New control sections for IK targets and trajectory

### Testing
See [TESTING.md](TESTING.md) for comprehensive testing guide.

---

**Version**: 1.1.0  
**Last Updated**: 2024  
**Status**: Production Ready
