# Cambridge Pseudocode Runner

A browser-based runner for students learning Cambridge pseudocode.

The long-term goal is to support Cambridge IGCSE 0478 and Cambridge AS/A Level 9618 pseudocode directly in the browser. This first version is a Phase 0 prototype: it only provides the React UI layout and deployment setup. The interpreter engine is not implemented yet.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

## Build

Create a production build:

```bash
npm run build
```

The built files will be written to `dist`.

## GitHub Pages Deployment

This project is configured for a GitHub repository named `cambridge-pseudocode-runner`.

Vite uses this base path:

```ts
base: '/cambridge-pseudocode-runner/'
```

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs on pushes to `main`, builds the app, and deploys the `dist` folder to GitHub Pages.

In the GitHub repository settings, set Pages to use GitHub Actions as the deployment source.

## Current Status

Phase 0 UI only. The Run button displays a placeholder message and does not interpret pseudocode yet.
