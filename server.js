const https = require('https');
const http = require('http');

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/generate') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { prompt } = JSON.parse(body);
      const result = await new Promise((resolve, reject) => {
        const payload = JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: 'You are an expert frontend web developer. Output ONLY a single complete HTML file with all CSS and JS embedded inline. Use the exact colors and fonts specified. Start with <!DOCTYPE html> and end with </html>. No markdown, no code fences, no explanations. The file must be complete — do not truncate.',
          messages: [{ role: 'user', content: prompt }]
        });
        const apiReq = https.request({
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (apiRes) => {
          let data = '';
          apiRes.on('data', chunk => data += chunk);
          apiRes.on('end', () => resolve({ status: apiRes.statusCode, body: data }));
        });
        apiReq.on('error', reject);
        apiReq.write(payload);
        apiReq.end();
      });

      const data = JSON.parse(result.body);
      let html = data.content?.find(b => b.type === 'text')?.text || '';
      html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ html }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Builtsy API running on port ' + PORT));
