import { defineConfig } from 'vite';

// `base` must match the GitHub Pages project path so asset URLs resolve when
// deployed to https://tairea.github.io/sovereignty-hub-ui/. Local dev stays
// at root so http://localhost:5173/ keeps working without the prefix.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/sovereignty-hub-ui/' : '/',
  server: {
    port: 5173,
    strictPort: true,    // fail loudly instead of silently picking 5174 — keeps Supabase magic-link redirects pointed at one origin
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}));
