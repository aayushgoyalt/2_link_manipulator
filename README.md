# 2-Link Manipulator

A 2-link robotic manipulator visualization tool built with Electron and Vue 3. This educational application demonstrates forward and inverse kinematics with interactive controls, trajectory tracking, and real-time visualization.

## Deployment URL
https://2-link.netlify.app/

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```


## Features

- **Forward Kinematics**: Real-time calculation of end effector position
- **Inverse Kinematics**: Calculate joint angles to reach target positions
- **Trajectory Tracking**: Visual path history of end effector movement
- **Interactive Controls**: Sliders for all parameters
- **Animation Mode**: Automatic continuous movement
- **Elbow Configuration**: Choose between elbow up/down solutions

## Controls

- **θ₁, θ₂**: Joint angles (-180° to 180°)
- **L₁, L₂**: Link lengths (50px to 250px)
- **Target X, Y**: IK target position (-300 to 300)
- **Elbow Up/Down**: Toggle IK configuration
- **Apply IK**: Move to target position
- **Start/Stop**: Animate the manipulator
- **Reset**: Restore default values
- **Trajectory**: Show/hide and clear path history

## Build

### Desktop App (Electron)
```bash
npm run build              # Build for current platform
npm run build:win          # Windows installer
npm run build:mac          # macOS .dmg
npm run build:linux        # Linux packages
```

### Web App
```bash
npm run build:web          # Build static files
npm run preview:web        # Preview locally
```

Output will be in `dist-web/` folder ready for deployment.

## Documentation

- **[SETUP.md](SETUP.md)** - Initial setup instructions
- **[DEPLOY.md](DEPLOY.md)** - Deployment to Netlify, Vercel, GitHub Pages
- **[TESTING.md](TESTING.md)** - Testing guide for IK and trajectory features
- **[FEATURES.md](FEATURES.md)** - Complete feature documentation
- **[Directory READMEs](src/)** - Detailed explanations of each directory

## Project Structure

```
2-link-manipulator/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   ├── preload/           # IPC bridge (security layer)
│   └── renderer/          # Vue 3 app (browser)
│       └── src/
│           ├── components/
│           │   ├── Manipulator.vue        # State & logic
│           │   ├── ManipulatorCanvas.vue  # Visualization
│           │   └── ManipulatorControls.vue # UI controls
│           └── utils/
│               └── inverseKinematics.ts   # IK solver
├── resources/             # App icons and assets
├── CONTEXT_FOR_DEV.md     # Developer documentation
├── CONTEXT_FOR_LLM.md     # AI/LLM context
└── package.json           # Dependencies & scripts
```

## Technology Stack

- **Electron 28** - Desktop application framework
- **Vue 3** - Reactive UI framework (Composition API)
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first styling
- **HTML5 Canvas** - 2D graphics rendering

## Development

```bash
# Development with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting and formatting
npm run lint
npm run format
```

## Deploy

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions to:
- Netlify (recommended for web)
- Vercel
- GitHub Pages
- Any static hosting service


---

**Built with ❤️ using Electron + Vue 3 + TypeScript**
