import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Connect } from 'vite';
import type { ServerOptions as ProxyOptions } from 'http-proxy';
import type { RequestHandler } from 'http-proxy-middleware';
import type { ServerOptions } from 'http-proxy';
import type { ClientRequest, IncomingHttpHeaders } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Custom middleware to handle forwarding requests to dynamic targets
const createCustomProxyMiddleware = () => {
  return (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    // Only apply to /api-proxy/* routes
    if (req.url?.startsWith('/api-proxy/')) {
      const targetHeader = req.headers['x-target-url'] as string;
      
      if (!targetHeader) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing X-Target-URL header' }));
        return;
      }
      
      try {
        // Parse URL to get proper protocol, hostname, port
        const targetUrl = new URL(targetHeader);
        const target = `${targetUrl.protocol}//${targetUrl.host}`;
        
        console.log(`Proxying request to: ${target}${req.url.replace(/^\/api-proxy/, '')}`);
        
        // Create a one-time proxy for this specific request
        const proxyOptions: ProxyOptions = {
          target,
          changeOrigin: true,
          autoRewrite: true,
          secure: false,
          proxyReq: function(proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) {
            // Update the Host header to match the target
            proxyReq.setHeader('host', targetUrl.host);
          },
          error: (err: Error, req: IncomingMessage, res: ServerResponse) => {
            console.error('Custom proxy error:', err);
            if (!res.writableEnded) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            }
          },
        };
        const proxy = createProxyMiddleware(proxyOptions);
        
        // Execute the proxy for this request only
        return proxy(req, res, next);
      } catch (error: any) {
        console.error('Error setting up proxy:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to set up proxy', message: error.message }));
        return;
      }
    }
    
    // For all other requests, proceed to the next middleware
    next();
  };
};

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
      // Add custom middleware for dynamic proxying
      middlewares: [
        createCustomProxyMiddleware(),
      ],
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
    css: {
      preprocessorOptions: {
        scss: {
          // Include support for scss from node_modules
          additionalData: '@import "./src/styles/mol-star-variables.scss";',
        },
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
