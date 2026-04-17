const http = require('http');

const PORT = 5001;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-family-member-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`[Mock API] ${req.method} ${url.pathname}`);

  res.setHeader('Content-Type', 'application/json');

  // Route matches
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'Healthy' }));
  } 
  else if (url.pathname === '/api/family' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      data: [
        { id: '1', name: 'Alex' },
        { id: '2', name: 'Jordan' }
      ]
    }));
  }
  else if (url.pathname === '/api/family' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      res.writeHead(201);
      res.end(JSON.stringify({
        data: { id: '3', name: payload.name || 'E2E-New' }
      }));
    });
  }
  else if (url.pathname === '/api/recipes' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      data: [],
      total: 0
    }));
  }
  else if (url.pathname === '/api/recipes' && req.method === 'POST') {
    res.writeHead(201);
    res.end(JSON.stringify({
      recipeId: 'rec-1',
      message: 'Success'
    }));
  }
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Not Found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock API running on http://localhost:${PORT}`);
});
