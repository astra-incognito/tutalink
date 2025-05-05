#!/bin/bash
# Install dependencies
npm install
npm install @vitejs/plugin-react

# Use Render-specific Vite config
cp vite.config.render.ts vite.config.ts

# Run vite build for the client
npx vite build

# Run esbuild for the server with the corrected output path
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server

# Create a startup script that ensures we use the correct path
echo "#!/bin/sh
NODE_ENV=production node \$PWD/dist/server/index.js" > start.sh
chmod +x start.sh