const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const messages = body.messages;
    const system = body.system || '';

    if (!messages || !messages.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No messages provided' }) };
    }

    // Strip non-standard fields — Anthropic only accepts {role, content}
    const cleanMessages = messages
      .map(m => ({ role: m.role, content: String(m.content || '') }))
      .filter(m => m.role && m.content);

    if (!cleanMessages.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No valid messages' }) };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Caller can request a lower limit (e.g. 120 for short bot replies)
    const maxTokens = Math.min(body.max_tokens || 300, 1024);

    // Use Haiku for simple tasks (e.g. chip generation) — ~3x cheaper
    const model = body.use_haiku
      ? 'claude-haiku-4-5'
      : 'claude-sonnet-4-6';

    const params = {
      model,
      max_tokens: maxTokens,
      messages: cleanMessages
    };

    // Prompt caching: system prompt is identical across all turns in a session,
    // so cache it — after the first call, repeat tokens cost ~10% of normal
    if (system) {
      params.system = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
    }

    const msg = await client.messages.create(params);
    const text = msg.content[0].text;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ text })
    };
  } catch(e) {
    console.error('Chat error:', e.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
