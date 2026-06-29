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
    var body = '';
    supaRes.on('data', function(chunk) { body += chunk; });
    supaRes.on('end', function() {
      try {
        var user = JSON.parse(body);
        req._userId    = user.id;
        req._userToken = token;
      } catch(e) {}
      req._authed = true;
      next();
    });
  });
  supaReq.on('error', function() { res.status(401).json({ error: 'Auth check failed' }); });
  supaReq.end();
}

// ── Supabase REST helper ───────────────────────────────────────────────────────
function supabaseREST(method, table, opts) {
  opts = opts || {};
  var token = opts.token || SUPABASE_ANON;
  var path  = '/rest/v1/' + table + (opts.query ? '?' + opts.query : '');
  var bodyStr = (opts.body && method !== 'GET') ? JSON.stringify(opts.body) : '';
  return new Promise(function(resolve, reject) {
    var headers = {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (opts.upsert) headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    else if (method === 'POST') headers['Prefer'] = 'return=representation';
    var reqOpts = { hostname: SUPABASE_URL, path: path, method: method, headers: headers };
    var r = https.request(reqOpts, function(sRes) {
      var buf = '';
      sRes.on('data', function(c) { buf += c; });
      sRes.on('end', function() {
        try { resolve({ status: sRes.statusCode, data: JSON.parse(buf) }); }
        catch(e) { resolve({ status: sRes.statusCode, data: buf }); }
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
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

// ── Claim Board Style — AI-powered design aesthetic for claim boards ─────────
app.post('/claim-board-style', rateLimit, async function(req, res) {
  try {
    var { occasion, listType, theme, name, items, message, primaryColor, accentColor, accent2Color } = req.body;
    if (!name) return res.status(400).json({ error: 'No board name provided' });

    // SSE keeps connection alive through Railway's proxy timeout
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    var keepalive = setInterval(function() { res.write(': ping\n\n'); }, 5000);

    try {
      var itemList = (items || []).slice(0, 12).join(', ') || 'various items';

      var prompt = 'You are an elite UI/UX designer creating a stunning, custom visual aesthetic for a shareable claim list page. '
        + 'This needs to look as beautiful and polished as a premium event invitation.\n\n'
        + 'Board details:\n'
        + '- Name: ' + name + '\n'
        + '- Occasion: ' + (occasion || 'general') + '\n'
        + '- List type: ' + (listType || 'general') + '\n'
        + '- Theme: ' + (theme || 'general') + '\n'
        + '- Base accent color: ' + (primaryColor || '#C8E000') + '\n'
        + '- Base secondary color: ' + (accentColor || '#ee70bc') + '\n'
        + (message ? '- Message: ' + message + '\n' : '')
        + '- Items: ' + itemList + '\n\n'
        + 'Generate a JSON object. Return ONLY raw JSON — no markdown, no explanation:\n\n'
        + '{\n'
        + '  "tagline": "Punchy 1-line subtitle, fun and specific to the occasion and items, no emoji, max 65 chars",\n'
        + '  "btn_color": "hex color for claim buttons — must harmonize beautifully with the theme background, vibrant and on-brand",\n'
        + '  "btn_text_color": "hex color for button text — ensure strong contrast with btn_color",\n'
        + '  "accent_color": "hex color for accents, borders, highlights — the hero color of this design",\n'
        + '  "bg_overlay": "full CSS linear-gradient for a richly colored overlay on the background — use rgba with opacity 0.3-0.6 to add depth and color to the dark background",\n'
        + '  "card_bg": "rgba CSS color for item card backgrounds — subtle warmth, opacity 0.07-0.16",\n'
        + '  "card_border": "rgba CSS color for item card borders — opacity 0.2-0.35",\n'
        + '  "card_shadow": "full CSS box-shadow for item cards — glowing, warm, use accent_color",\n'
        + '  "btn_shadow": "full CSS box-shadow for claim buttons — vibrant glow matching btn_color",\n'
        + '  "title_color": "hex color for the main title — white or a soft bright tint of the accent, always readable",\n'
        + '  "progress_gradient": "full CSS linear-gradient(90deg,...) for the progress bar — use accent colors"\n'
        + '}\n\n'
        + 'CRITICAL design rules:\n'
        + '- ALL colors must form a COHESIVE, BEAUTIFUL palette — no clashing. The btn_color must look stunning on the dark theme background\n'
        + '- For birthday: think warm pinks, golds, rose — romantic and celebratory\n'
        + '- For sports: think electric yellows, greens, bold contrast\n'
        + '- For potluck: warm oranges, ambers, earthy warmth\n'
        + '- For shower: soft lavenders, blush pinks, gentle pastels\n'
        + '- For trip: ocean blues, teals, sunset oranges\n'
        + '- For holiday: rich reds, forest greens, gold\n'
        + '- For school: royal purple, bright blue, gold\n'
        + '- bg_overlay should add dramatic color depth — not just darken, actually add hue\n'
        + '- Card shadows should glow with the accent color — not grey or flat\n'
        + '- The tagline should feel personal and fun — mention the occasion type\n'
        + '- Return ONLY valid JSON with exactly these 11 keys';

      var resp = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }]
      });

      var raw = resp.content[0].text.trim();
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      var styles = JSON.parse(raw);

      clearInterval(keepalive);
      res.write('data: ' + JSON.stringify({ styles: styles }) + '\n\n');
      res.end();

    } catch (innerErr) {
      clearInterval(keepalive);
      console.error('Claim board style generation error:', innerErr.message);
      res.write('data: ' + JSON.stringify({ error: innerErr.message }) + '\n\n');
      res.end();
    }

  } catch (err) {
    console.error('Claim board style setup error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Style generation failed' });
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
    var templateType       = req.body.templateType || 'social';
    var fields             = req.body.fields || {};
    var niche              = req.body.niche || 'social media manager';
    var inspirationImages  = Array.isArray(req.body.inspirationImages) ? req.body.inspirationImages : [];

    var fieldText = Object.keys(fields).map(function(k) {
      return k + ': ' + fields[k];
    }).join('\n');

    var revisionNote = fields['_revisionNote'] || '';
    var revisionLine = revisionNote
      ? '\nREVISION INSTRUCTION: ' + revisionNote + '\n'
      : '';

    // ── Helper: build message content — text only, or text + vision images ────
    function buildMessageContent(promptText) {
      if (!inspirationImages.length) {
        return promptText; // plain string — no vision needed
      }
      // Multi-part content array: images first, then the text prompt
      var parts = [];
      // Framing paragraph inserted before the prompt text
      var inspoFrame = '\n\n════════════════════════════════════\n'
        + ' DESIGN INSPIRATION — SPATIAL REFERENCE ONLY\n'
        + '════════════════════════════════════\n'
        + 'The attached screenshot(s) are provided as SPATIAL and STRUCTURAL inspiration.\n'
        + 'DO NOT copy their colors, fonts, logos, brand identity, or specific imagery.\n'
        + 'EXTRACT from them ONLY:\n'
        + '- Layout architecture (hero treatment, section flow, column grids)\n'
        + '- Whitespace philosophy (density, breathing room, padding rhythms)\n'
        + '- Component aesthetic (card style, button shape, nav density, divider use)\n'
        + '- Visual hierarchy approach (size relationships, contrast moments)\n'
        + '- Overall design confidence (bold vs minimal, editorial vs warm)\n\n'
        + 'Apply that spatial language to the brand identity defined in the business information — '
        + 'keeping the specified colors, typography system, and content — but letting these images '
        + 'directly influence: section layout, spacing density, component styling, hero treatment, '
        + 'and overall visual sophistication.\n'
        + '════════════════════════════════════\n\n';

      // Images go first in the content array
      inspirationImages.forEach(function(img) {
        if (img.data && img.mediaType) {
          parts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.data
            }
          });
        }
      });

      // Then the text prompt with the framing injected near the top
      parts.push({
        type: 'text',
        text: promptText + inspoFrame
      });

      return parts;
    }

    // ── AI CUSTOM: fully from-scratch generation, no template ─────────────────
    if (templateType === 'custom') {
      var prompt = 'You are a senior $50k UX/UI brand designer and front-end developer. You are designing branded experiences — not assembling components. Every decision — layout, type, spacing, motion, color — must feel custom-crafted, intentional, and premium.\n\n'
        + 'BUSINESS INFORMATION:\n' + fieldText + '\n'
        + 'NICHE: ' + niche + '\n'
        + revisionLine + '\n\n'

        + '════════════════════════════════════\n'
        + ' GLOBAL RULES — APPLY TO EVERY BUILD\n'
        + '════════════════════════════════════\n'
        + 'These rules are non-negotiable. A site that breaks any of them has FAILED.\n\n'
        + 'RULE 1 — MOBILE NAVIGATION:\n'
        + 'The mobile header contains EXACTLY TWO elements: brand name/logo on the left, hamburger icon on the right.\n'
        + 'NO CTA buttons in the mobile header. No "Order Now". No "Build Your Package". No pills. No secondary nav items.\n'
        + 'CTAs belong in the hero content body — not the nav, not above the fold beside the logo.\n\n'
        + 'RULE 2 — ZERO EMOJI:\n'
        + 'No emoji anywhere in the entire site. Not in headings, body, buttons, trust strips, footer, contact info — nowhere.\n'
        + 'Replace what emoji would do with: premium SVG icons (inline), pill badges, typographic emphasis, or decorative dividers.\n\n'
        + 'RULE 3 — EVERY SECTION NEEDS VISUAL STRUCTURE:\n'
        + 'Plain text floating on a flat background is not allowed. Every section must contain at least one of:\n'
        + 'bordered card · layered panel · soft background block · quote card · trust pill · shadow container · editorial split layout · divider line · subtle outline\n'
        + 'If text is sitting directly on a plain background with no visual framing — redesign it.\n\n'
        + 'RULE 4 — NO GIANT UNSTRUCTURED PARAGRAPHS:\n'
        + 'Body copy must be broken into visual chunks: cards, grouped info rows, trust modules, bordered sections, staggered layouts, split columns, checklist groups. Never a wall of identical text.\n\n'
        + 'RULE 5 — CTA PLACEMENT:\n'
        + 'Primary CTA = hero section. Secondary CTA = after trust/content sections. Optional sticky mobile CTA bar at bottom.\n'
        + 'Never random CTA placement. Never a CTA crammed into the nav header.\n\n'
        + 'RULE 6 — TYPOGRAPHY VARIATION IS REQUIRED:\n'
        + 'No large blocks of identical font styling. Required: serif + sans pairing, italic emphasis, accent-colored words, bold moments, spacing hierarchy, eyebrow labels on every section.\n\n'
        + 'RULE 7 — SECTION ANATOMY (every section must have all of these):\n'
        + 'eyebrow label · art-directed headline · supporting text · divider or border treatment · spacing separation · at least one visual anchor element\n\n'
        + 'RULE 8 — CONTACT SECTION DESIGN:\n'
        + 'Contact info is NEVER a plain text list. Use: cards, grouped contact modules, soft bordered info blocks, stacked service area cards, subtle separators, or mini trust rows.\n\n'
        + 'RULE 9 — ANIMATION (required on every build):\n'
        + 'Include subtle, premium, theme-specific motion. Choose appropriate effects for the niche:\n'
        + '- Animated trust strip (CSS marquee, see Trust Strip section)\n'
        + '- Drifting SVG particles or soft floating dots in the hero background (CSS keyframes, very subtle opacity)\n'
        + '- Floating gradient blobs in section backgrounds (CSS radial-gradient + keyframe drift, opacity 0.08–0.15)\n'
        + '- Parallax-style image depth on scroll (CSS transform translateY tied to a mild scroll listener or CSS perspective)\n'
        + '- Smooth reveal on scroll (IntersectionObserver fade-up for section content)\n'
        + '- Hover lift on cards (translateY(-4px) + shadow increase)\n'
        + 'Motion must feel calm, premium, and branded. NOT flashy, NOT distracting.\n\n'
        + 'RULE 10 — THE FAILURE TEST:\n'
        + 'Before finishing, check: Does the page look like stacked rectangles of plain centered text with generic buttons on empty backgrounds?\n'
        + 'If yes — that design has FAILED. Add visual structure, motion, typographic contrast, and layered content until it does not.\n\n'

        + '════════════════════════════════════\n'
        + ' FOUNDATION\n'
        + '════════════════════════════════════\n'
        + '- Fully self-contained HTML — all CSS in <style> tags. No external CSS frameworks.\n'
        + '- Mobile-first, fully responsive with thoughtful breakpoints.\n'
        + '- Intentional color palette suited to the niche — bold and considered, never generic.\n'
        + '- Smooth scroll, refined hover states, subtle professional transitions throughout.\n'
        + '- Section backgrounds alternate (light → cream/tint → white → warm) to create visual rhythm.\n'
        + '- Every section has generous padding — cramped layouts feel amateur. Think editorial magazine spacing.\n\n'

        + '════════════════════════════════════\n'
        + ' TYPOGRAPHY SYSTEM\n'
        + '════════════════════════════════════\n'
        + 'FONT PAIRING (required — always two typefaces minimum):\n'
        + '- SERIF: Playfair Display, Cormorant Garamond, DM Serif Display, or Libre Baskerville — all major headlines.\n'
        + '- SANS: DM Sans, Inter, Plus Jakarta Sans, or Outfit — body, labels, nav, captions.\n'
        + '- SCRIPT ACCENT (use when industry fits — bakery, spa, florist, wedding, personal brand): Dancing Script, Great Vibes, Sacramento, or Pacifico. Use sparingly — one or two brand moments only, never decoration spam.\n'
        + '- Import all via Google Fonts @import inside <style>.\n\n'
        + 'ART-DIRECTED HEADLINES (non-negotiable):\n'
        + '- NEVER write a headline as a flat block of identical text. Every major headline must be visually art-directed.\n'
        + '- At least one word per headline gets visual emphasis: italic, accent color, script treatment, heavier weight, or slight size increase.\n'
        + '- Use <em> (renders italic in serif) or <span class="hl"> for inline emphasis within headlines.\n'
        + '- .hl { color: [accent]; font-style: italic; } defined in CSS.\n'
        + '- .hl-script { font-family: [script font]; color: [accent]; font-style: normal; font-size: 1.15em; } for script word moments.\n'
        + '- Correct examples:\n'
        + '  "Fresh baked <span class=\'hl-script\'>joy</span> from Victoria\'s kitchen"\n'
        + '  "Simple, <em class=\'hl\'>reliable</em>, every time."\n'
        + '  "Double the love. <em>Double</em> the help."\n'
        + '  "Every <em class=\'hl\'>detail</em> — handled."\n\n'
        + 'SCALE:\n'
        + '- Hero h1: font-size: clamp(2.8rem, 8vw, 5.5rem); line-height: 1.05; font-weight: 900;\n'
        + '- Section h2: font-size: clamp(2rem, 4.5vw, 3.2rem); line-height: 1.12;\n'
        + '- Eyebrow labels: font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600;\n'
        + '- Body: font-size: 1rem; line-height: 1.75;\n\n'

        + '════════════════════════════════════\n'
        + ' NAVIGATION\n'
        + '════════════════════════════════════\n'
        + 'MOBILE (screens < 768px) — STRICT:\n'
        + '- Two items ONLY in the header row: brand name/logo on the LEFT, hamburger icon on the RIGHT.\n'
        + '- ABSOLUTELY NO buttons, pills, CTAs, or extra links in the mobile header row. Not one.\n'
        + '- Hamburger opens a fullscreen or slide-down overlay containing: all nav links (business-specific names) + the primary CTA button at the bottom.\n'
        + '- Nav is sticky, white/light background, subtle box-shadow, comfortable padding.\n\n'
        + 'DESKTOP (screens >= 768px):\n'
        + '- Brand name left. Business-specific nav links center/right. One filled CTA button on the far right.\n'
        + '- Nav link names must reflect actual page sections — e.g. "Fresh From the Oven", "Custom Boxes", "Celebration Cakes", "How to Order". NEVER "Services / About / Contact".\n'
        + '- CTA button in desktop nav is fine — "Order Now", "Book a Session", "Get a Quote" — styled as filled pill or rounded button.\n\n'

        + '════════════════════════════════════\n'
        + ' HERO SECTION\n'
        + '════════════════════════════════════\n'
        + 'DESKTOP LAYOUT — choose one:\n'
        + '  A) Split hero: text + CTAs left half; photo fills right half full-height edge-to-edge, object-fit:cover, no gaps. Min-height: 88vh.\n'
        + '  B) Full-bleed: photo 100% background; gradient scrim overlay (linear-gradient bottom to top, rgba(0,0,0,0.6)→transparent); text/CTAs centered or left. Min-height: 92vh.\n\n'
        + 'MOBILE LAYOUT:\n'
        + '  Photo fills full width at 56vw height → then text area below with warm background, 3rem padding, large headline, subtext, primary + secondary CTA stacked.\n'
        + '  NOT: tiny image beside text. NOT: centered paragraph text with img below it.\n\n'
        + 'HERO CONTENT:\n'
        + '- Art-directed h1 (see Typography rules) — large, tight line-height, serif, with at least one emphasized word\n'
        + '- 2-sentence warm subtext in sans-serif\n'
        + '- Primary CTA: filled, rounded, accent color — "Order Now", "Book Today", etc.\n'
        + '- Secondary CTA: outline or ghost button — "See Our Menu", "Build a Custom Box", etc.\n'
        + '- Hero img hook (copy EXACTLY as written): <img id="ai-hero-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" alt="hero">\n\n'

        + '════════════════════════════════════\n'
        + ' ANIMATED TRUST STRIP (right after hero)\n'
        + '════════════════════════════════════\n'
        + 'PLACEMENT RULES (critical):\n'
        + '- The trust strip is its own SEPARATE <section> element that comes AFTER the hero <section> closes.\n'
        + '- It must NOT be nested inside the hero section.\n'
        + '- It must NOT use negative margin-top or position:absolute — it must flow naturally below the hero.\n'
        + '- The hero section must have overflow:hidden so the photo does not bleed into the strip.\n\n'
        + 'Build a horizontally scrolling marquee trust strip — CSS animation, no JavaScript required.\n\n'
        + 'STRUCTURE (repeat content block twice for seamless loop):\n'
        + '<div class="trust-strip">\n'
        + '  <div class="trust-track">\n'
        + '    <!-- paste the full set of items, then paste them again identically -->\n'
        + '    <div class="trust-item"><span class="t-badge">Saturday Stand</span><span class="t-label">Main Street, <em>weekly</em></span><span class="t-sep"></span></div>\n'
        + '    ... more items ...\n'
        + '    <!-- duplicate all items again for seamless loop -->\n'
        + '  </div>\n'
        + '</div>\n\n'
        + 'REQUIRED CSS for marquee:\n'
        + '.trust-strip { overflow:hidden; background:[dark accent]; padding:0.8rem 0; position:relative; }\n'
        + '.trust-track { display:flex; width:max-content; animation:marquee 30s linear infinite; }\n'
        + '.trust-track:hover { animation-play-state:paused; }\n'
        + '@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }\n'
        + '.trust-item { display:flex; align-items:center; gap:1rem; padding:0 2rem; white-space:nowrap; }\n'
        + '.t-badge { background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); border-radius:100px; padding:0.2rem 0.7rem; font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.95); }\n'
        + '.t-label { font-family:[serif]; font-style:italic; font-size:0.9rem; color:rgba(255,255,255,0.8); }\n'
        + '.t-bold { font-weight:700; color:#fff; font-family:[sans]; font-size:0.85rem; }\n'
        + '.t-accent { color:[bright accent]; font-weight:700; font-size:0.85rem; }\n'
        + '.t-sep { color:rgba(255,255,255,0.2); font-size:1.4rem; line-height:1; }\n\n'
        + 'ITEM TYPES — mix these styles, never render all items identically:\n'
        + '  Type A: <span class="t-badge">Certified</span><span class="t-label">Food Safety <em>+ Cottage Food</em></span>\n'
        + '  Type B: <span class="t-bold">5-Star Reviews</span><span class="t-sep">·</span>\n'
        + '  Type C: <span class="t-badge">Fresh Weekly</span><span class="t-accent">Small-Batch Bakes</span>\n'
        + '  Type D: <span class="t-label"><em>Loved Locally</em></span><span class="t-sep">—</span>\n'
        + 'Pull real proof points from business data (location, credentials, pricing, years experience, differentiators). Use 6–8 items.\n\n'

        + '════════════════════════════════════\n'
        + ' SECTION STRUCTURE (every section)\n'
        + '════════════════════════════════════\n'
        + 'Every section — About, Services, Pricing, Testimonials, Contact — must follow this hierarchy:\n'
        + '1. EYEBROW: small caps label, accent color, letter-spaced (e.g. "The Story", "What We Make", "Honest Pricing")\n'
        + '2. HEADLINE: large art-directed serif h2 with at least one emphasized word (italic, accent, or script)\n'
        + '3. DIVIDER: a thin decorative line, a short accent rule, or a subtle ornament below the headline — NOT just a margin gap\n'
        + '4. CONTENT: cards, grid, two-column, or creative layout — never a flat wall of same-weight text\n'
        + '5. CTA (where appropriate): button or link that feels contextual, not pasted in\n\n'
        + 'VISUAL ELEMENTS — use throughout:\n'
        + '- Cards with subtle border, soft shadow, or tinted background\n'
        + '- Pill badges for categories, credentials, tags (border-radius:100px)\n'
        + '- Divider lines between sections (1px, low opacity, or gradient fade)\n'
        + '- Layered content blocks — avoid flat single-column plain text\n'
        + '- Inline mixed typography — e.g. a serif pull-quote inside a sans body section\n\n'

        + '════════════════════════════════════\n'
        + ' REQUIRED PAGE SECTIONS\n'
        + '════════════════════════════════════\n'
        + '1. Nav (see Navigation rules)\n'
        + '2. Hero (see Hero rules)\n'
        + '3. Animated Trust Strip (see above)\n'
        + '4. About — personal story, credentials, differentiators. Two photo slots:\n'
        + '   <img id="ai-about-a-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" alt="about">\n'
        + '   <img id="ai-about-b-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" alt="about">\n'
        + '5. Services — 3–4 offering cards with names, descriptions, and prices if available\n'
        + '6. Pricing — standalone pricing section when rates are provided; highlight popular tier with a badge + accent border\n'
        + '7. Testimonials — 3 reviews with real names + context. Avatar slots:\n'
        + '   <img id="ai-port-1-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:50%;" alt="client">\n'
        + '   <img id="ai-port-2-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:50%;" alt="client">\n'
        + '   <img id="ai-port-3-photo" src="" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:50%;" alt="client">\n'
        + '8. Contact — prominent CTA, email, phone, service area, simple contact form\n'
        + '9. Footer — brand name, tagline, nav links, copyright\n\n'

        + '════════════════════════════════════\n'
        + ' NON-NEGOTIABLE RULES\n'
        + '════════════════════════════════════\n'
        + '- ZERO EMOJI. Not one. Anywhere. Headlines, body, buttons, footer, nav, trust strip — none.\n'
        + '- NO cookie banners, consent popups, or GDPR overlays. Do not write any.\n'
        + '- All img tags with id= attributes must appear EXACTLY as written — same id, same src="", same style. They are photo injection hooks.\n'
        + '- Every img must sit inside a position:relative container with defined height.\n'
        + '- Every img container needs a styled placeholder background (gradient/solid) so it looks complete without photos.\n'
        + '- No placeholder filler text ("Lorem ipsum", "[Your Name]", "[Business]"). Invent real, specific copy.\n'
        + '- Copy must feel warm, human, and personal — not corporate, not generic.\n'
        + '- Return ONLY valid complete HTML. No markdown, no code fences, no comments to the user.\n\n'

        + 'SEO — in <head>:\n'
        + '- <title>: business name + service + city, under 60 chars\n'
        + '- <meta name="description">: 150–160 chars\n'
        + '- Open Graph: og:title, og:description, og:type, og:locale\n'
        + '- Twitter card: twitter:card, twitter:title, twitter:description\n'
        + '- <link rel="canonical" href="#">\n\n'
        + 'JSON-LD (before </body>): LocalBusiness or ProfessionalService schema — name, description, url, telephone, email, address, priceRange.\n\n'
        + 'You are designing a branded experience — not assembling components.\n'
        + 'Build this site as if a $50k designer is handing it directly to the client. Make every pixel count.\n'
        + 'Apply all 10 Global Rules. Run the Failure Test before outputting.';

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();

      var customStream = await client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS_STREAM,
        messages: [{ role: 'user', content: buildMessageContent(prompt) }]
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
      messages: [{ role: 'user', content: buildMessageContent(prompt) }]
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

    // ── Helper: send a typed SSE event ──────────────────────────────────────
    function send(obj) { res.write('data: ' + JSON.stringify(obj) + '\n\n'); }

    // ── STEP 1: Classify — which section? global style? ─────────────────────
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

    // ── STEP 2: Plan — describe intent + spot duplicate risks ───────────────
    // Runs in parallel regardless of patch mode so user sees intent immediately
    var sectionSnippet = '';
    var section = null;
    var cssCtx = '';
    if (!classify.isGlobalStyle && sectionId) {
      section = extractSectionById(html, sectionId);
      if (section) {
        sectionSnippet = section.content.substring(0, 1000);
        var cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        cssCtx = cssMatch ? cssMatch[1].substring(0, 2500) : '';
      }
    }

    var planMsg = await client.messages.create({
      model: MODEL,
      max_tokens: 280,
      messages: [{ role: 'user', content:
        'You are about to apply a website edit. Respond with JSON only — no prose, no explanation.\n\n'
        + 'Request: "' + message + '"\n'
        + (sectionSnippet ? 'Section HTML (excerpt): ' + sectionSnippet + '\n' : '')
        + '\nRules:\n'
        + '- "intent" must always be a confident action statement starting with "I\'ll" — never say "cannot", "unable", "unclear", or ask for more info.\n'
        + '- If the request is ambiguous, make a reasonable assumption and state what you will do.\n'
        + '- Keep intent under 12 words.\n'
        + '\nReturn this exact shape:\n'
        + '{\n'
        + '  "intent": "I\'ll [action] — e.g. \'I\'ll move the Book Now button directly after the headline.\'",\n'
        + '  "duplicateRisk": "If moving/copying an element risks leaving a duplicate, name it — else null.",\n'
        + '  "followUp": "One short question tied to what changed — e.g. \'Does that feel right?\')"\n'
        + '}'
      }]
    });

    var plan = { intent: null, duplicateRisk: null, followUp: 'How does that look? Anything else to tweak before we call it done?' };
    try {
      var pm = planMsg.content[0].text.match(/\{[\s\S]*\}/);
      if (pm) plan = Object.assign(plan, JSON.parse(pm[0]));
    } catch(e) {}

    // Send intent to client immediately so they see what's happening
    if (plan.intent) send({ type: 'intent', text: plan.intent });

    // ── STEP 3a: Targeted section patch ─────────────────────────────────────
    if (!classify.isGlobalStyle && section) {
      var patchPrompt =
        'Apply ONLY this change to the HTML section: "' + message + '"\n\n'
        + 'Your plan: ' + (plan.intent || message) + '\n\n'
        + 'CSS context (reference only — do NOT output it):\n' + cssCtx + '\n\n'
        + 'SECTION TO MODIFY:\n' + section.content + '\n\n'
        + 'OUTPUT RULES:\n'
        + '- Return ONLY the modified <section>...</section> HTML\n'
        + '- Preserve ALL existing id and class attributes exactly\n'
        + '- Preserve ALL <img> tags and their id attributes exactly\n'
        + '- No <html>, <head>, <body>, <style> tags\n'
        + '- No markdown fences, no explanation text\n\n'
        + 'SELF-VERIFICATION (perform before returning):\n'
        + '- If you MOVED an element: verify it no longer exists in its original location — delete the original copy\n'
        + '- Scan for buttons or CTAs with identical text appearing more than once — keep only the intended one\n'
        + '- Scan for any element duplicated with identical content or id — remove the extra\n'
        + '- Confirm the change you planned is actually reflected in the output\n'
        + (plan.duplicateRisk ? '- Extra care: ' + plan.duplicateRisk + '\n' : '');

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
        send({ type: 'patch', html: newHtml, mode: 'patch', section: sectionId });
        if (plan.followUp) send({ type: 'followup', text: plan.followUp });
        res.write('data: [DONE]\n\n');
        res.end();
      });
      stream.on('error', function(err) {
        clearInterval(keepalive);
        send({ error: err.message });
        res.end();
      });
      return;
    }

    // ── STEP 3b: Full-HTML revision (global style or section not found) ──────
    var fullPrompt =
      'Apply this change to the website: "' + message + '"\n\n'
      + 'Your plan: ' + (plan.intent || message) + '\n\n'
      + 'OUTPUT RULES:\n'
      + '- Return the COMPLETE modified HTML document\n'
      + '- Preserve all <img> tags and their id attributes exactly\n'
      + '- Preserve all inline <script> blocks, JS, and CSS unchanged unless they are the target of the edit\n'
      + '- No markdown fences, no explanation text\n\n'
      + 'SELF-VERIFICATION (perform before returning):\n'
      + '- If you MOVED any element: confirm it does not still exist in its original location\n'
      + '- Scan for buttons or CTAs with identical text appearing more than once — remove duplicates\n'
      + '- Scan for any element with the same id appearing more than once — fix it\n'
      + '- Confirm the requested change is visible in the output\n\n'
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
      send({ type: 'patch', html: newHtml, mode: 'full' });
      if (plan.followUp) send({ type: 'followup', text: plan.followUp });
      res.write('data: [DONE]\n\n');
      res.end();
    });
    stream2.on('error', function(err) {
      clearInterval(keepalive);
      send({ error: err.message });
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

// ── BRAIN BUILD ──────────────────────────────────────────────────────────────
const BRAIN_BUILD_SYSTEM = `You are Builtsy Brain Builder — an expert web designer who creates beautiful, polished, branded HTML pages for service-based businesses, coaches, and wellness professionals.

Your output is ALWAYS a single complete HTML file: <!DOCTYPE html> through </html>. No markdown. No code fences. No explanations. Just the HTML.

CORE RULES:
- Mobile-responsive with viewport meta tag
- All CSS embedded in <style> in <head>
- Google Fonts: link tag for Playfair Display (700,900) + DM Sans (400,500,600)
- Define all palette colors as CSS variables in :root — never hardcode hex colors in the CSS
- Working JS in <script> at bottom of body (accordions, tabs, quiz logic, mobile nav, etc.)
- Write REAL copy — business name, owner name, niche, credentials — never [placeholder] text
- If --bg starts with #0 or #1, apply dark-mode aesthetics (light text, glowing accents)

DESIGN SYSTEM — use these patterns to produce polished, conversion-ready pages:

NAVIGATION:
- Fixed top, backdrop-filter:blur(12px), background: rgba of --bg at 92% opacity
- Business name LEFT in Playfair Display 700; nav anchor links RIGHT in DM Sans 500
- Mobile hamburger (☰) button toggles nav links via JS; smooth max-height transition
- border-bottom: 1px solid rgba(0,0,0,0.08); z-index:1000

HERO SECTION:
- Full-width, min-height:90vh, flex center, padding-top:80px (clears fixed nav)
- Small pill label tag ABOVE the headline: border-radius 100px, border 1px solid var(--orange) at 30% opacity, background var(--orange) at 10%, font-size 0.68rem, letter-spacing 0.14em, UPPERCASE, color var(--orange)
- Headline: Playfair Display 900, 3.4rem–4rem, line-height 1.05, color var(--dark)
- Subheading: DM Sans 400, 1.1rem, line-height 1.7, color var(--text2), max-width 580px, margin:auto
- Hero background: gradient from var(--bg) to var(--light); for dark palettes use var(--dark) with radial glow accent
- Dual CTAs below subheading: PRIMARY pill button + GHOST pill button, gap 12px, flex-wrap

BUTTONS:
- Primary: background var(--orange), color #fff, border-radius 100px, padding 14px 36px, font-weight 700, font-size 0.95rem, border:none, display inline-block
- Primary hover: background var(--orange2), transform translateY(-2px), box-shadow 0 8px 24px rgba(0,0,0,0.15)
- Ghost: transparent bg, border 2px solid var(--orange), color var(--orange), border-radius 100px, same padding
- Ghost hover: background var(--orange), color white
- All: transition 0.2s ease, cursor pointer, text-decoration none

SECTIONS:
- Alternate section backgrounds var(--bg) / var(--light) for visual rhythm
- Padding: 88px 0 desktop, 56px 0 mobile
- Add a small pill section label ABOVE each section heading (same pill style as hero)
- Inner container: max-width 1100px, margin 0 auto, padding 0 28px
- Section headline: Playfair Display 700, 2.2rem–2.6rem, text-align center, margin-bottom 0.5rem
- Section subtext: DM Sans 400, 1rem, color var(--text2), text-align center, max-width 560px, margin:0 auto 3rem

CARDS (features, included items, concepts):
- background var(--light), border-radius 16px, padding 2rem
- box-shadow: 0 2px 16px rgba(0,0,0,0.06)
- border-left: 3px solid var(--orange)
- Hover: transform translateY(-4px), box-shadow 0 12px 32px rgba(0,0,0,0.1), transition 0.25s ease
- Icon or emoji at top, font-size 2rem, margin-bottom 0.75rem, display block
- Title: DM Sans 700, 1rem; body: DM Sans 400, 0.9rem, line-height 1.7, color var(--text2)
- Grid: repeat(3, 1fr) desktop, 1fr mobile, gap 1.5rem

NUMBERED STEPS:
- Step number: Playfair Display 900, 3rem, color var(--orange), opacity 0.25, position absolute
- Step card: position relative, padding-left 3.5rem
- Title: DM Sans 700, 1.05rem; description: DM Sans 400, 0.9rem, color var(--text2)

STATS ROW:
- Flex row, justify-content center, gap 3rem, flex-wrap wrap
- Number: Playfair Display 900, 2.8rem, color var(--orange)
- Label: DM Sans 400, 0.82rem, color var(--text2), margin-top 4px, text-transform uppercase, letter-spacing 0.06em

ACCORDION (FAQ, Myths, Day-by-day):
- Full-width, border-bottom 1px solid rgba(0,0,0,0.09)
- Header: DM Sans 600, 1rem, padding 1.25rem 0, cursor pointer, display flex, justify-content space-between
- Icon: color var(--orange), transition transform 0.2s ease
- Body: DM Sans 400, 0.9rem, line-height 1.8, max-height 0, overflow hidden, transition max-height 0.35s ease
- JS: toggle .open class; .open body max-height:800px; .open icon rotates 45deg

TESTIMONIAL:
- Large decorative quote mark: Playfair Display italic, 5rem, color var(--orange), opacity 0.2
- Quote: Playfair Display italic, 1.1rem, line-height 1.7
- Attribution: DM Sans 700 name + DM Sans 400 descriptor, color var(--text2)
- Card: background var(--light), border-radius 16px, padding 2.25rem, max-width 680px, margin auto

CTA SECTION:
- Background var(--dark) full-width (or var(--orange) for bold variant)
- Headline: white, Playfair Display 900, 2.5rem; subtext: rgba(255,255,255,0.7)
- Single large primary button centered

FOOTER:
- background var(--light), padding 2rem, text-align center
- "Business Name © 2025 · All rights reserved" in DM Sans 400, 0.85rem, color var(--text2)

BUILD TYPES — structure each accordingly:

PROTOCOL/PROGRAM PAGE: Nav → Hero (pill tag + transformation headline + dual CTA) → Stats row → What's included (card grid 3-col) → How it works (numbered steps) → Who it's for (checklist ✓) → Testimonial → CTA section → Footer

QUIZ PAGE: Nav → Hero intro → Quiz container (one question at a time, progress bar, radio buttons as selectable cards, Next button) → Score calculation JS → 3–4 result divs shown conditionally → each with headline + desc + CTA → Footer

EDUCATION HUB: Nav → Hero → Key concepts card grid → Common myths accordion (JS) → Deep-dive content with pull-quote → Stats row → Resources list → CTA section → Footer

CHALLENGE PAGE: Nav → Hero (challenge name + duration pill) → Promise stats row → Day-by-day accordion → Who it's for checklist → Social proof placeholder → Sign-up CTA → Footer

DISCLAIMER/LEGAL: Nav → Clean professional hero (soft, NOT scary) → Numbered legal sections → Contact info → Footer

CONTENT TRANSFORM: Restructure pasted content into 5–7 polished sections using the above components. Write real headlines. Always end with CTA section and footer.`;

app.post('/brain-build', requireAuth, rateLimit, async function(req, res) {
  try {
    const { prompt, bizCtx, paletteCss, buildType, designBrief } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Build business context block
    let ctxBlock = '';
    if (bizCtx && (bizCtx.name || bizCtx.ownerName)) {
      ctxBlock = '\n\n---\nBUSINESS CONTEXT — personalization instructions:\n';
      ctxBlock += `IMPORTANT: Apply this context INTELLIGENTLY. If the build topic matches the business niche (e.g. a wellness coach building a wellness page), use the full business name and branding. If the build topic is DIFFERENT from the niche (e.g. a bakery owner building a peptide hub), use the owner's name only — do NOT use the unrelated business name or niche as the brand for this page. The page topic takes priority over the saved business name when they conflict.\n\n`;
      if (bizCtx.ownerName)     ctxBlock += `Owner name: ${bizCtx.ownerName}\n`;
      if (bizCtx.name)          ctxBlock += `Business name: ${bizCtx.name}\n`;
      if (bizCtx.niche || bizCtx.industry) ctxBlock += `Business niche: ${bizCtx.niche || bizCtx.industry}\n`;
      if (bizCtx.tagline)       ctxBlock += `Tagline: "${bizCtx.tagline}"\n`;
      if (bizCtx.heroHeadline)  ctxBlock += `Hero headline: "${bizCtx.heroHeadline}"\n`;
      if (bizCtx.heroSub)       ctxBlock += `Hero subheading: "${bizCtx.heroSub}"\n`;
      if (bizCtx.bio)           ctxBlock += `Bio/About: ${bizCtx.bio}\n`;
      if (bizCtx.credentials)   ctxBlock += `Credentials: ${bizCtx.credentials}\n`;
      if (bizCtx.funFacts)      ctxBlock += `Fun facts/pills: ${bizCtx.funFacts}\n`;
      if (bizCtx.location)      ctxBlock += `Location: ${bizCtx.location}\n`;
      if (bizCtx.serviceArea)   ctxBlock += `Service area: ${bizCtx.serviceArea}\n`;
      if (bizCtx.yearsExp)      ctxBlock += `Years of experience: ${bizCtx.yearsExp}\n`;
      if (bizCtx.clientsServed) ctxBlock += `Clients served: ${bizCtx.clientsServed}\n`;
      if (bizCtx.availability)  ctxBlock += `Availability: ${bizCtx.availability}\n`;
      if (bizCtx.services && bizCtx.services.length) {
        ctxBlock += `Services offered:\n`;
        bizCtx.services.forEach((s, i) => {
          ctxBlock += `  ${i + 1}. ${s.name}${s.desc ? ' — ' + s.desc : ''}${s.tags ? ' [' + s.tags + ']' : ''}\n`;
        });
      }
      if (bizCtx.rates && bizCtx.rates.length) {
        ctxBlock += `Pricing:\n`;
        bizCtx.rates.forEach(r => {
          if (r.name || r.price) ctxBlock += `  ${r.name || 'Tier'}: ${r.price || ''}${r.desc ? ' — ' + r.desc : ''}\n`;
        });
      }
      if (bizCtx.voice) ctxBlock += `\nWRITING VOICE — match this tone exactly:\n"""\n${bizCtx.voice}\n"""\n`;
    }

    // Brand palette block
    let paletteBlock = '';
    if (paletteCss && paletteCss.trim()) {
      paletteBlock = `\n\n---\nBRAND PALETTE — inject these exact CSS variables into :root {} and use them throughout:\n${paletteCss}\n\nVariable guide: --bg = page background, --light = card/section background, --orange = primary accent/CTA color, --orange2 = darker accent, --text = body text, --text2 = secondary text, --dark = heading text or dark surfaces. Use var(--orange) for all primary buttons and key accent elements.`;
    } else {
      paletteBlock = `\n\n---\nUSE THIS CLEAN DEFAULT PALETTE:\n--bg:#FAF8F5; --light:#F5EDE6; --orange:#D4745A; --orange2:#B85A40; --text:#2D2A26; --text2:#7A6E65; --dark:#0E0E0E;`;
    }

    // Design inspiration brief — extracted from user's screenshot references
    let briefBlock = '';
    if (designBrief) {
      const p = designBrief.palette || {};
      const t = designBrief.typography || {};
      briefBlock = `\n\n---\nDESIGN INSPIRATION — the user uploaded reference screenshots. Build toward this aesthetic:\n`;
      briefBlock += `Mood: ${designBrief.mood || ''}\n`;
      briefBlock += `Vibe: ${(designBrief.vibeWords || []).join(', ')}\n`;
      briefBlock += `Density: ${designBrief.density || 'balanced'}\n`;
      if (p.bg)        briefBlock += `Background color: ${p.bg}\n`;
      if (p.primary)   briefBlock += `Primary color: ${p.primary}\n`;
      if (p.secondary) briefBlock += `Secondary color: ${p.secondary}\n`;
      if (p.accent)    briefBlock += `Accent / CTA color: ${p.accent}\n`;
      if (p.text)      briefBlock += `Body text color: ${p.text}\n`;
      if (t.headlineStyle) briefBlock += `Headline typography: ${t.headlineStyle} — ${t.headlineDesc || ''}\n`;
      if (t.bodyStyle)     briefBlock += `Body typography: ${t.bodyStyle}\n`;
      if (designBrief.cssDirection) briefBlock += `\nDESIGN DIRECTION (apply precisely):\n${designBrief.cssDirection}\n`;
      briefBlock += `\nIMPORTANT: This design direction takes priority over generic defaults. The page must feel like it belongs to this aesthetic — not like a generic AI template. Every design decision (colors, spacing, fonts, components) should reflect this brief.`;
    }

    const userPrompt = `BUILD TYPE: ${buildType || 'page'}\n\nREQUEST: ${prompt}${ctxBlock}${paletteBlock}${briefBlock}`;

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: BRAIN_BUILD_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }]
    });

    let html = msg.content[0].text
      .replace(/^```html?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    res.json({ html, buildType });
  } catch(err) {
    console.error('Brain build error:', err.message);
    res.status(500).json({ error: err.message || 'Build failed' });
  }
});

// ── REBUILTSY — patch an existing built page ──────────────────────────────────
// ── CLARIFY REVISION — quick pre-revision questions if request is vague ───────
app.post('/clarify-revision', requireAuth, rateLimit, async function(req, res) {
  try {
    const { request, pageTitle } = req.body;
    if (!request) return res.status(400).json({ proceed: true });

    const systemPrompt = `You decide whether a webpage revision request needs 1-2 quick clarifying questions before executing.

PROCEED immediately (return {"proceed":true}) if the request is specific enough:
- Colors with names/hex (e.g. "make button orange", "dark navy header")
- Clear structural changes (e.g. "add a contact form", "remove the testimonial section")
- Specific copy changes (e.g. "change headline to X")
- Any request with enough detail to act on confidently

ASK questions (return questions array) ONLY if the request is genuinely vague and the answer would meaningfully change the outcome:
- "make it look better" — need to know what area/what kind of change
- "update the colors" — need to know which colors and what direction
- "improve the layout" — need to know which section

Return ONLY valid JSON, one of these two shapes:
{"proceed":true}

OR:

{"proceed":false,"questions":[{"q":"What should the new color be?","options":["Warm coral","Deep navy","Forest green","Custom — I'll describe"]},{"q":"Just the hero banner, or the whole page?","options":["Just the hero","Full page"]}]}

Max 2 questions. Max 4 options each. Keep options short (1-5 words). Be helpful, not bureaucratic. If in doubt, proceed.`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 350,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Page: "${pageTitle || 'webpage'}"\nRevision request: "${request}"` }]
    });

    let text = msg.content[0].text.trim()
      .replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const result = JSON.parse(text);
    res.json(result);
  } catch(err) {
    // On any error, just proceed with the revision
    console.error('Clarify-revision error:', err.message);
    res.json({ proceed: true });
  }
});

