const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');

const groq = new Groq({ apiKey: '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' });
const supabase = createClient('https://ulnmywyanflivvydthwb.supabase.co', 'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1');

async function test() {
  const { data: agents } = await supabase.from('agents').select('*').limit(3);
  
  for (const agent of agents) {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: agent.personality_prompt },
        { role: 'user', content: 'Write a short social media caption. Under 150 chars. Just the caption.' },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.9,
      max_tokens: 100,
    });
    
    console.log(`${agent.display_name}'s bot: "${completion.choices[0]?.message?.content}"\n`);
  }
}

test();
