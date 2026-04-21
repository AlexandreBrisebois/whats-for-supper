const http = require('http');

const PORT = process.env.MOCK_API_PORT || 5001;

// In-memory state for family members
let familyMembers = [
  { id: '1', name: 'Alex' },
  { id: '2', name: 'Jordan' },
];

// In-memory state for recipes (keyed by family member id)
let recipes = {};

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

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
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
  } else if (path === '/api/discovery/categories' && req.method === 'GET') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: ['Gourmet Discovery', 'Coastal Kitchen', 'Organic Vitality'],
      })
    );
  } else if (path === '/api/discovery' && req.method === 'GET') {
    const category = url.searchParams.get('category');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: [
          {
            id: 'mock-1',
            name: `Mock ${category} 1`,
            description: 'Delicious mock recipe 1',
            imageUrl: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856',
            totalTime: '20 Min',
            difficulty: 'Easy',
            category: category,
          },
          {
            id: 'mock-2',
            name: `Mock ${category} 2`,
            description: 'Delicious mock recipe 2',
            imageUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927',
            totalTime: '25 Min',
            difficulty: 'Medium',
            category: category,
          },
        ],
      })
    );
  } else if (
    path.startsWith('/api/discovery/') &&
    path.endsWith('/vote') &&
    req.method === 'POST'
  ) {
    res.writeHead(200);
    res.end(JSON.stringify({ data: { success: true } }));
  } else if (path === '/api/recipes' && req.method === 'GET') {
    const memberId = req.headers['x-family-member-id'];
    const memberRecipes = memberId && recipes[memberId] ? recipes[memberId] : [];
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: {
          recipes: memberRecipes,
          pagination: {
            page: 1,
            limit: 20,
            total: memberRecipes.length,
          },
        },
      })
    );
  } else if (path === '/api/recipes' && req.method === 'POST') {
    const memberId = req.headers['x-family-member-id'];
    let bodySize = 0;
    req.on('data', (chunk) => {
      bodySize += chunk.length;
    });
    req.on('end', () => {
      console.log(`[Mock API] Recipe POST received from member ${memberId} (${bodySize} bytes)`);

      // Initialize recipes array for this member if needed
      if (!recipes[memberId]) {
        recipes[memberId] = [];
      }

      // Store a recipe record (mock data, since we can't parse multipart)
      const recipeId = `rec-${Date.now()}`;
      const recipe = {
        id: recipeId,
        createdAt: new Date().toISOString(),
      };
      recipes[memberId].push(recipe);

      res.writeHead(201);
      res.end(
        JSON.stringify({
          data: {
            recipeId: recipeId,
            message: 'Success',
          },
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
