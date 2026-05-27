# Cambridge Pseudocode Runner

A browser-based runner for students learning Cambridge pseudocode.

The long-term goal is to support Cambridge IGCSE 0478 and Cambridge AS/A Level 9618 pseudocode directly in the browser.

The current Phase 2 prototype supports a small interpreter for declarations, assignments, input, output, simple expressions, integer `DIV` and `MOD`, comparisons, and boolean logic.

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

Phase 2 frontend prototype. Supported syntax is intentionally small; IF statements, loops, arrays, functions, procedures, files, and OOP are not implemented yet.
