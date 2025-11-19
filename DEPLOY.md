# Deployment Guide

## Deploy to Netlify

### Option 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build:web

# Deploy
netlify deploy --prod --dir=dist-web
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Netlify will auto-detect the `netlify.toml` configuration
6. Click "Deploy site"

The build settings are already configured in `netlify.toml`:
- Build command: `npm run build:web`
- Publish directory: `dist-web`

### Option 3: Drag and Drop

1. Build locally: `npm run build:web`
2. Go to [netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist-web` folder to the upload area

## Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## Deploy to GitHub Pages

```bash
# Build
npm run build:web

# Deploy
npx gh-pages -d dist-web
```

## Local Preview

Test the web build locally:

```bash
npm run preview:web
```

Then open http://localhost:4173
