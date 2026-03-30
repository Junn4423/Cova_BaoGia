// Local development server for Vercel Serverless Functions
// Run with: node api-server.js

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3001;

// Dynamic import for the analyze function
const analyzeHandler = await import('./api/analyze.js');

const server = http.createServer(async (req, res) => {
  // Parse URL
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Gemini-Api-Key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route to analyze endpoint
  if (pathname === '/api/analyze' && req.method === 'POST') {
    try {
      // Read body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      // Parse JSON
      const parsedBody = JSON.parse(body);

      // Create mock req/res for handler
      const mockReq = {
        method: 'POST',
        body: parsedBody,
        headers: {
          'x-gemini-api-key': req.headers['x-gemini-api-key'],
        },
      };

      const mockRes = {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(name, value) {
          this.headers[name] = value;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = JSON.stringify(data);
          return this;
        },
        end() {},
      };

      await analyzeHandler.default(mockReq, mockRes);

      res.writeHead(mockRes.statusCode, {
        'Content-Type': 'application/json',
        ...mockRes.headers,
      });
      res.end(mockRes.body);
    } catch (error) {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'SERVER_ERROR', message: error.message }));
    }
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`API Development Server running at http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   - POST /api/analyze`);
});
