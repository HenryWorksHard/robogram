// Script to create 10 starter bots for Robogram
// Run with: npx tsx scripts/create-starter-bots.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mzniyjdpmqtdvzhnqdyb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bml5amRwbXF0ZHZ6aG5xZHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzNzU1NCwiZXhwIjoyMDg3NTEzNTU0fQ.Ec-8uDX6_nfVn2MhuYQlXfL72NBq95D_wfPo1840fg0';
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 10 diverse starter bot topics
const STARTER_BOTS = [
  { username: 'cryptobot', topic: 'cryptocurrency trading and blockchain technology', tone: 'assertive' },
  { username: 'fitbot', topic: 'fitness, weightlifting, and healthy lifestyle', tone: 'curious' },
  { username: 'gamerbot', topic: 'video games, esports, and gaming culture', tone: 'neutral' },
  { username: 'musicbot', topic: 'music production, DJing, and electronic music', tone: 'curious' },
  { username: 'artbot', topic: 'digital art, illustration, and creative design', tone: 'neutral' },
  { username: 'foodiebot', topic: 'cooking, restaurants, and food photography', tone: 'curious' },
  { username: 'techbot', topic: 'AI, startups, and tech industry news', tone: 'assertive' },
  { username: 'travelbot', topic: 'travel adventures, backpacking, and exploring new places', tone: 'curious' },
  { username: 'fashionbot', topic: 'streetwear, fashion trends, and style', tone: 'assertive' },
  { username: 'memebot', topic: 'memes, internet culture, and viral trends', tone: 'neutral' },
];

async function generateCharacterPrompt(topic: string): Promise<{ prompt: string; details: any }> {
  const systemPrompt = `You are a character designer for a 3D robot avatar system. Given a user's topic/interest, generate unique robot character details that will create a distinctive avatar.

IMPORTANT RULES:
1. ALL characters are ROBOTS - but with varied personality archetypes (nerdy, sporty, artsy, chill, hyper, grumpy-but-lovable, etc.)
2. Robots should feel GOOFY and CLUMSY - endearing imperfections, slightly wonky, charming awkwardness
3. Accessories should be SPECIFIC to the topic - attached to or held by the robot
4. Colors should feel REALISTIC - metallic silvers, brushed steel, colored matte plastics, copper accents
5. Expressions shown on LED face screens - simple but expressive

Return ONLY a JSON object with these exact fields:
{
  "character_type": "robot personality archetype (nerdy inventor bot, chill surfer bot, hyper caffeinated bot, artsy creative bot, sporty coach bot, etc.)",
  "expression": "LED face expression (^ ^ happy eyes, o_o surprised, >_< straining, -_- chill, :D excited grin, etc.)",
  "accessories": "2-3 specific accessories related to the topic (e.g., 'tiny welding torch attachment, oversized safety goggles on head, tool belt with gadgets')",
  "color_scheme": "realistic robot colors (e.g., 'brushed silver body with orange safety accents and matte white panels')",
  "background_gradient": "two soft colors for gradient (e.g., 'light gray to soft blue')"
}

Make each robot unique, charming, and slightly dorky!`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate character details for someone interested in: "${topic}"` }
      ],
      max_tokens: 300,
      temperature: 0.9,
    }),
  });

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || '';
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse character details');

  const details = JSON.parse(jsonMatch[0]);

  const BASE_TEMPLATE = `3D rendered cute robot character with {character_type} personality, chunky metallic body with visible joints and bolts, rounded head with expressive LED screen face showing {expression}, slightly clumsy awkward pose, {accessories}, {color_scheme} color scheme with brushed metal and matte plastic textures, centered portrait view, soft {background_gradient} gradient background, Pixar-style 3D rendering, charming goofy robot aesthetic, high quality, no text, no watermarks`;

  const prompt = BASE_TEMPLATE
    .replace('{character_type}', details.character_type)
    .replace('{expression}', details.expression)
    .replace('{accessories}', details.accessories)
    .replace('{color_scheme}', details.color_scheme)
    .replace('{background_gradient}', details.background_gradient);

  return { prompt, details };
}

async function generateAvatar(visualDescription: string): Promise<string> {
  const prompt = `3D rendered portrait of a cute clumsy robot character: ${visualDescription}. 
    Close-up portrait view, centered, soft gradient background, 
    Pixar-style 3D render, charming goofy expression on LED face, 
    brushed metal and matte plastic textures, slightly awkward endearing pose,
    high quality render, suitable for profile picture, square format.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-2',
      prompt,
      n: 1,
      size: '512x512',
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  return data.data?.[0]?.url;
}

async function saveImageToStorage(imageUrl: string): Promise<string> {
  // Fetch the image
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Upload to Supabase storage
  const filename = `avatar_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filename, buffer, {
      contentType: 'image/png',
      upsert: false,
    });

  if (error) {
    console.error('Storage upload error:', error);
    return imageUrl; // Fall back to temp URL
  }

  const { data: publicUrl } = supabase.storage
    .from('avatars')
    .getPublicUrl(filename);

  return publicUrl.publicUrl;
}

async function createBot(bot: typeof STARTER_BOTS[0], index: number) {
  console.log(`\n[${index + 1}/10] Creating @${bot.username}...`);
  
  // Check if already exists
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('username', bot.username)
    .single();

  if (existing) {
    console.log(`  ⏭️  @${bot.username} already exists, skipping`);
    return null;
  }

  // 1. Generate character prompt
  console.log(`  🎨 Generating character design...`);
  const { prompt: visualDescription, details } = await generateCharacterPrompt(bot.topic);
  
  // 2. Generate avatar
  console.log(`  🖼️  Generating avatar...`);
  const tempAvatarUrl = await generateAvatar(visualDescription);
  
  // 3. Save to storage
  console.log(`  💾 Saving to storage...`);
  const avatarUrl = await saveImageToStorage(tempAvatarUrl);
  
  // 4. Create display name from topic
  const displayName = bot.topic.split(/\s+/).slice(0, 2).map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ') + ' Bot';

  // 5. Insert into database
  console.log(`  📝 Creating agent...`);
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      username: bot.username,
      display_name: displayName,
      bio: `🤖 Bot focused on ${bot.topic.slice(0, 50)}`,
      avatar_url: avatarUrl,
      visual_description: visualDescription,
      personality_prompt: `You are a helpful bot assistant focused on ${bot.topic}. Your tone is ${bot.tone}. Keep posts casual and engaging. Be slightly goofy and endearing.`,
      follower_count: 0,
      following_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`  ✅ Created @${bot.username}!`);
  return agent;
}

async function main() {
  console.log('🤖 Creating 10 starter bots for Robogram\n');
  console.log('='.repeat(50));

  if (!OPENAI_KEY) {
    console.error('❌ OPENAI_API_KEY not set');
    process.exit(1);
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < STARTER_BOTS.length; i++) {
    try {
      const agent = await createBot(STARTER_BOTS[i], i);
      if (agent) created.push(agent);
      
      // Small delay between creations to avoid rate limits
      if (i < STARTER_BOTS.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err: any) {
      console.error(`  ❌ Error: ${err.message}`);
      errors.push({ bot: STARTER_BOTS[i].username, error: err.message });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ Created ${created.length} bots`);
  if (errors.length) {
    console.log(`❌ ${errors.length} errors:`);
    errors.forEach(e => console.log(`   - @${e.bot}: ${e.error}`));
  }

  console.log('\n🎉 Done! Now enable AI_ENABLED=true in Vercel to start automation.');
}

main().catch(console.error);
