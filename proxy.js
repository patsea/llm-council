#!/usr/bin/env node

/**
 * Simple reverse proxy for llm-council.local
 * Forwards http://llm-council.local:8080 -> http://localhost:5173
 *
 * Usage: node proxy.js
 * For port 80: PROXY_PORT=80 sudo node proxy.js
 */

const http = require('http');
const httpProxy = require('http-proxy');

const PORT = process.env.PROXY_PORT || 8080;
const TARGET = 'http://localhost:5173';

// Create a proxy server
const proxy = httpProxy.createProxyServer({
  target: TARGET,
  ws: true, // WebSocket support for Vite HMR
  changeOrigin: true,
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway: Unable to reach Vite dev server on port 5173');
  }
});

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  proxy.web(req, res);
});

// Handle WebSocket upgrade for Vite HMR
server.on('upgrade', (req, socket, head) => {
  console.log('WebSocket upgrade request');
  proxy.ws(req, socket, head);
});

// Start server
server.listen(PORT, () => {
  console.log(`✓ Reverse proxy running on http://llm-council.local:${PORT}/`);
  console.log(`  Forwarding to ${TARGET}`);
  console.log(`\nPress Ctrl+C to stop`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down proxy...');
  server.close(() => {
    console.log('Proxy stopped');
    process.exit(0);
  });
});
