const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { description } = JSON.parse(event.body || '{}');
    if (!description) return { statusCode: 400, body: JSON.stringify({ error: 'No description' }) };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `You are helping configure a website builder. Based on this business description, return ONLY valid JSON (no markdown, no explanation):

Description: "${description}"

Return this exact JSON structure:
{
  "industry": "short-slug like caretaker or social-media-manager or music-teacher or photographer etc",
  "industryLabel": "Friendly label like Music Teacher",
  "recommendedTemplates": ["up to 3 template ids from this list only: social-media-bubbly, social-media-cherry, social-media-manager-site, caretaker-warm, caretaker-bright, caretaker-clean — pick whichever visually suit their work best"],
  "taglineChips": ["6 short punchy tagline suggestions specific to their exact business"],
  "headlineChips": ["6 hero headline suggestions, varied tone, specific to their business"],
  "heroSubChips": ["4 hero subheading options (2 sentences each) — who they help and what they offer, specific to this business"],
  "credentialChips": ["6 relevant credentials, certifications, or trust signals for their field"],
  "incomeCalcType": "per_session or per_client or hourly",
  "incomeCalcLabel": "per session or per client or per hour",
  "suggestedTools": ["subset of: calendly, faq, sms, forms, testimonials — whichever make sense for their business"],
  "serviceSuggestions": [
    {"name": "Service 1 name specific to their business", "desc": "1-2 sentence description of this service", "tags": ["Tag1", "Tag2", "Tag3"]},
    {"name": "Service 2 name", "desc": "1-2 sentence description", "tags": ["Tag1", "Tag2", "Tag3"]},
    {"name": "Service 3 name", "desc": "1-2 sentence description", "tags": ["Tag1", "Tag2", "Tag3"]},
    {"name": "Service 4 name", "desc": "1-2 sentence description", "tags": ["Tag1", "Tag2", "Tag3"]}
  ]
}`
      }]
    });

    const config = JSON.parse(msg.content[0].text.trim());
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(config)
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