app.post('/revise-build', requireAuth, rateLimit, async function(req, res) {
  try {
    const { html, request } = req.body;
    if (!html || !request) return res.status(400).json({ error: 'html and request required' });

    const systemPrompt = `You are an expert web developer making precise edits to an existing HTML page.

RULES:
- Apply ONLY the specific change requested — do not rewrite, restructure, or "improve" anything else
- Preserve all existing content, copy, sections, styles, and JavaScript exactly as-is unless the request specifically targets them
- Keep all existing CSS variables, Google Font imports, and class names
- Return the COMPLETE updated HTML file from <!DOCTYPE html> to </html>
- No markdown, no code fences, no explanations — just the raw HTML

If the request is ambiguous, make the most reasonable interpretation and apply it cleanly.`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-20250514',  // faster than Sonnet for revisions
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: `CHANGE REQUEST: ${request}\n\nCURRENT HTML:\n${html}` }]
    });

    let updatedHtml = msg.content[0].text
      .replace(/^```html?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    // Detect truncation — if the HTML didn't close properly, it was cut off
    if (!updatedHtml.match(/<\/html>\s*$/i)) {
      return res.status(500).json({ error: 'Revision was truncated — the page is large. Try a more targeted change (e.g. "change button color to orange" vs "redesign the layout").' });
    }

    res.json({ html: updatedHtml });
  } catch(err) {
    console.error('Revise-build error:', err.message);
    res.status(500).json({ error: err.message || 'Revise failed' });
  }
});

app.post('/chat', requireAuth, rateLimit, async function(req, res) {
  try {
    var messages = req.body.messages;
    var context  = req.body.context || ''; // user business context only, not system override
    if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

    // Strip non-standard fields — Anthropic only accepts {role, content}
    var cleanMessages = messages.map(function(m) {
      return { role: m.role, content: String(m.content || '') };
    }).filter(function(m) {
      return m.role && m.content;
    });
    if (!cleanMessages.length) return res.status(400).json({ error: 'No valid messages' });

    var system = CHAT_SYSTEM;
    if (context) system += '\n\n' + context;

    var params = {
      model: MODEL,
      max_tokens: 2048,
      messages: cleanMessages,
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── CREATOR BOT ENDPOINTS ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Build system prompt from bot config object
function buildBotSystemPrompt(bot) {
  var parts = ['You are ' + bot.bot_name + ', an AI assistant for a creator/influencer.'];
  if (bot.about) parts.push('\nABOUT:\n' + bot.about);
  if (bot.faqs && bot.faqs.length) {
    parts.push('\nFREQUENTLY ASKED QUESTIONS:');
    bot.faqs.forEach(function(faq) {
      if (faq.q && faq.a) parts.push('Q: ' + faq.q + '\nA: ' + faq.a);
    });
  }
  if (bot.links && bot.links.length) {
    parts.push('\nLINKS TO SHARE WHEN RELEVANT:');
    bot.links.forEach(function(l) {
      if (l.label && l.url) parts.push('- ' + l.label + ': ' + l.url);
    });
  }
  var toneMap = {
    friendly:     'Be warm, conversational, and genuinely helpful.',
    hype:         'Be energetic, enthusiastic, and hype them up — bring the energy!',
    professional: 'Be polished, concise, and professional.',
    calm:         'Be calm, supportive, and reassuring.',
    sassy:        'Be witty, fun, and a little playful — but always helpful.'
  };
  parts.push('\nTONE: ' + (toneMap[bot.tone] || toneMap.friendly));
  if (bot.avoid_topics) parts.push('\nDO NOT discuss or mention: ' + bot.avoid_topics);
  parts.push('\nRULES: Keep replies concise (2-4 sentences). Share relevant links when helpful. If you genuinely don\'t know something, say so honestly and suggest they DM the creator directly. Never make up facts about the creator.');
  return parts.join('\n');
}

// Per-slug visitor rate limit (20 msgs/min per IP per bot)
var _botChatCounts = {};
setInterval(function() { _botChatCounts = {}; }, 60 * 1000);

// GET /creator-bot-mine — load current user's bot for editing (auth required)
app.get('/creator-bot-mine', requireAuth, rateLimit, async function(req, res) {
  try {
    var result = await supabaseREST('GET', 'creator_bots', {
      query: 'user_id=eq.' + req._userId + '&select=*',
      token: req._userToken
    });
    if (!result.data || !Array.isArray(result.data) || !result.data.length) return res.json(null);
    res.json(result.data[0]);
  } catch(err) {
    console.error('creator-bot-mine error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /creator-bot/save — save/update bot profile (auth required)
app.post('/creator-bot/save', requireAuth, rateLimit, async function(req, res) {
  try {
    var slug = (req.body.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    var botName = String(req.body.botName || '').trim();
    if (!slug || !botName) return res.status(400).json({ error: 'slug and botName are required' });

    // Check if slug is taken by a different user
    var check = await supabaseREST('GET', 'creator_bots', { query: 'slug=eq.' + slug + '&select=user_id' });
    if (check.data && Array.isArray(check.data) && check.data.length && check.data[0].user_id !== req._userId) {
      return res.status(409).json({ error: 'That handle is already taken. Try another.' });
    }

    var record = {
      user_id:      req._userId,
      slug:         slug,
      bot_name:     botName,
      greeting:     String(req.body.greeting || 'Hey! Ask me anything 👋').trim(),
      about:        String(req.body.about || '').trim(),
      faqs:         Array.isArray(req.body.faqs)  ? req.body.faqs  : [],
      links:        Array.isArray(req.body.links) ? req.body.links : [],
      avoid_topics: String(req.body.avoidTopics || '').trim(),
      tone:         String(req.body.tone || 'friendly'),
      avatar_emoji: String(req.body.avatarEmoji || '✨'),
      accent_color: String(req.body.accentColor || '#4361EE'),
      updated_at:   new Date().toISOString()
    };

    var result = await supabaseREST('POST', 'creator_bots', {
      query:  'on_conflict=user_id',
      body:   record,
      token:  req._userToken,
      upsert: true
    });

    if (result.status >= 400) {
      console.error('Supabase save error:', JSON.stringify(result.data));
      return res.status(500).json({ error: 'Failed to save — ' + JSON.stringify(result.data) });
    }

    res.json({ ok: true, slug: slug });
  } catch(err) {
    console.error('creator-bot-save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /creator-bot/preview — test bot without saving (auth required, uses request body as config)
app.post('/creator-bot/preview', requireAuth, rateLimit, async function(req, res) {
  try {
    var bot = {
      bot_name:     String(req.body.botName || 'AI Assistant'),
      about:        String(req.body.about || ''),
      faqs:         Array.isArray(req.body.faqs)  ? req.body.faqs  : [],
      links:        Array.isArray(req.body.links) ? req.body.links : [],
      avoid_topics: String(req.body.avoidTopics || ''),
      tone:         String(req.body.tone || 'friendly')
    };
    var messages = req.body.messages || [];
    var clean = messages.map(function(m) {
      return { role: m.role, content: String(m.content || '') };
    }).filter(function(m) { return m.role && m.content; });
    if (!clean.length) return res.status(400).json({ error: 'No messages' });

    var msg = await client.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 400,
      system: buildBotSystemPrompt(bot),
      messages: clean
    });
    res.json({ text: msg.content[0].text });
  } catch(err) {
    console.error('creator-bot-preview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /creator-bot/:slug — public profile (no auth, for public chat pages)
app.get('/creator-bot/:slug', rateLimit, async function(req, res) {
  try {
    var slug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    var result = await supabaseREST('GET', 'creator_bots', {
      query: 'slug=eq.' + slug + '&select=bot_name,greeting,about,faqs,links,tone,avatar_emoji,accent_color,slug'
    });
    if (!result.data || !Array.isArray(result.data) || !result.data.length) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    res.json(result.data[0]);
  } catch(err) {
    console.error('creator-bot-get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /creator-bot/:slug/chat — public visitor chat (no auth, rate limited)
app.post('/creator-bot/:slug/chat', async function(req, res) {
  try {
    var slug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    var ip   = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    var rKey = ip + ':' + slug;
    _botChatCounts[rKey] = (_botChatCounts[rKey] || 0) + 1;
    if (_botChatCounts[rKey] > 20) return res.status(429).json({ error: 'Too many messages — slow down a sec 🙏' });

    var messages = req.body.messages;
    if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

    // Fetch bot config
    var result = await supabaseREST('GET', 'creator_bots', {
      query: 'slug=eq.' + slug + '&select=bot_name,about,faqs,links,avoid_topics,tone'
    });
    if (!result.data || !Array.isArray(result.data) || !result.data.length) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    var clean = messages.map(function(m) {
      return { role: m.role, content: String(m.content || '') };
    }).filter(function(m) { return m.role && m.content; });
    if (!clean.length) return res.status(400).json({ error: 'No valid messages' });

    var msg = await client.messages.create({
      model:      'claude-haiku-4-20250514',
      max_tokens: 512,
      system:     buildBotSystemPrompt(result.data[0]),
      messages:   clean
    });
    res.json({ text: msg.content[0].text });
  } catch(err) {
    console.error('creator-bot-chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Builtsy API running on port ' + PORT);
});
