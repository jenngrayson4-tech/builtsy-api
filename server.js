const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const sharp = require('sharp');

// Preload Builtsy logo as base64 for OG card
var BUILTSY_LOGO_B64 = '';
try {
  BUILTSY_LOGO_B64 = fs.readFileSync(path.join(__dirname, 'builtsy-footer-logo.png')).toString('base64');
} catch(e) { console.warn('builtsy-footer-logo.png not found'); }

// Load template HTML once at startup
var SOCIAL_TEMPLATE = '';
try {
  SOCIAL_TEMPLATE = fs.readFileSync(path.join(__dirname, 'social-media-manager-site.html'), 'utf8');
} catch(e) {
  console.warn('social-media-manager-site.html not found:', e.message);
}

var AGENCY_TEMPLATE = '';
try {
  AGENCY_TEMPLATE = fs.readFileSync(path.join(__dirname, 'creative-agency-site.html'), 'utf8');
} catch(e) {
  console.warn('creative-agency-site.html not found:', e.message);
}

var CHERRY_SM_TEMPLATE = '';
try {
  CHERRY_SM_TEMPLATE = fs.readFileSync(path.join(__dirname, 'social-media-cherry.html'), 'utf8');
} catch(e) {
  console.warn('social-media-cherry.html not found:', e.message);
}

var BUBBLY_SM_TEMPLATE = '';
try {
  BUBBLY_SM_TEMPLATE = fs.readFileSync(path.join(__dirname, 'social-media-bubbly.html'), 'utf8');
} catch(e) {
  console.warn('social-media-bubbly.html not found:', e.message);
}

var CARETAKER_WARM_TEMPLATE = '';
try {
  CARETAKER_WARM_TEMPLATE = fs.readFileSync(path.join(__dirname, 'caretaker-warm.html'), 'utf8');
} catch(e) {
  console.warn('caretaker-warm.html not found:', e.message);
}

var CARETAKER_BRIGHT_TEMPLATE = '';
try {
  CARETAKER_BRIGHT_TEMPLATE = fs.readFileSync(path.join(__dirname, 'caretaker-bright.html'), 'utf8');
} catch(e) {
  console.warn('caretaker-bright.html not found:', e.message);
}

var CARETAKER_CLEAN_TEMPLATE = '';
try {
  CARETAKER_CLEAN_TEMPLATE = fs.readFileSync(path.join(__dirname, 'caretaker-clean.html'), 'utf8');
} catch(e) {
  console.warn('caretaker-clean.html not found:', e.message);
}

const https = require('https');

const app = express();
app.use(cors({ origin: ['https://builtsy.ai', 'http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '12mb' }));

// Serve static HTML files from the same directory
app.use(express.static(__dirname));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8192;        // non-streaming limit for this model
const MAX_TOKENS_STREAM = 32000; // streaming supports higher output

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
var _rateCounts = {};
setInterval(function() { _rateCounts = {}; }, 60 * 1000); // reset every minute
function rateLimit(req, res, next) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  _rateCounts[ip] = (_rateCounts[ip] || 0) + 1;
  if (_rateCounts[ip] > 30) {
    return res.status(429).json({ error: 'Too many requests — slow down.' });
  }
  next();
}

// ── Supabase auth middleware ───────────────────────────────────────────────────
var SUPABASE_URL  = 'nukcbqlxxrfsgchqyxud.supabase.co';
var SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_UDXeGe2ngBJsj_lwYkRF1A_igvEU6nX';

function requireAuth(req, res, next) {
  var auth = req.headers['authorization'] || '';
  var token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  var options = {
    hostname: SUPABASE_URL,
    path: '/auth/v1/user',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON }
  };
  var supaReq = https.request(options, function(supaRes) {
    if (supaRes.statusCode !== 200) return res.status(401).json({ error: 'Not authenticated' });
    req._authed = true;
    next();
  });
  supaReq.on('error', function() { res.status(401).json({ error: 'Auth check failed' }); });
  supaReq.end();
}

// Health check
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'blueprint-master.html'));
});

