#!/bin/bash
# Install dependencies
npm install
npm install @vitejs/plugin-react

# Run vite build for the client
npx vite build

# Run esbuild for the server with the corrected output path
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server