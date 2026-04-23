const http = require('http');

const PORT = process.env.MOCK_API_PORT || 5001;

// In-memory state for family members
let familyMembers = [
  { id: '1', name: 'Alex' },
  { id: '2', name: 'Jordan' },
];

// In-memory state for recipes (keyed by family member id)
let recipes = {};

// In-memory state for schedule
let scheduleState = {
  // weekOffset -> Array of 7 days
  // 0 is current week
  0: [
    {
      day: 'Mon',
      date: '2026-04-20',
      recipe: {
        id: 'lasagna',
        name: 'Homemade Lasagna',
        image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
      },
    },
    { day: 'Tue', date: '2026-04-21', recipe: null },
    {
      day: 'Wed',
      date: '2026-04-22',
      recipe: {
        id: '1',
        name: 'Zesty Lemon Chicken',
        image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435',
      },
    },
    { day: 'Thu', date: '2026-04-23', recipe: null },
    { day: 'Fri', date: '2026-04-24', recipe: null },
    { day: 'Sat', date: '2026-04-25', recipe: null },
    { day: 'Sun', date: '2026-04-26', recipe: null },
  ],
  1: Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    date: `2026-04-${27 + i}`,
    recipe: null,
  })),
};

let lockStatus = {
  0: false,
  1: false,
};

let votes = [
  { id: 'v1', recipeId: 'lasagna', count: 3 },
  { id: 'v2', recipeId: '1', count: 1 },
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

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  console.log(`[Mock API] ${req.method} ${url.pathname}${url.search}`);

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
    const category = url.searchParams.get('category') || 'General';
    const response = {
      data: [
        {
          id: 'mock-1',
          name: `Mock ${category} 1`,
          description: `Delicious mock recipe from ${category}`,
          imageUrl: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856',
          totalTime: '20 Min',
          difficulty: 'Easy',
          category: category,
          hasFamilyInterest: false,
        },
        {
          id: 'mock-2',
          name: `Mock ${category} 2`,
          description: `Another great mock recipe from ${category}`,
          imageUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927',
          totalTime: '25 Min',
          difficulty: 'Medium',
          category: category,
          hasFamilyInterest: true,
        },
      ],
    };
    console.log('[Mock API] /api/discovery response:', JSON.stringify(response.data[0]));
    res.writeHead(200);
    res.end(JSON.stringify(response));
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
  } else if (path === '/api/recipes/recommendations' && req.method === 'GET') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: {
          topPick: {
            id: 'lasagna',
            name: 'Homemade Lasagna',
            description:
              'The ultimate comfort food, layered with rich meat sauce and creamy béchamel.',
            imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
            prepTime: '45 mins',
            difficulty: 'Medium',
          },
          results: [
            {
              id: '1',
              name: 'Zesty Lemon Chicken',
              time: '30m',
              image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435',
            },
            {
              id: '2',
              name: 'Creamy Pesto Pasta',
              time: '15m',
              image: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856',
            },
          ],
        },
      })
    );
  } else if (path.startsWith('/api/recipes/') && path.endsWith('/hero')) {
    // Return a transparent 1x1 pixel image or a placeholder
    res.setHeader('Content-Type', 'image/png');
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    res.writeHead(200);
    res.end(pixel);
  } else if (path === '/api/schedule' && req.method === 'GET') {
    const weekOffset = parseInt(url.searchParams.get('weekOffset') || '0');
    const schedule = scheduleState[weekOffset] || [];
    const locked = lockStatus[weekOffset] || false;
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: {
          weekOffset: weekOffset,
          locked: locked,
          days: schedule,
        },
      })
    );
  } else if (path === '/api/schedule/lock' && req.method === 'POST') {
    const weekOffset = parseInt(url.searchParams.get('weekOffset') || '0');
    lockStatus[weekOffset] = true;
    // Mock purging votes
    votes = [];
    console.log(`[Mock API] Schedule locked for week ${weekOffset}. Votes purged.`);
    res.writeHead(200);
    res.end(
      JSON.stringify({ data: { success: true, message: 'Schedule locked and votes purged' } })
    );
  } else if (path === '/api/schedule/move' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const { weekOffset, fromIndex, toIndex } = JSON.parse(body || '{}');
      const offset = parseInt(weekOffset || '0');
      if (scheduleState[offset]) {
        const week = scheduleState[offset];
        const temp = week[fromIndex].recipe;
        week[fromIndex].recipe = week[toIndex].recipe;
        week[toIndex].recipe = temp;
        console.log(
          `[Mock API] Swapped recipe from index ${fromIndex} to ${toIndex} for week ${offset}`
        );
      }
      res.writeHead(200);
      res.end(JSON.stringify({ data: { success: true } }));
    });
  } else if (path === '/api/schedule/assign' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const { weekOffset, dayIndex, recipeId, recipeName, recipeImage } = JSON.parse(body || '{}');
      const offset = parseInt(weekOffset || '0');

      if (scheduleState[offset]) {
        scheduleState[offset][dayIndex].recipe = {
          id: recipeId,
          name: recipeName,
          image: recipeImage,
        };
        console.log(`[Mock API] Assigned recipe ${recipeId} to day ${dayIndex} for week ${offset}`);
      }

      res.writeHead(200);
      res.end(JSON.stringify({ data: { success: true } }));
    });
  } else if (path === '/api/schedule/fill-the-gap' && req.method === 'GET') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: [
          {
            id: 'g1',
            name: 'Taco Tuesday Special',
            image: 'https://images.unsplash.com/photo-1565299585062-3f836613ff23',
          },
          {
            id: 'g2',
            name: 'Mediterranean Salad',
            image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe',
          },
          {
            id: 'g3',
            name: 'Mushroom Risotto',
            image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371',
          },
          {
            id: 'g4',
            name: 'Steak & Frites',
            image: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c',
          },
          {
            id: 'g5',
            name: 'Vegetable Stir-fry',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
          },
        ],
      })
    );
  } else if (path.match(/^\/api\/schedule\/\d+\/smart-defaults$/) && req.method === 'GET') {
    const weekOffset = parseInt(path.split('/')[3]);
    const response = {
      data: {
        weekOffset: weekOffset,
        familySize: 2,
        consensusThreshold: 2,
        preSelectedRecipes: [
          {
            recipeId: '1',
            name: 'Zesty Lemon Chicken',
            heroImageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435',
            voteCount: 2,
            familySize: 2,
            unanimousVote: true,
            dayIndex: 1,
            isLocked: false,
          },
          {
            recipeId: 'g1',
            name: 'Taco Tuesday Special',
            heroImageUrl: 'https://images.unsplash.com/photo-1565299585062-3f836613ff23',
            voteCount: 1,
            familySize: 2,
            unanimousVote: false,
            dayIndex: 4,
            isLocked: false,
          },
        ],
        openSlots: [{ dayIndex: 2 }, { dayIndex: 5 }, { dayIndex: 6 }],
        consensusRecipesCount: 2,
      },
    };
    res.writeHead(200);
    res.end(JSON.stringify(response));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Not Found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock API running on http://localhost:${PORT}`);
});
