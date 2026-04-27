const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { prompt } = JSON.parse(event.body);

    const result = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: 'You are an expert frontend web developer. Output ONLY a single complete HTML file with all CSS and JS embedded inline. Use the exact colors and fonts specified. Start with <!DOCTYPE html> and end with </html>. No markdown, no code fences, no explanations. The file must be complete — do not truncate.',
        messages: [{ role: 'user', content: prompt }]
      });

      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const data = JSON.parse(result.body);
    let html = data.content?.find(b => b.type === 'text')?.text || '';
    html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
