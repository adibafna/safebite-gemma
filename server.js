const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.MODEL || 'gemma2:2b';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function queryGemma(prompt, systemPrompt = '') {
  const url = `${OLLAMA_HOST}/api/generate`;
  const body = {
    model: MODEL,
    prompt: prompt,
    system: systemPrompt,
    stream: false,
    options: {
      temperature: 0.2, // low temperature for high precision & safety
      num_predict: 800
    }
  };

  const startTime = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ollama error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const durationMs = Date.now() - startTime;
  return {
    response: data.response,
    model: MODEL,
    durationMs,
    evalCount: data.eval_count || 0,
    evalDuration: data.eval_duration ? Math.round(data.eval_duration / 1e6) : 0
  };
}

async function checkOllamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!res.ok) return { online: false, error: 'Ollama not responding' };
    const data = await res.json();
    const hasGemma = data.models && data.models.some(m => m.name.includes('gemma2:2b') || m.name.includes('gemma'));
    return { online: true, models: data.models || [], hasGemma, activeModel: MODEL };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Helper for JSON response
  const sendJson = (statusCode, obj) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(obj));
  };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API: Status
  if (pathname === '/api/status' && req.method === 'GET') {
    const status = await checkOllamaStatus();
    return sendJson(200, status);
  }

  // API: Scan Ingredients for Allergens
  if (pathname === '/api/scan-ingredients' && req.method === 'POST') {
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const { roommateName, allergies, severity, ingredients } = JSON.parse(bodyText);
        if (!ingredients) return sendJson(400, { error: 'Ingredients list is required' });

        const systemPrompt = `You are SafeBite, an ultra-strict, medically aware culinary safety assistant powered by open-source Gemma 2.
Your mission is to protect ${roommateName || 'the user\'s roommate'} who has severe dietary restrictions.
Known Allergies / Intolerances: ${allergies || 'None specified'}
Severity Level: ${severity || 'High / Anaphylactic'}

Your instructions:
1. Examine the provided ingredient list with zero compromises.
2. Detect visible allergens AND hidden derivative allergens (e.g. casein/whey for milk, gluten/malt/spelt for celiac, arachis oil for peanut, lecithin if soy-derived, hidden MSG/nuts).
3. Check for cross-contamination warnings (e.g., "may contain", "processed in a facility that also processes").
4. Output your analysis clearly with:
   - **SAFETY VERDICT**: State [SAFE] or [CAUTION] or [UNSAFE / DANGER] at the very beginning.
   - **FLAGGED INGREDIENTS**: List any trigger ingredients and why they are dangerous.
   - **HIDDEN RISKS**: Any derivative or cross-contamination concerns.
   - **ACTIONABLE VERDICT FOR ROOMMATE**: A direct 1-sentence bottom-line advice for ${roommateName || 'your friend'}.`;

        const userPrompt = `Please rigorously inspect this ingredient list for ${roommateName || 'my roommate'}:
${ingredients}`;

        const result = await queryGemma(userPrompt, systemPrompt);
        return sendJson(200, result);
      } catch (err) {
        return sendJson(500, { error: err.message });
      }
    });
    return;
  }

  // API: Generate Safe Recipe from Pantry
  if (pathname === '/api/generate-recipe' && req.method === 'POST') {
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      try {
        const { roommateName, allergies, pantryItems, cuisinePreference } = JSON.parse(bodyText);
        if (!pantryItems) return sendJson(400, { error: 'Pantry items are required' });

        const systemPrompt = `You are SafeBite, a creative yet meticulously careful private chef assistant powered by open-source Gemma 2.
You are designing a meal to share with ${roommateName || 'a friend'}, who must strictly avoid: ${allergies || 'None specified'}.
Preferred Cuisine/Style: ${cuisinePreference || 'Any tasty home-cooked comfort meal'}.

Requirements:
1. Use the available pantry ingredients.
2. Absolutely ZERO ingredients that could trigger ${allergies || 'the specified restrictions'}.
3. Format as:
   - **Recipe Name**: Creative and appetizing name.
   - **Estimated Time & Servings**
   - **Allergen-Safe Guarantee**: Explicit check confirming absence of ${allergies}.
   - **Ingredients Required** (with measurements)
   - **Step-by-Step Instructions**
   - **Cross-Contamination Kitchen Safety Tip** (e.g., separate cutting boards, sponge safety, pan washing).`;

        const userPrompt = `Available ingredients in our pantry/fridge:
${pantryItems}

Create an amazing safe recipe for us to cook and enjoy together!`;

        const result = await queryGemma(userPrompt, systemPrompt);
        return sendJson(200, result);
      } catch (err) {
        return sendJson(500, { error: err.message });
      }
    });
    return;
  }

  // Serve static files from /public
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` SafeBite (Gemma 2 Open AI) is running!`);
  console.log(` Web App URL:    http://localhost:${PORT}`);
  console.log(` Ollama Backend: ${OLLAMA_HOST} (${MODEL})`);
  console.log(` 100% Local Inference & Offline Safe`);
  console.log(`====================================================`);
});
