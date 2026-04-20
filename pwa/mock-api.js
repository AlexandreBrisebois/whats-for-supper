const http = require('http');

const PORT = 5001;

// In-memory state for family members
let familyMembers = [
  { id: '1', name: 'Alex' },
  { id: '2', name: 'Jordan' },
];

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

  // Route matches (handling optional trailing slashes)
  const path = url.pathname.replace(/\/$/, '');

  if (path === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'Healthy' }));
  } else if (path === '/api/family' && req.method === 'GET') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: familyMembers,
      })
    );
  } else if (path === '/api/family' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      console.log('[Mock API] Family POST payload:', payload);
      const newMember = {
        id: (familyMembers.length + 1).toString(),
        name: payload.name || 'E2E-New',
      };
      familyMembers.push(newMember);

      res.writeHead(201);
      res.end(
        JSON.stringify({
          data: newMember,
        })
      );
    });
  } else if (path === '/api/recipes' && req.method === 'GET') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: [],
        total: 0,
      })
    );
  } else if (path === '/api/recipes' && req.method === 'POST') {
    req.on('data', () => {}); // Consume stream
    req.on('end', () => {
      res.writeHead(201);
      res.end(
        JSON.stringify({
          recipeId: 'rec-1',
          message: 'Success',
        })
      );
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Not Found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock API running on http://localhost:${PORT}`);
});
