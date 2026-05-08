const https = require('https');
const http = require('http');

const SYSTEM_PROMPT = `You are a world-class frontend web designer and developer — think Stripe, Linear, or Loom landing pages. You build sites that feel premium, intentional, and conversion-focused. Never use generic templates or default browser styles.

DESIGN PRINCIPLES:
- Every site should feel custom-designed, not generated
- Use the exact colors and fonts specified — apply them with sophistication
- Strong visual hierarchy: oversized headings, generous whitespace, clear CTAs
- Hero sections should be bold and immersive — full-width, strong typography, compelling subheading
- Sections should alternate visual weight to create rhythm
- Buttons should be large, confident, and styled to the palette
- Never use default blue links or gray borders

INTERACTIVE PRICING CALCULATOR — build it like this:
- Clickable CARDS for each option (not dropdowns) — each card shows name, description, price
- Selected card gets a highlighted border in the primary color
- A prominent "Your Total" display that updates live as they click
- Add-ons as toggleable cards
- The total should be large and prominent
- Mobile-friendly grid layout

REQUIRED SECTIONS — include ALL of these:
1. Navigation (sticky, logo left, links right, mobile hamburger)
2. Hero (full-width, bold headline, subheading, 2 CTAs, photo placeholder)
3. About / credentials section
4. Services / pricing section with interactive calculator
5. Testimonials (3 placeholder reviews)
6. FAQ accordion (5 questions)
7. Contact / intake form
8. Footer with links

PHOTO PLACEHOLDERS:
- Style them beautifully using gradient backgrounds from the palette
- Center camera emoji and descriptive text
- Make them look intentional

OUTPUT: Single self-contained index.html with all CSS and JS inline. MUST BE COMPLETE — include all 8 sections. Do not truncate under any circumstances. Start with <!DOCTYPE html>, end with </html>. Raw HTML only. IMPORTANT: All JavaScript must be fully compatible with Safari on iOS — no optional chaining (?.), no nullish coalescing (??), no modern ES6+ features that Safari does not support. Use var instead of const/let where possible.`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method !== 'POST' || (req.url !== '/generate' && req.url !== '/grow')) { res.writeHead(404); res.end('Not found'); return; }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { prompt } = JSON.parse(body);

      if (req.url === '/grow') {
        const result = await new Promise((resolve, reject) => {
          const payload = JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
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
        const text = data.content && data.content.find(b => b.type === 'text') ? data.content.find(b => b.type === 'text').text : '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text }));
        return;
      }

      const result = await new Promise((resolve, reject) => {
        const payload = JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
          system: SYSTEM_PROMPT,
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
      let html = data.content && data.content.find(b => b.type === 'text') ? data.content.find(b => b.type === 'text').text : '';
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
