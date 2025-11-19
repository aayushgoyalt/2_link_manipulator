# 2-Link Manipulator

A 2-link robotic manipulator visualization tool built with Electron and Vue 3. This educational application demonstrates forward kinematics with interactive controls and real-time visualization.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```


## Controls

- **θ₁, θ₂**: Joint angles (-180° to 180°)
- **L₁, L₂**: Link lengths (50px to 250px)
- **Start/Stop**: Animate the manipulator
- **Reset**: Restore default values

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
- **[Directory READMEs](src/)** - Detailed explanations of each directory

## Project Structure

```
2-link-manipulator/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   ├── preload/           # IPC bridge (security layer)
│   └── renderer/          # Vue 3 app (browser)
│       └── src/
│           └── components/
│               ├── Manipulator.vue        # State & logic
│               ├── ManipulatorCanvas.vue  # Visualization
│               └── ManipulatorControls.vue # UI controls
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
