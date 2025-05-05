#!/bin/bash
# Install dependencies
npm install
npm install @vitejs/plugin-react

# Ensure the database schema is up to date
echo "Running database migrations..."
npx drizzle-kit push:pg

# Use Render-specific Vite config
cp vite.config.render.ts vite.config.ts

# Run vite build for the client
echo "Building client..."
npx vite build

# Run esbuild for the server with the corrected output path
echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server

# Create a startup script that ensures we use the correct path
echo "Creating startup script..."
echo "#!/bin/sh
NODE_ENV=production node \$PWD/dist/server/index.js" > start.sh
chmod +x start.sh

echo "Build completed successfully!"