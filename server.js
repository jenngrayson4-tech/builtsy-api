const https = require('https');
const http = require('http');

// ── IN-MEMORY CLAIMS STORE ──
// { inviteId: { itemName: claimedByName } }
var claimsStore = {};

function getClaims(inviteId) {
  return claimsStore[inviteId] || {};
}

function setClaim(inviteId, item, name) {
  if (!claimsStore[inviteId]) claimsStore[inviteId] = {};
  claimsStore[inviteId][item] = name;
}

function removeClaim(inviteId, item) {
  if (claimsStore[inviteId]) delete claimsStore[inviteId][item];
}

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

const INVITE_SYSTEM_PROMPT = `You are a world-class event designer and frontend developer who creates stunning, emotional, mobile-first invitation pages. Think luxury event design meets modern web — like Paperless Post meets Squarespace at their best.

YOUR CORE MISSION: Every invite must feel like opening a physical invitation. It should create excitement, emotion, and anticipation. It must be beautiful enough that guests screenshot it and share it.

DESIGN LAWS — NEVER BREAK THESE:
1. TWO FONTS MINIMUM — always pair a display font with a body font. Load from Google Fonts. Examples:
   - Party/fun: Pacifico (display) + Nunito (body)
   - Elegant: Cormorant Garamond (display) + Jost (body)  
   - Bold/modern: Bebas Neue (display) + DM Sans (body)
   - Romantic: Great Vibes (display) + Lato (body)
   - Retro: Abril Fatface (display) + Karla (body)
   NEVER use just one font. NEVER use default system fonts only.

2. ANIMATED BACKGROUND — every invite has a living, breathing background:
   - Use a canvas element OR CSS-animated particles
   - Must match the theme (bubbles for pool, confetti for birthday, petals for romance, stars for night)
   - Subtle but always present — makes the page feel alive
   - Build with var/function(){}/setInterval — no ES6

3. OVERSIZED HERO — the honoree name must be MASSIVE. 4rem minimum. The hero takes up the full first screen.

4. LAYOUT QUALITY — sections must have visual contrast. Alternate between colored backgrounds and light backgrounds. Never stack same-colored sections. Use cards, badges, and visual separators.

5. NO BUSINESS WEBSITE SECTIONS — NEVER include: pricing packages, testimonials, "What People Say", FAQ sections, navigation menus, service listings, package tiers, or any element that belongs on a business website. This is a PERSONAL EVENT INVITATION. It has a hero, event details, description, optional claim section, and RSVP. Nothing else.

6. NO EMOJI OVERLOAD — maximum 3 emojis on the entire page, hero section only. No emojis in section headings, body text, buttons, or bullet points. A well-designed invite does not need emoji decoration everywhere.

OUTPUT: Single self-contained HTML file. All CSS and JS inline. Start <!DOCTYPE html>. End </html>. No markdown. No truncation. All JS: var not const, function(){} not arrow, onclick= not addEventListener — Safari iOS compatible.`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-key');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // ── GET /projects/list ──
  if (req.method === 'GET' && req.url === '/projects/list') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projects: [] }));
    return;
  }

  // ── POST /projects/save ──
  if (req.method === 'POST' && req.url === '/projects/save') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  var claimsMatch = req.url.match(/^\/claims\/([^/?]+)$/);
  if (req.method === 'GET' && claimsMatch) {
    var inviteId = decodeURIComponent(claimsMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ claims: getClaims(inviteId) }));
    return;
  }

  // ── POST /claim ──
  if (req.method === 'POST' && req.url === '/claim') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var d = JSON.parse(body);
        if (!d.inviteId || !d.item || !d.name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'inviteId, item, and name are required' }));
          return;
        }
        setClaim(d.inviteId, d.item, d.name);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, claims: getClaims(d.inviteId) }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── DELETE /claim ── (unclaim)
  if (req.method === 'DELETE' && req.url === '/claim') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var d = JSON.parse(body);
        if (d.inviteId && d.item) removeClaim(d.inviteId, d.item);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, claims: getClaims(d.inviteId) }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method !== 'POST' || (req.url !== '/generate' && req.url !== '/grow' && req.url !== '/invite')) {
    res.writeHead(404); res.end('Not found'); return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { prompt } = JSON.parse(body);

      if (req.url === '/invite') {
        const inviteResult = await new Promise((resolve, reject) => {
          const payload = JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            system: INVITE_SYSTEM_PROMPT,
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
        const inviteData = JSON.parse(inviteResult.body);
        let html = inviteData.content && inviteData.content.find(b => b.type === 'text') ? inviteData.content.find(b => b.type === 'text').text : '';
        html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ html }));
        return;
      }

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
