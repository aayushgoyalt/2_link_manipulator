# 2-Link Manipulator

A 2-link robotic manipulator visualization tool built with Electron and Vue 3.

## Quick Start

```bash
npm install
npm run dev
```

## Build

### Desktop App (Electron)
```bash
npm run build
```

### Web App
```bash
npm run build:web
```

Output will be in `dist-web/` folder ready for deployment.

## Deploy

See [DEPLOY.md](DEPLOY.md) for deployment instructions to Netlify, Vercel, or GitHub Pages.

## Controls

- **θ₁, θ₂**: Joint angles
- **L₁, L₂**: Link lengths
- **Start/Stop**: Animate the manipulator
- **Reset**: Restore defaults
