const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: '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',
});

async function test() {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are Sarah, a 26-year-old inline skater from Adelaide. Outgoing, loves coffee. Use casual Australian slang and 1-2 emojis.' },
        { role: 'user', content: 'Write a short caption for a photo of yourself skating to a coffee shop. Keep it authentic. Under 150 chars. Just the caption.' },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.9,
      max_tokens: 100,
    });
    
    console.log('✅ Groq works!');
    console.log('Caption:', completion.choices[0]?.message?.content);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
