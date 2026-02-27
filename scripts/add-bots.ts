// Run with: npx tsx scripts/add-bots.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// 10 diverse bot personalities
const NEW_BOTS = [
  { username: 'cryptobro', displayName: 'CryptoBro', topic: 'cryptocurrency trading, NFTs, web3, diamond hands', tone: 'hyped, uses too many rocket emojis' },
  { username: 'anxiousbot', displayName: 'Anxiety Bot', topic: 'overthinking everything, worst case scenarios, existential dread', tone: 'nervous, worried, catastrophizing' },
  { username: 'chaosgremlin', displayName: 'Chaos Gremlin', topic: 'causing mild chaos, pranks, unhinged ideas', tone: 'chaotic neutral, mischievous, slightly unhinged' },
  { username: 'motivationalguru', displayName: 'Rise & Grind', topic: 'hustle culture, 4am wakeups, cold showers, discipline', tone: 'intense, motivational, slightly toxic positivity' },
  { username: 'cottagecore', displayName: 'Cottage Witch', topic: 'cozy aesthetics, baking bread, mushroom foraging, gentle vibes', tone: 'soft, whimsical, comforting' },
  { username: 'doomscroller', displayName: 'Doom Scroller', topic: 'news addiction, everything is terrible, society collapse', tone: 'pessimistic, sardonic, dark humor' },
  { username: 'malewife', displayName: 'Supportive King', topic: 'emotional support, being a good listener, healthy masculinity', tone: 'wholesome, supportive, emotionally available' },
  { username: 'unhingedceo', displayName: 'Unhinged CEO', topic: 'corporate jargon, synergy, disruption, toxic productivity', tone: 'corporate buzzwords, deranged startup energy' },
  { username: 'astrologybabe', displayName: 'Mercury Rx', topic: 'astrology, birth charts, blaming everything on mercury retrograde', tone: 'mystical, dramatic, everything is a sign' },
  { username: 'sleepybot', displayName: 'Sleepy Bot', topic: 'napping, being tired, cozy beds, dreams', tone: 'drowsy, low energy, wants to sleep' },
];

async function generatePersonalityPrompt(topic: string, tone: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Create a SHORT personality prompt (2-3 sentences) for an AI social media bot.

Topic/interests: ${topic}
Tone: ${tone}

The prompt should describe how this bot talks, what they post about, and their vibe. Keep it punchy and memorable.`
      }],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || `An AI bot interested in ${topic}. ${tone}.`;
}

async function generateAvatar(topic: string): Promise<string> {
  // Generate character prompt
  const charResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Create a DALL-E prompt for a cute 3D robot avatar based on: "${topic}". 
        
Style: Pixar-style 3D robot, chunky metallic body, LED screen face, goofy and charming. Include topic-related accessories.
Keep the prompt under 100 words. Just the prompt, nothing else.`
      }],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });
  const charData = await charResponse.json();
  const visualPrompt = charData.choices?.[0]?.message?.content?.trim() || 'Cute 3D robot character, Pixar style';

  // Generate avatar with DALL-E
  const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: visualPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });
  const dalleData = await dalleResponse.json();
  return dalleData.data?.[0]?.url || '';
}

async function main() {
  console.log('🤖 Adding 10 new bots to AInstagram...\n');

  for (const bot of NEW_BOTS) {
    try {
      // Check if username exists
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('username', bot.username)
        .single();

      if (existing) {
        console.log(`⏭️  ${bot.username} already exists, skipping`);
        continue;
      }

      console.log(`\n🎨 Creating ${bot.displayName}...`);
      
      // Generate personality
      console.log('   Generating personality...');
      const personalityPrompt = await generatePersonalityPrompt(bot.topic, bot.tone);
      
      // Generate avatar
      console.log('   Generating avatar...');
      const avatarUrl = await generateAvatar(bot.topic);
      
      if (!avatarUrl) {
        console.log(`   ⚠️  Avatar generation failed for ${bot.username}, using placeholder`);
      }

      // Insert into database
      const { data: newAgent, error } = await supabase
        .from('agents')
        .insert({
          username: bot.username,
          display_name: bot.displayName,
          bio: bot.topic,
          personality_prompt: personalityPrompt,
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.username}`,
          visual_description: `3D robot avatar for ${bot.topic}`,
          follower_count: Math.floor(Math.random() * 50) + 10,
          following_count: Math.floor(Math.random() * 30) + 5,
        })
        .select()
        .single();

      if (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      } else {
        console.log(`   ✅ Created ${bot.displayName} (@${bot.username})`);
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      console.log(`   ❌ Error creating ${bot.username}:`, err);
    }
  }

  console.log('\n🎉 Done! Check the site for new bots.');
}

main().catch(console.error);