// ── Detect Industry — AI-powered Step 1 analysis ──────────────────────────────
app.post('/detect-industry', requireAuth, rateLimit, async function(req, res) {
  try {
    var description = req.body.description || req.body.prompt || '';
    if (!description) return res.status(400).json({ error: 'No description' });

    var prompt = 'You are configuring a website builder for this business: "' + description + '".\n'
      + 'Return ONLY valid JSON (no markdown, no explanation) with this exact structure:\n'
      + '{\n'
      + '  "industry": "short-slug e.g. art-teacher or fitness-trainer or photographer",\n'
      + '  "industryLabel": "Friendly label e.g. Art Teacher",\n'
      + '  "recommendedTemplates": ["up to 3 from: caretaker-warm, caretaker-bright, caretaker-clean, social-media-bubbly, social-media-cherry, social-media-manager-site"],\n'
      + '  "taglineChips": ["6 short punchy taglines specific to their exact business"],\n'
      + '  "headlineChips": ["6 hero headline options, varied tone, specific to their business"],\n'
      + '  "heroSubChips": ["4 hero subheading options (2 sentences each) — who they help and what they offer, specific to this business"],\n'
      + '  "credentialChips": ["6 relevant credentials or trust signals for their field"],\n'
      + '  "valuePropChips": ["4 short value propositions specific to their business"],\n'
      + '  "incomeCalcType": "per_session or per_client or hourly",\n'
      + '  "incomeCalcLabel": "per session or per client or per hour",\n'
      + '  "suggestedTools": ["subset of: calendly, faq, sms, forms, testimonials"],\n'
      + '  "serviceSuggestions": [\n'
      + '    {"name": "Service 1 name", "desc": "1-2 sentence description", "tags": ["Tag1","Tag2","Tag3"]},\n'
      + '    {"name": "Service 2 name", "desc": "1-2 sentence description", "tags": ["Tag1","Tag2","Tag3"]},\n'
      + '    {"name": "Service 3 name", "desc": "1-2 sentence description", "tags": ["Tag1","Tag2","Tag3"]},\n'
      + '    {"name": "Service 4 name", "desc": "1-2 sentence description", "tags": ["Tag1","Tag2","Tag3"]}\n'
      + '  ]\n'
      + '}';

    var message = await client.messages.create({
      model: MODEL,
      max_tokens: 1400,
      messages: [{ role: 'user', content: prompt }]
    });

    var raw = message.content[0].text.replace(/```json|```/g, '').trim();
    var match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON in response');
    var config = JSON.parse(match[0]);

    res.json(config);
  } catch(err) {
    console.error('detect-industry error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Main site generation endpoint
app.post('/generate', requireAuth, rateLimit, async function(req, res) {
  try {
    var prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    var maxTok = req.body.max_tokens ? Math.min(parseInt(req.body.max_tokens), MAX_TOKENS) : MAX_TOKENS;
    var message = await client.messages.create({
      model: MODEL,
      max_tokens: maxTok,
      messages: [{ role: 'user', content: prompt }]
    });

    var html = message.content[0].text;
    res.json({ html: html });

  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// ── OG Share Card image ───────────────────────────────────────────────────────
function xmlEnc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function wrapTitle(text, max) {
  if (text.length <= max) return [text];
  var words = text.split(' '), line = '', lines = [];
  for (var i = 0; i < words.length; i++) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (test.length <= max) { line = test; }
    else { if (line) lines.push(line); line = words[i]; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text.slice(0, max)];
}

app.get('/og-image', async function(req, res) {
  try {
    var honoree = xmlEnc(String(req.query.honoree || 'You').slice(0, 30));
    var event   = xmlEnc(String(req.query.title   || '').slice(0, 40));
    var date    = xmlEnc(String(req.query.date    || '').slice(0, 40));
    var sub     = [event, date].filter(Boolean).join('  ·  ');

    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">',
      '  <rect width="1200" height="630" fill="#0a0a0a"/>',
      '  <rect x="0" y="0" width="10" height="630" fill="#ee70bc"/>',
      '  <rect x="0" y="0" width="1200" height="6" fill="#ee70bc" opacity="0.5"/>',
      '  <text x="600" y="175" text-anchor="middle" font-family="Liberation Sans,sans-serif" font-size="22" letter-spacing="8" fill="#ffffff" opacity="0.4">M A D E  W I T H</text>',
      '  <text x="600" y="295" text-anchor="middle" font-family="Liberation Sans,sans-serif" font-size="110" font-weight="bold" fill="#ffffff">builtsy<tspan fill="#ee70bc">.</tspan></text>',
      '  <rect x="480" y="320" width="240" height="3" fill="#ee70bc" opacity="0.5"/>',
      '  <text x="600" y="395" text-anchor="middle" font-family="Liberation Sans,sans-serif" font-size="34" fill="#ffffff" opacity="0.65">with love for</text>',
      '  <text x="600" y="490" text-anchor="middle" font-family="Liberation Sans,sans-serif" font-size="80" font-weight="bold" fill="#ee70bc">' + honoree + '</text>',
      sub ? '  <text x="600" y="575" text-anchor="middle" font-family="Liberation Sans,sans-serif" font-size="24" fill="#ffffff" opacity="0.3">' + sub + '</text>' : '',
      '</svg>'
    ].join('\n');

    var png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(png);
  } catch (err) {
    console.error('OG image error:', err.message);
    res.status(500).send('Image generation failed');
  }
});

// Event invite generation endpoint
var INVITE_SYSTEM = 'You are an expert event invite designer. Generate a complete, beautiful, self-contained single-file HTML event invite page. The HTML must be fully inline — all CSS in <style> tags, all JS in <script> tags, no external dependencies except Google Fonts. Make it stunning, mobile-first, and ready to publish. Output ONLY the raw HTML — no markdown, no code fences, no explanation.';

app.post('/invite', requireAuth, rateLimit, async function(req, res) {
  try {
    var prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    // SSE keeps the connection alive through Railway's proxy timeout
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    var keepalive = setInterval(function() { res.write(': ping\n\n'); }, 5000);

    try {
      // Use Anthropic streaming so long responses don't hit SDK timeout
      var stream = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS_STREAM,
        stream: true,
        system: INVITE_SYSTEM,
        messages: [{ role: 'user', content: prompt }]
      });
      var html = '';
      for await (var event of stream) {
        if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta') {
          html += event.delta.text;
        }
      }
      clearInterval(keepalive);
      res.write('data: ' + JSON.stringify({ html: html }) + '\n\n');
      res.end();
    } catch (err) {
      clearInterval(keepalive);
      console.error('Invite error:', err.message);
      res.write('data: ' + JSON.stringify({ error: err.message || 'Generation failed' }) + '\n\n');
      res.end();
    }

  } catch (err) {
    console.error('Invite setup error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// Grow / revise endpoint
app.post('/grow', requireAuth, rateLimit, async function(req, res) {
  try {
    var prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    var message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    });

    var html = message.content[0].text;
    res.json({ html: html });

  } catch (err) {
    console.error('Grow error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// Template fill — takes social-media-manager-site.html and swaps content with user's real info
app.post('/generate-template', requireAuth, rateLimit, async function(req, res) {
  try {
    var fields = req.body.fields || {};
    if (!SOCIAL_TEMPLATE) return res.status(500).json({ error: 'Template not loaded on server' });

    var fieldText = Object.keys(fields).map(function(k) {
      return k + ': ' + fields[k];
    }).join('\n');

    var prompt = 'You are filling in a pre-designed HTML template with a user\'s real business content.\n\n'
      + 'CRITICAL RULES — read carefully:\n'
      + '- Do NOT change any CSS, layout, classes, IDs, or structural HTML whatsoever\n'
      + '- Do NOT change fonts, spacing, animations, colors, or any visual design\n'
      + '- ONLY replace text content inside elements — nothing else\n'
      + '- Preserve ALL <em>, <br>, italic tags and line break structure in headlines exactly as they are\n'
      + '- Keep every section, accordion item, pricing card, and portfolio card exactly as structured\n'
      + '- The testimonial JS array (var testis = [...]) — update the text, name, and initial fields only\n'
      + '- The press bar marquee items — replace publication names with the user\'s press mentions (or keep defaults if none provided)\n'
      + '- Portfolio cards — replace client names and service lists with the user\'s real clients/services\n'
      + '- If a field was left blank, use a sensible professional default that fits the industry\n'
      + '- Return ONLY the complete valid HTML. No explanation, no markdown, no code fences.\n\n'
      + 'USER\'S BUSINESS INFORMATION:\n' + fieldText + '\n\n'
      + 'TEMPLATE TO FILL IN:\n' + SOCIAL_TEMPLATE;

    var message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    });

    var html = message.content[0].text;
    html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
    res.json({ html: html });
  } catch(err) {
    console.error('Generate-template error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// Creative Agency Template — streams to handle large template HTML
app.post('/generate-template-agency', requireAuth, rateLimit, async function(req, res) {
  try {
    var fields = req.body.fields || {};
    if (!AGENCY_TEMPLATE) return res.status(500).json({ error: 'Agency template not loaded on server' });

    var fieldText = Object.keys(fields).map(function(k) {
      return k + ': ' + fields[k];
    }).join('\n');

    var prompt = 'You are filling in a pre-designed HTML template with a user\'s real business content.\n\n'
      + 'CRITICAL RULES — read carefully:\n'
      + '- Do NOT change any CSS, layout, classes, IDs, or structural HTML whatsoever\n'
      + '- Do NOT change fonts, spacing, animations, colors, or any visual design\n'
      + '- ONLY replace text content inside elements — nothing else\n'
      + '- Preserve all photo zone divs and img tags exactly — especially ids starting with ca-\n'
      + '- The testimonial JS array (var testis = [...]) — update text, name, initial fields only\n'
      + '- The marquee text — update to match the user\'s brand voice and services\n'
      + '- Portfolio card captions — replace project titles and tags with user\'s real work\n'
      + '- Stats — replace numbers and labels with user\'s real stats (or sensible defaults)\n'
      + '- If a field was left blank, use a sensible professional default that fits the industry\n'
      + '- Return ONLY the complete valid HTML. No explanation, no markdown, no code fences.\n\n'
      + 'USER\'S BUSINESS INFORMATION:\n' + fieldText + '\n\n'
      + 'TEMPLATE TO FILL IN:\n' + AGENCY_TEMPLATE;

    // Stream the response — template is large, streaming avoids Railway timeout
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    var stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS_STREAM,
      messages: [{ role: 'user', content: prompt }]
    });

    var fullText = '';
    stream.on('text', function(chunk) {
      fullText += chunk;
      res.write(': keep-alive\n\n');
    });

    stream.on('finalMessage', function() {
      var html = fullText.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
      res.write('data: ' + JSON.stringify({ html: html }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', function(err) {
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    });

  } catch(err) {
    console.error('Generate-template-agency error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Generation failed' });
    } else {
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    }
  }
});

// Universal Template Fill — supports social, cherry_sm, bubbly_sm, agency, etc.
app.post('/generate-template-universal', requireAuth, rateLimit, async function(req, res) {
  try {
    var templateType = req.body.templateType || 'social';
    var fields       = req.body.fields || {};
    var niche        = req.body.niche || 'social media manager';

    var fieldText = Object.keys(fields).map(function(k) {
      return k + ': ' + fields[k];
    }).join('\n');

    var revisionNote = fields['_revisionNote'] || '';
    var revisionLine = revisionNote
      ? '\nREVISION INSTRUCTION: ' + revisionNote + '\n'
      : '';

    // ── AI CUSTOM: fully from-scratch generation, no template ─────────────────
    if (templateType === 'custom') {
      var prompt = 'You are Builtsy AI — an expert web designer who builds stunning, conversion-focused single-page websites for small business owners and solopreneurs.\n\n'
        + 'Build a complete, beautiful, professional single-page website from scratch for the following business. Use full creative judgment — design, layout, typography, everything.\n\n'
        + 'BUSINESS INFORMATION:\n' + fieldText + '\n'
        + 'NICHE: ' + niche + '\n'
        + revisionLine + '\n'
        + '━━━ DESIGN REQUIREMENTS ━━━\n'
        + '- Fully self-contained HTML — all CSS in <style> tags, no external CSS frameworks\n'
        + '- Mobile-first, fully responsive\n'
        + '- Color palette that fits the brand personality and niche — bold and intentional, never generic\n'
        + '- Smooth scroll, subtle hover states, professional transitions\n\n'
        + '━━━ TYPOGRAPHY SYSTEM (art-directed — not optional) ━━━\n'
        + 'FONT PAIRING — always use contrast between two typefaces:\n'
        + '- PRIMARY: a high-end serif (Playfair Display, Cormorant Garamond, Libre Baskerville, DM Serif Display) — used for all major headlines\n'
        + '- SECONDARY: a clean modern sans-serif (DM Sans, Inter, Plus Jakarta Sans, Outfit) — used for body, labels, nav, small text\n'
        + '- OPTIONAL ACCENT: a handwritten/script font (Dancing Script, Pacifico, Great Vibes, Sacramento) ONLY when it fits the industry (bakeries, florists, spas, wedding, personal brands). Use sparingly — one or two moments, not everywhere.\n'
        + '- Import all fonts via Google Fonts @import in the <style> tag.\n\n'
        + 'HEADLINE ART DIRECTION — every major headline must be visually art-directed:\n'
        + '- NEVER render a headline as a flat block of identically styled text.\n'
        + '- At least one word per hero or section headline must receive visual emphasis via ONE of: italic, accent color, script style, heavier weight, or slightly larger size.\n'
        + '- Use <em> or <span class="accent"> to isolate the emphasized word inline inside the headline element.\n'
        + '- Examples of correct art direction:\n'
        + '  "Simple, <em>reliable</em>, every time." — "reliable" is italic and colored with the accent color\n'
        + '  "Double the love. <em>Double</em> the help." — "Double" styled in italic serif\n'
        + '  "Fresh baked <span class=\'accent-script\'>joy</span> from Victoria\'s kitchen." — "joy" in script font + accent color\n'
        + '  "The detail is in the <em>details.</em>" — last word italic, slightly larger\n'
        + '- Define .accent { color: [accent color]; } and .accent-script { font-family: [script font]; color: [accent color]; } in CSS.\n\n'
        + 'SCALE AND SPACING:\n'
        + '- Hero headline: clamp(2.6rem, 7vw, 5rem) — oversized, editorial, commanding\n'
        + '- Hero headline line-height: 1.05–1.15 — tight, magazine-style\n'
        + '- Section headlines: clamp(2rem, 4vw, 3rem) — still large, not shrunk down\n'
        + '- Generous whitespace above and below every major headline (at least 0.5em top, 0.75em bottom before body text)\n'
        + '- Letter-spacing on ALL CAPS labels: 0.12–0.18em for refinement\n'
        + '- Body text: 1rem–1.05rem, line-height 1.7–1.8 for readability\n\n'
        + '━━━ NAV RULES ━━━\n'
        + '- Sticky/fixed nav at top with a subtle shadow or border-bottom\n'
        + '- Logo/business name on the LEFT — use an elegant serif or script font\n'
        + '- DESKTOP: nav links in the center or right using business-specific names (e.g. "Fresh From the Oven", "Custom Boxes", "Celebration Cakes", "How to Order") — NEVER generic labels like "Services / About / Contact". One filled CTA button on the far right (e.g. "Order Now", "Book a Session").\n'
        + '- MOBILE: ONLY the logo on the left + a clean hamburger icon on the right. NO other elements in the mobile header row — no buttons, no extra links, nothing crowding it. The hamburger opens a fullscreen or slide-down menu with all the nav links AND the primary CTA.\n'
        + '- Nav background: white or very light — clean, not dark. Enough padding so it breathes.\n\n'
        + '━━━ HERO RULES ━━━ (CRITICAL — do not skip)\n'
        + 'DESKTOP — Choose ONE of these two layouts:\n'
        + 'OPTION A — Split Hero: text + CTAs on the left half; photo fills the full right half edge-to-edge with object-fit:cover. No margin or padding on the photo side. Min-height 85vh.\n'
        + 'OPTION B — Full-Bleed Hero: photo covers 100% of the hero; text overlays with a dark gradient scrim (e.g. linear-gradient from transparent to rgba(0,0,0,0.55)) for readability. Min-height 90vh.\n'
        + 'MOBILE — Stacked layout is acceptable: full-width photo fills the top (55–60vw height), then the headline, subtext, and CTAs below on a warm background. Give the text area generous padding and breathing room.\n'
        + 'NEVER build a hero that is just centered text with a tiny photo sitting below it as a normal img tag.\n'
        + 'Hero must include: bold editorial headline (serif, large), warm supporting subtext (2 sentences), one primary CTA button + one secondary/outline CTA below it.\n'
        + 'Hero img placeholder (EXACT — do not alter): <img id="ai-hero-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" alt="hero">\n\n'
        + '━━━ PROOF STRIP (required — right after the hero) ━━━\n'
        + 'A narrow horizontal band (dark background or bold accent color, 1 line of text) with 4-6 trust signals separated by bullet dots (·). Pull from real data: location, years experience, credentials, most popular package + price, key differentiator, availability. Example: "Parker · Lone Tree · Castle Pines  ·  CPR Certified  ·  Date Night — $99  ·  References Always Available". NO emoji.\n\n'
        + '━━━ REQUIRED SECTIONS ━━━\n'
        + '1. Hero (see Hero Rules above)\n'
        + '2. Proof Strip (see above)\n'
        + '3. About — personal story, what makes them different, credentials. Include TWO photo placeholders:\n'
        + '   <img id="ai-about-a-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" alt="about">\n'
        + '   <img id="ai-about-b-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" alt="about">\n'
        + '4. Services / Offerings — 3-4 services with real descriptions and pricing if provided. Use cards or a creative layout.\n'
        + '5. Pricing — dedicated pricing section if rates are provided. Highlight the most popular tier with a badge or border.\n'
        + '6. Testimonials — 3 testimonials with real names and context. Use the avatar photo placeholders:\n'
        + '   <img id="ai-port-1-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:50%;" alt="client">\n'
        + '   <img id="ai-port-2-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:50%;" alt="client">\n'
        + '   <img id="ai-port-3-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:50%;" alt="client">\n'
        + '7. Contact / Booking — prominent CTA, email, phone, service area. Include a simple contact form.\n'
        + '8. Footer — business name, short tagline, links, copyright\n\n'
        + '━━━ CRITICAL RULES ━━━\n'
        + '- ZERO EMOJI anywhere in the entire site — not in headings, subheadings, buttons, body text, labels, nav, footer, or anywhere else. Not one.\n'
        + '- NO cookie consent banners, GDPR popups, or any overlay that blocks the hero. Do not include any cookie notice code at all.\n'
        + '- All img tags with id attributes MUST appear exactly as written — same id, same src="", same style. These are photo injection hooks — do not alter them.\n'
        + '- Each img must be inside a container with position:relative and a defined height, so the photo fills it perfectly.\n'
        + '- Use styled placeholder backgrounds (gradient, soft color, or subtle pattern) behind each img so sections look beautiful even without photos.\n'
        + '- If any field is blank, invent a compelling professional default for the niche — never leave placeholder text like "Lorem ipsum" or "[Your Name]".\n'
        + '- Write real, specific, emotionally resonant copy — not generic filler. Headlines should feel human and personal, not corporate.\n'
        + '- Give sections generous padding and breathing room — cramped designs feel cheap. Aim for editorial spacing.\n'
        + '- Section backgrounds should alternate (light/cream/soft tint) to create visual rhythm without being harsh.\n'
        + '- Return ONLY the complete valid HTML. No explanation, no markdown fences, no commentary.\n\n'
        + 'SEO — include in <head>:\n'
        + '- Keyword-rich <title> (business name + service + city, under 60 chars)\n'
        + '- <meta name="description"> 150-160 chars\n'
        + '- Open Graph: og:title, og:description, og:type, og:locale\n'
        + '- Twitter: twitter:card, twitter:title, twitter:description\n'
        + '- <link rel="canonical" href="#">\n\n'
        + 'JSON-LD — before </body>:\n'
        + '- LocalBusiness or ProfessionalService schema with name, description, url, telephone, email, address, priceRange\n\n'
        + 'Now build the best possible website for this business. Make it something they would be genuinely proud to share.';

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();

      var customStream = await client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS_STREAM,
        messages: [{ role: 'user', content: prompt }]
      });

      var customFull = '';
      customStream.on('text', function(chunk) {
        customFull += chunk;
        res.write(': keep-alive\n\n');
      });
      customStream.on('finalMessage', function() {
        var html = customFull.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
        res.write('data: ' + JSON.stringify({ html: html }) + '\n\n');
        res.write('data: [DONE]\n\n');
        res.end();
      });
      customStream.on('error', function(err) {
        res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
        res.end();
      });
      return;
    }
    // ── END AI CUSTOM ──────────────────────────────────────────────────────────

    var templateMap = {
      social:            SOCIAL_TEMPLATE,
      agency:            AGENCY_TEMPLATE,
      cherry_sm:         CHERRY_SM_TEMPLATE,
      bubbly_sm:         BUBBLY_SM_TEMPLATE,
      caretaker_warm:    CARETAKER_WARM_TEMPLATE,
      caretaker_bright:  CARETAKER_BRIGHT_TEMPLATE,
      caretaker_clean:   CARETAKER_CLEAN_TEMPLATE
    };

    var template = templateMap[templateType] || SOCIAL_TEMPLATE;
    if (!template) {
      return res.status(500).json({ error: 'Template "' + templateType + '" not loaded on server' });
    }

    var prompt = 'You are filling in a pre-designed HTML template for a ' + niche + ' with their real business content.\n\n'
      + 'CRITICAL RULES — read carefully:\n'
      + '- Do NOT change any CSS, layout, classes, IDs, or structural HTML whatsoever\n'
      + '- Do NOT change fonts, spacing, animations, colors, or any visual design\n'
      + '- ONLY replace text content inside elements — nothing else\n'
      + '- CRITICAL: every <img> tag with an id attribute (e.g. id="cw-hero-photo") must be copied to the output EXACTLY as-is — same id, same src="", same style, same everything. These ids are used by the system to inject real photos. Changing or removing them breaks the site.\n'
      + '- If the template has a testimonial JS array (var testis = [...]), update text, name, and initial fields only\n'
      + '- The press bar / marquee — replace publication names with the user\'s press mentions (or keep defaults if none provided)\n'
      + '- Portfolio cards — replace client names and service lists with the user\'s real clients/services\n'
      + '- Pricing tiers — use the user\'s tier names, prices, and descriptions; mark the popular tier appropriately\n'
      + '- Process steps — replace with the user\'s step titles and descriptions\n'
      + '- NEVER use emoji anywhere in the output — not in text, headings, buttons, labels, or anywhere else\n'
      + '- If a field was left blank, use a sensible professional default that fits the ' + niche + ' industry\n'
      + '- Return ONLY the complete valid HTML. No explanation, no markdown, no code fences.\n\n'
      + 'SEO & TECHNICAL REQUIREMENTS — add these inside <head> if not already present:\n'
      + '- A unique, keyword-rich <title> tag (business name + primary service + city, under 60 chars)\n'
      + '- <meta name="description"> — compelling 150-160 char description with primary keyword\n'
      + '- <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">\n'
      + '- <meta name="robots" content="GPTBot: allow, ClaudeBot: allow, PerplexityBot: allow, anthropic-ai: allow, Bytespider: allow"> (AI discoverability)\n'
      + '- Open Graph tags: og:title, og:description, og:type (website), og:locale (en_US)\n'
      + '- Twitter card tags: twitter:card (summary_large_image), twitter:title, twitter:description\n'
      + '- <link rel="canonical" href="#"> (placeholder)\n\n'
      + 'JSON-LD SCHEMA — inject a <script type="application/ld+json"> block before </body> with:\n'
      + '- @type: LocalBusiness (or ProfessionalService if more appropriate)\n'
      + '- name, description, url, telephone (if provided), email, address with city/region\n'
      + '- priceRange (derive from pricing tiers), currenciesAccepted: "USD"\n'
      + '- sameAs array with the social media URLs provided\n'
      + '- Also include a WebSite schema with name and url\n\n'
      + 'ACCESSIBILITY — ensure:\n'
      + '- All img tags have descriptive alt attributes\n'
      + '- Interactive elements are keyboard-accessible (already in template structure — preserve it)\n'
      + '- Color contrast is maintained (do not add inline color overrides that could reduce contrast)\n\n'
      + 'USER\'S BUSINESS INFORMATION:\n' + fieldText + '\n'
      + revisionLine + '\n'
      + 'TEMPLATE TO FILL IN:\n' + template;

    // Stream response — templates can be large
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    var stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS_STREAM,
      messages: [{ role: 'user', content: prompt }]
    });

    var fullText = '';
    stream.on('text', function(chunk) {
      fullText += chunk;
      res.write(': keep-alive\n\n');
    });

    stream.on('finalMessage', function() {
      var html = fullText.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
      res.write('data: ' + JSON.stringify({ html: html }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', function(err) {
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    });

  } catch(err) {
    console.error('Generate-template-universal error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Generation failed' });
    } else {
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    }
  }
});

// ── Section extractor helper ──────────────────────────────────────────────────
function extractSectionById(html, sectionId) {
  var openTagRe = new RegExp('<section[^>]+id=["\']' + sectionId + '["\'][^>]*>', 'i');
  var match = openTagRe.exec(html);
  if (!match) return null;
  var start = match.index;
  var pos = start + match[0].length;
  var depth = 1;
  while (depth > 0 && pos < html.length) {
    var nextOpen = html.indexOf('<section', pos);
    var nextClose = html.indexOf('</section>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; pos = nextOpen + 8; }
    else { depth--; pos = nextClose + 10; }
  }
  if (depth !== 0) return null;
  return { content: html.substring(start, pos), start: start, end: pos };
}

// ── Chat-driven section revise ────────────────────────────────────────────────
app.post('/revise-section', requireAuth, rateLimit, async function(req, res) {
  try {
    var html    = req.body.html    || '';
    var message = req.body.message || '';
    var niche   = req.body.niche   || 'business';

    if (!html || !message) return res.status(400).json({ error: 'html and message required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    var keepalive = setInterval(function() { res.write(': keep-alive\n\n'); }, 5000);

    // Step 1: classify (~1-2s, cheap call)
    var classifyMsg = await client.messages.create({
      model: MODEL,
      max_tokens: 120,
      messages: [{ role: 'user', content:
        'Classify this website edit request. Return JSON only, nothing else.\n'
        + 'Request: "' + message + '"\n\n'
        + '{"sectionId":"hero|about|services|pricing|testimonials|faq|contact|footer|nav|null","isGlobalStyle":true_or_false}\n\n'
        + 'sectionId=null if multiple sections or unclear. isGlobalStyle=true only if the change requires editing global CSS (brand colors, fonts, spacing).'
      }]
    });

    var classify = { sectionId: null, isGlobalStyle: false };
    try {
      var cm = classifyMsg.content[0].text.match(/\{[\s\S]*?\}/);
      if (cm) classify = JSON.parse(cm[0]);
    } catch(e) {}

    var sectionId = (classify.sectionId && classify.sectionId !== 'null') ? classify.sectionId : null;

    // Step 2a: targeted section patch
    if (!classify.isGlobalStyle && sectionId) {
      var section = extractSectionById(html, sectionId);
      if (section) {
        var cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        var cssCtx = cssMatch ? cssMatch[1].substring(0, 2500) : '';
        var patchPrompt = 'Apply ONLY this change to the HTML section below: "' + message + '"\n\n'
          + 'CSS context (reference only — do NOT output it):\n' + cssCtx + '\n\n'
          + 'SECTION TO MODIFY:\n' + section.content + '\n\n'
          + 'Rules:\n'
          + '- Return ONLY the modified <section>...</section> HTML\n'
          + '- Preserve ALL id and class attributes exactly\n'
          + '- Preserve ALL <img> tags and their id attributes exactly\n'
          + '- No <html>, <head>, <body>, <style> tags — section only\n'
          + '- No markdown, no explanation';

        var stream = await client.messages.stream({
          model: MODEL, max_tokens: 8000,
          messages: [{ role: 'user', content: patchPrompt }]
        });
        var patched = '';
        stream.on('text', function(c) { patched += c; res.write(': keep-alive\n\n'); });
        stream.on('finalMessage', function() {
          clearInterval(keepalive);
          patched = patched.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
          var newHtml = html.substring(0, section.start) + patched + html.substring(section.end);
          res.write('data: ' + JSON.stringify({ html: newHtml, mode: 'patch', section: sectionId }) + '\n\n');
          res.write('data: [DONE]\n\n');
          res.end();
        });
        stream.on('error', function(err) {
          clearInterval(keepalive);
          res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
          res.end();
        });
        return;
      }
    }

    // Step 2b: full-HTML revision fallback (global style change or section not found)
    var fullPrompt = 'Apply this change to the website: "' + message + '"\n\n'
      + 'Rules:\n'
      + '- Return the COMPLETE modified HTML\n'
      + '- Preserve all <img> tags and their id attributes exactly\n'
      + '- Preserve all structure, JS, and img IDs\n'
      + '- No markdown, no explanation\n\n'
      + 'HTML:\n' + html;

    var stream2 = await client.messages.stream({
      model: MODEL, max_tokens: MAX_TOKENS_STREAM,
      messages: [{ role: 'user', content: fullPrompt }]
    });
    var fullText = '';
    stream2.on('text', function(c) { fullText += c; res.write(': keep-alive\n\n'); });
    stream2.on('finalMessage', function() {
      clearInterval(keepalive);
      var newHtml = fullText.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
      res.write('data: ' + JSON.stringify({ html: newHtml, mode: 'full' }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    });
    stream2.on('error', function(err) {
      clearInterval(keepalive);
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    });

  } catch(err) {
    console.error('Revise-section error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else { res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n'); res.end(); }
  }
});

// PDF Template Blueprint — streams response to avoid Railway timeout on large PDFs
app.post('/generate-from-pdf', requireAuth, rateLimit, async function(req, res) {
  try {
    var pdfBase64 = req.body.pdf;
    var fields    = req.body.fields || {};

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF provided' });
    }

    var fieldText = Object.keys(fields).map(function(k) {
      return k + ': ' + fields[k];
    }).join('\n');

    // Use SSE so the connection stays open while Claude processes the PDF
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    var stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS_STREAM,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64
            }
          },
          {
            type: 'text',
            text: 'You are a world-class web designer. The attached PDF is a design template (purchased from Etsy or Canva). '
              + 'Your job is to recreate this design as a complete, professional HTML website filled with the user\'s real business content.\n\n'
              + 'WHAT TO DO:\n'
              + '1. Study every aspect of the PDF: color palette, typography, layout, sections, spacing, decorative elements, and overall aesthetic\n'
              + '2. Recreate the full design as a single self-contained HTML file with all CSS inline in a <style> tag\n'
              + '3. Replace every piece of placeholder or sample text with the user\'s real business information below\n'
              + '4. Match fonts using Google Fonts — pick fonts that match the template\'s style (serif/script/sans as appropriate)\n'
              + '5. Preserve the exact color palette, layout feel, and visual personality of the template\n'
              + '6. Make it fully responsive with a mobile breakpoint at 768px\n\n'
              + 'CRITICAL RULES:\n'
              + '- Output ONLY raw HTML — no explanation, no markdown, no code fences\n'
              + '- Start your response with <!DOCTYPE html> and nothing else before it\n'
              + '- All CSS must be inside a <style> tag in the <head>\n'
              + '- All JavaScript must use var (not const/let) and onclick= attributes (not addEventListener)\n'
              + '- Include ALL sections visible in the template — do not skip any\n'
              + '- Use body{overflow-x:hidden} and max-width:1100px;margin:0 auto on content containers\n'
              + '- Photo/image areas: use a styled CSS gradient div as placeholder with class="photo-placeholder" and an <img> tag inside with src="" — do NOT use broken external image links\n'
              + '- If the template has a contact form, include it with data-netlify="true" for Netlify Forms\n'
              + '- Include a sticky nav, all content sections from the template, and a footer\n\n'
              + 'USER\'S BUSINESS INFORMATION:\n'
              + fieldText + '\n\n'
              + 'Generate the complete HTML site now. Start immediately with <!DOCTYPE html>.'
          }
        ]
      }]
    });

    var fullText = '';
    stream.on('text', function(chunk) {
      fullText += chunk;
      // Send a keep-alive comment every chunk so Railway doesn't timeout
      res.write(': keep-alive\n\n');
    });

    stream.on('finalMessage', function() {
      var html = fullText.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
      res.write('data: ' + JSON.stringify({ html: html }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', function(err) {
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    });

  } catch (err) {
    console.error('Generate-from-pdf error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Generation failed' });
    } else {
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
      res.end();
    }
  }
});

// ── FAQ Generator ──
app.post('/generate-faq', requireAuth, rateLimit, async function(req, res) {
  try {
    var businessName  = req.body.businessName  || '';
    var niche         = req.body.niche         || '';
    var audience      = req.body.audience      || '';
    var services      = req.body.services      || '';
    var tone          = req.body.tone          || 'friendly';

    var toneGuide = tone === 'professional'
      ? 'Write in a polished, professional tone.'
      : tone === 'casual'
      ? 'Write in a relaxed, casual, conversational tone.'
      : 'Write in a warm, friendly, approachable tone.';

    var prompt = 'Generate exactly 8 frequently asked questions (FAQs) for a business with the following details:\n\n'
      + 'Business Name: ' + businessName + '\n'
      + 'What they do: ' + niche + '\n'
      + 'Target audience: ' + audience + '\n'
      + 'Services: ' + services + '\n\n'
      + toneGuide + '\n\n'
      + 'The FAQs should cover: pricing, process/how it works, experience/credentials, what\'s included, '
      + 'how to get started, turnaround/availability, what makes them different, and one common concern their audience has.\n\n'
      + 'Return ONLY valid JSON in this exact format — no explanation, no markdown:\n'
      + '{"faqs":[{"q":"Question here?","a":"Answer here."},...]}\n\n'
      + 'Make the answers 2-4 sentences each. Make them specific to the business, not generic.';

    var message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    var text = message.content[0].text.trim();
    text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    var parsed = JSON.parse(text);
    res.json(parsed);
  } catch(err) {
    console.error('Generate-faq error:', err.message);
    res.status(500).json({ error: err.message || 'FAQ generation failed' });
  }
});

// ── SMS Test — uses user's own Twilio credentials ──
app.post('/test-sms', requireAuth, rateLimit, async function(req, res) {
  try {
    var to         = req.body.phone;
    var accountSid = req.body.accountSid;
    var authToken  = req.body.authToken;
    var fromNumber = req.body.fromNumber;

    if (!to || !accountSid || !authToken || !fromNumber) {
      return res.status(400).json({ error: 'Missing phone, accountSid, authToken, or fromNumber' });
    }

    var twilio = require('twilio')(accountSid, authToken);
    await twilio.messages.create({
      body: 'Test from Builtsy — your SMS lead alerts are working!',
      from: fromNumber,
      to: to
    });
    res.json({ ok: true });
  } catch(err) {
    console.error('Test-sms error:', err.message);
    res.status(500).json({ error: err.message || 'Test SMS failed' });
  }
});

// ── Contact Form + SMS notify (used by generated sites) ──
// Hidden fields _smsTo, _smsSid, _smsTok, _smsFrom, _smsTpl injected into site at generate time
app.post('/contact-notify', cors(), rateLimit, async function(req, res) {
  try {
    var name       = req.body.name     || '';
    var email      = req.body.email    || '';
    var message    = req.body.message  || '';
    var phone      = req.body._smsTo   || '';
    var accountSid = req.body._smsSid  || '';
    var authToken  = req.body._smsTok  || '';
    var fromNumber = req.body._smsFrom || '';
    var template   = req.body._smsTpl  || 'New lead!\n\nName: {{name}}\nEmail: {{email}}\nMessage: {{message}}';

    if (phone && accountSid && authToken && fromNumber) {
      var body = template
        .replace(/\{\{name\}\}/g,    name)
        .replace(/\{\{email\}\}/g,   email)
        .replace(/\{\{message\}\}/g, message);
      var twilio = require('twilio')(accountSid, authToken);
      await twilio.messages.create({ body: body, from: fromNumber, to: phone });
    }

    res.json({ ok: true, message: 'Thank you! We will be in touch soon.' });
  } catch(err) {
    console.error('Contact-notify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Builtsy Brain AI chat ────────────────────────────────────────────────────
var CHAT_SYSTEM = 'You are Builtsy Brain AI — the creative and business brain built into Builtsy, a platform that helps small business owners, creators, and entrepreneurs build their brand and grow online.\n\nAlways refer to yourself as "Builtsy" or "Builtsy Brain AI" — never "I\'m an AI" or "as an AI assistant." You are Builtsy. You are part of their team.\n\nTone: warm, sharp, real, and encouraging. Talk like a brilliant friend who happens to know everything about marketing, branding, and business — not like a corporate chatbot. Use their name when you know it. Be direct. Skip the fluff. Give real answers they can actually use today.\n\nAlways reference Builtsy naturally: "Builtsy can help you with that", "that\'s what Builtsy is built for", "let\'s build that together." Make them feel like they\'re working with Builtsy, not just querying an AI.\n\nFormat responses cleanly: **bold** for key points, bullets for lists, ### headings for longer responses. Keep it conversational but genuinely useful. No filler phrases like "Certainly!" or "Great question!" — just get into it.';

app.post('/chat', requireAuth, rateLimit, async function(req, res) {
  try {
    var messages = req.body.messages;
    var context  = req.body.context || ''; // user business context only, not system override
    if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

    var system = CHAT_SYSTEM;
    if (context) system += '\n\n' + context;

    var params = {
      model: MODEL,
      max_tokens: 2048,
      messages: messages,
      system: system
    };

    var msg = await client.messages.create(params);
    var text = msg.content[0].text;
    res.json({ text: text });
  } catch(err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Builtsy API running on port ' + PORT);
});
