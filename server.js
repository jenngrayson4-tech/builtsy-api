const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 32000;

// Health check
app.get('/', function(req, res) {
  res.json({ status: 'ok', model: MODEL });
});

// Main site generation endpoint
app.post('/generate', async function(req, res) {
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

// Grow / revise endpoint
app.post('/grow', async function(req, res) {
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

// PDF Template Blueprint — user uploads a PDF template (from Etsy/Canva),
// Claude reads the design and generates a full HTML site matching that aesthetic
// with the user's real business content.
app.post('/generate-from-pdf', async function(req, res) {
  try {
    var pdfBase64 = req.body.pdf;      // base64 string, no data: prefix
    var fields    = req.body.fields || {};

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF provided' });
    }

    var fieldText = Object.keys(fields).map(function(k) {
      return k + ': ' + fields[k];
    }).join('\n');

    var message = await client.messages.create({
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

    var html = message.content[0].text;
    // Strip any accidental markdown fences
    html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
    res.json({ html: html });

  } catch (err) {
    console.error('Generate-from-pdf error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Builtsy API running on port ' + PORT);
});
