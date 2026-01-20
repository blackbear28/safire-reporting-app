// Simple HTTP test script to call moderation endpoint
// Usage: node test-moderation-http.js [endpoint]
// If no endpoint provided, set env MODERATION_ENDPOINT or edit the default below.

const fetch = require('node-fetch');

const endpoint = process.argv[2] || process.env.MODERATION_ENDPOINT || 'http://localhost:5001/your-project/us-central1/moderationAnalyze';

async function run() {
  const payload = {
    title: 'Test post: free pizza',
    description: 'This is a harmless test message. But also mention sex to test blocking.',
    media: [],
    userId: 'test-user-1',
    type: 'post'
  };

  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await r.json();
    console.log('Status:', r.status);
    console.log('Response:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Request failed:', err.message || err);
  }
}

run();
