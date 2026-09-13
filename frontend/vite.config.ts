import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

function securityHeadersPlugin() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://supreme-risk-staging-api.onrender.com https://supreme-risk-staging.onrender.com https://app.supremerisk.com https://admin.supremerisk.com https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'supreme-security-headers',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        if (html.includes('Content-Security-Policy')) {
          return html;
        }
        return html.replace(
          '<meta name="viewport"',
          `<meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="viewport"`
        );
      },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: [
          '/*',
          `  Content-Security-Policy: ${csp}`,
          '  X-Content-Type-Options: nosniff',
          '  Referrer-Policy: strict-origin-when-cross-origin',
          '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
          '  X-Frame-Options: DENY',
          '',
          '/admin/*',
          '  X-Robots-Tag: noindex, nofollow',
          '',
          '/platform/*',
          '  X-Robots-Tag: noindex, nofollow',
          '',
          '/dashboard/*',
          '  X-Robots-Tag: noindex, nofollow',
          '',
        ].join('\n'),
      });
    },
  };
}

function robotsPolicyPlugin() {
  return {
    name: 'supreme-robots-policy',
    generateBundle() {
      const production = process.env.VITE_ENVIRONMENT === 'production';
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: production
          ? [
              'User-agent: *',
              'Allow: /',
              'Disallow: /admin',
              'Disallow: /platform',
              'Disallow: /dashboard',
              'Disallow: /login',
              'Disallow: /register',
              'Disallow: /forgot-password',
              'Disallow: /activate',
              'Disallow: /reset-password',
              'Disallow: /mfa',
              '',
            ].join('\n')
          : 'User-agent: *\nDisallow: /\n',
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    securityHeadersPlugin(),
    robotsPolicyPlugin(),
    // Bundle analyzer (only in build)
    process.env.ANALYZE ? visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }) : null,
  ].filter(Boolean),
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000', changeOrigin: true },
      '/health': { target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 1000, // Warn for chunks > 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/@mui')) {
            return 'mui-vendor';
          }
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor';
          }
        },
        // Optimize chunk names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets < 4kb
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@mui/material'],
  },
})
