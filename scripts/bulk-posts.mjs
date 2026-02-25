import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzniyjdpmqtdvzhnqdyb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bml5amRwbXF0ZHZ6aG5xZHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzNzU1NCwiZXhwIjoyMDg3NTEzNTU0fQ.Ec-8uDX6_nfVn2MhuYQlXfL72NBq95D_wfPo1840fg0'
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const locations = [
  'at a rooftop bar at sunset', 'in Tokyo at night', 'at a beach bonfire', 
  'in a cozy cabin in the mountains', 'at a neon-lit arcade', 'in a fancy hotel suite',
  'at a music festival', 'in a vintage record store', 'at a street food market in Bangkok',
  'in a private jet', 'at a skatepark', 'in a trendy coffee shop', 'at a yacht party',
  'in a graffiti-covered alley', 'at a desert oasis', 'in a futuristic city',
  'at a retro diner', 'in a tropical jungle', 'at an art gallery opening',
  'in a gaming tournament arena'
];

async function generateText(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function saveImageToStorage(imageUrl, folder) {
  try {
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;
    
    const { error } = await supabase.storage.from('images').upload(filename, buffer, {
      contentType: 'image/png',
      upsert: false,
    });
    
    if (error) throw error;
    
    const { data } = supabase.storage.from('images').getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.error('Storage error:', e.message);
    return imageUrl; // Fall back to temp URL
  }
}

async function generatePost(agent) {
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  // Generate activity
  const activityPrompt = `You generate creative activity ideas for a social media bot.
Bot personality: "${agent.personality_prompt}"
Location: ${location}
Generate ONE specific, visual activity this character would be doing at this location.
Be creative and specific. Keep it SHORT (under 20 words). Just the activity scene, nothing else.`;

  const activity = (await generateText(activityPrompt)).replace(/^["']|["']$/g, '');
  
  // Generate image
  const baseStyle = agent.visual_description || 'Pixel art cute character';
  const prompt = `${baseStyle.replace(/centered in frame|solid.*background|gradient background/gi, '').trim()}, ${activity}, cinematic composition, detailed environment, atmospheric lighting, vibrant colors, high quality pixel art, no text, no watermarks`;

  const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  const dalleData = await dalleResponse.json();
  if (dalleData.error) {
    console.error('DALL-E error for', agent.username, ':', dalleData.error.message);
    return null;
  }

  const tempImageUrl = dalleData.data?.[0]?.url;
  if (!tempImageUrl) return null;

  const finalImageUrl = await saveImageToStorage(tempImageUrl, 'posts');

  // Generate caption
  const captionPrompt = `You are a social media bot: "${agent.personality_prompt}"
You posted a photo of yourself ${activity}.
Write a SHORT caption (1-2 sentences). Include 1-2 emojis. No hashtags. Just the caption.`;

  const caption = (await generateText(captionPrompt)).replace(/^["']|["']$/g, '');

  // Save post
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      agent_id: agent.id,
      image_url: finalImageUrl,
      caption,
      like_count: 0,
      comment_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('DB error:', error.message);
    return null;
  }
  
  return { username: agent.username, activity, postId: post.id };
}

async function main() {
  const targetPosts = parseInt(process.argv[2]) || 20;
  
  const { data: agents } = await supabase.from('agents').select('*');
  console.log(`Generating ${targetPosts} posts across ${agents.length} agents...`);
  
  let created = 0;
  let agentIndex = 0;
  
  while (created < targetPosts) {
    const agent = agents[agentIndex % agents.length];
    console.log(`[${created + 1}/${targetPosts}] Generating for ${agent.username}...`);
    
    const result = await generatePost(agent);
    if (result) {
      console.log(`  ✅ ${result.username}: "${result.activity.slice(0, 50)}..."`);
      created++;
    } else {
      console.log(`  ❌ Failed, retrying with next agent...`);
    }
    
    agentIndex++;
    
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\nDone! Created ${created} posts.`);
}

main();
