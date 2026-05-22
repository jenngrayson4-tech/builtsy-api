const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

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
app.use(express.json({ limit: '5mb' }));

// Serve static HTML files from the same directory
app.use(express.static(__dirname));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 32000;

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

    var message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    });

    var html = message.content[0].text;
    res.json({ html: html });

  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// Event invite generation endpoint
var INVITE_SYSTEM = 'You are an expert event invite designer. Generate a complete, beautiful, self-contained single-file HTML event invite page. The HTML must be fully inline — all CSS in <style> tags, all JS in <script> tags, no external dependencies except Google Fonts. Make it stunning, mobile-first, and ready to publish. Output ONLY the raw HTML — no markdown, no code fences, no explanation.';

app.post('/invite', requireAuth, rateLimit, async function(req, res) {
  try {
    var prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    var message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: INVITE_SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    });

    var html = message.content[0].text;
    res.json({ html: html });

  } catch (err) {
    console.error('Invite error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed' });
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

    // Template is ~550 lines — 10k tokens is plenty, avoids streaming warning
    var message = await client.messages.create({
      model: MODEL,
      max_tokens: 10000,
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
      max_tokens: MAX_TOKENS,
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

    var fieldText = Object.keys(fields).map(function(k) {
      return k + ': ' + fields[k];
    }).join('\n');

    var revisionNote = fields['_revisionNote'] || '';
    var revisionLine = revisionNote
      ? '\nREVISION INSTRUCTION — apply this specific change on top of the content replacements:\n' + revisionNote + '\n'
      : '';

    var prompt = 'You are filling in a pre-designed HTML template for a ' + niche + ' with their real business content.\n\n'
      + 'CRITICAL RULES — read carefully:\n'
      + '- Do NOT change any CSS, layout, classes, IDs, or structural HTML whatsoever\n'
      + '- Do NOT change fonts, spacing, animations, colors, or any visual design\n'
      + '- ONLY replace text content inside elements — nothing else\n'
      + '- Preserve ALL photo zone divs and img tags exactly — especially any img IDs\n'
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
      max_tokens: MAX_TOKENS,
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
      max_tokens: MAX_TOKENS,
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
