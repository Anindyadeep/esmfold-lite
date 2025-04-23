import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get the backend URL from environment or use default
  const backendUrl = env.DEFAULT_BACKEND_URL || 'https://litefold-production.up.railway.app';
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Proxy API requests to avoid CORS issues during development
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: false, // Accept self-signed certificates in development
          configure: (proxy, _options) => {
            // Basic error handling to prevent crashes
            proxy.on('error', (err, _req, _res) => {
              console.error('Proxy error:', err);
            });
            
            // Only log in development mode with debug enabled
            if (mode === 'development' && process.env.DEBUG) {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                console.log('Proxy Request:', req.method, req.url);
              });
              proxy.on('proxyRes', (proxyRes, req, _res) => {
                console.log('Proxy Response:', proxyRes.statusCode, req.url);
              });
            }
          },
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Ensure we only build what's needed
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-components': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-select',
            ],
          },
        },
      },
    },
    // Make environment variables available to client code
    define: {
      'import.meta.env.DEFAULT_BACKEND_URL': JSON.stringify(backendUrl)
    }
  };
});
