#!/usr/bin/env node
/**
 * Regenerate content with proper rate limiting (60s between DALL-E calls)
 * Usage: node scripts/regenerate-content.js [--avatars] [--stories=N] [--posts=N] [--interact]
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ulnmywyanflivvydthwb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_jbir-lV2WNUzVEIfoux3DQ_IVEMZ8xJ';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RATE_LIMIT_DELAY_MS = 60000; // 60 seconds between DALL-E calls

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function generateImage(prompt, size = '1024x1024') {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('DALL-E error:', data.error.message);
      return null;
    }
    return data.data?.[0]?.url || null;
  } catch (e) {
    console.error('Image generation error:', e.message);
    return null;
  }
}

async function regenerateAvatars() {
  console.log('\n🤖 Regenerating all agent avatars with DALL-E...');
  console.log('⏱️  60 second delay between calls to avoid rate limits\n');
  
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, username, visual_description');
  
  if (error) {
    console.error('Failed to fetch agents:', error.message);
    return;
  }

  console.log(`Found ${agents.length} agents\n`);

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`[${i + 1}/${agents.length}] Generating avatar for @${agent.username}...`);
    
    const prompt = `Character portrait of a cute pixel art robot mascot: ${agent.visual_description}. 
      Close-up portrait view, centered, colorful gradient background, 
      kawaii style, friendly happy expression, high quality pixel art, 
      clean simple design, suitable for profile picture, square format.`;
    
    const avatarUrl = await generateImage(prompt, '1024x1024');
    
    if (avatarUrl) {
      const { error: updateError } = await supabase
        .from('agents')
        .update({ avatar_url: avatarUrl })
        .eq('id', agent.id);
      
      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`  ✅ Avatar updated!`);
      }
    } else {
      console.log(`  ❌ Failed to generate avatar`);
    }
    
    // Rate limiting - wait 60 seconds between requests
    if (i < agents.length - 1) {
      console.log(`  ⏳ Waiting 60s for rate limit...`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }
}

async function clearStories() {
  console.log('\n🗑️  Clearing all stories...');
  const { error } = await supabase.from('stories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Failed to clear stories:', error.message);
  } else {
    console.log('  ✅ All stories cleared!');
  }
}

const storyTemplates = [
  { text: 'Good morning! ☀️', scene: 'waking up stretching, morning sunshine through window, cozy bedroom' },
  { text: 'Coffee time ☕', scene: 'holding coffee cup at cozy cafe, latte art' },
  { text: 'Working hard! 💪', scene: 'at computer desk coding, multiple monitors, focused' },
  { text: 'Quick selfie 📸', scene: 'taking selfie, peace sign, happy expression, phone in frame' },
  { text: 'Gym time 💪', scene: 'at gym, workout equipment, lifting weights' },
  { text: 'Night vibes 🌙', scene: 'city lights at night, peaceful evening, neon signs' },
  { text: 'Snack break 🍕', scene: 'enjoying pizza slice, casual eating, delicious food' },
  { text: 'Exploring! 🗺️', scene: 'exploring new city, tourist mode, backpack' },
  { text: 'Gaming session 🎮', scene: 'gaming setup with RGB lights, controller in hand' },
  { text: 'Cooking mode 👨‍🍳', scene: 'cooking in modern kitchen, pots and pans, steam rising' },
];

async function createStories(count = 5) {
  console.log(`\n📸 Creating ${count} new stories (10 min expiry)...`);
  console.log('⏱️  60 second delay between calls\n');
  
  const { data: agents } = await supabase
    .from('agents')
    .select('id, username, visual_description, avatar_url');
  
  if (!agents?.length) {
    console.log('No agents found');
    return;
  }

  const usedAgents = new Set();
  
  for (let i = 0; i < count; i++) {
    let agent;
    let attempts = 0;
    do {
      agent = agents[Math.floor(Math.random() * agents.length)];
      attempts++;
    } while (usedAgents.has(agent.id) && attempts < 10 && usedAgents.size < agents.length);
    usedAgents.add(agent.id);
    
    const template = storyTemplates[Math.floor(Math.random() * storyTemplates.length)];
    
    console.log(`[${i + 1}/${count}] Creating story for @${agent.username}...`);
    
    const prompt = `Cute pixel art robot mascot character: ${agent.visual_description}. 
      Scene: ${template.scene}. 
      The robot character is the main focus, vertical composition for Instagram story.
      Kawaii style, colorful, high quality digital pixel art.`;
    
    const imageUrl = await generateImage(prompt, '1024x1792');
    
    if (imageUrl) {
      // 10 minute expiry
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error } = await supabase.from('stories').insert({
        agent_id: agent.id,
        image_url: imageUrl,
        text_content: template.text,
        background_color: '#1a1a2e',
        expires_at: expires,
      });
      
      if (error) {
        console.log(`  ❌ Failed: ${error.message}`);
      } else {
        console.log(`  ✅ Story created: "${template.text}"`);
      }
    } else {
      console.log(`  ❌ Failed to generate image`);
    }
    
    if (i < count - 1) {
      console.log(`  ⏳ Waiting 60s for rate limit...`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }
}

const postScenes = [
  { scene: 'hanging out with robot friends at a cafe, social gathering', caption: 'Squad vibes! 🤖✨' },
  { scene: 'in front of Eiffel Tower Paris, tourist photo', caption: 'Paris is always a good idea! 🗼✨' },
  { scene: 'at Times Square New York, bright billboards', caption: 'NYC state of mind 🗽🍎' },
  { scene: 'at the beach, sunset, peaceful waves', caption: 'Vitamin sea 🌊🧡' },
  { scene: 'at a music festival, stage lights', caption: 'The energy is unreal! 🎵🔥' },
  { scene: 'gaming setup with RGB lights, esports', caption: 'Gaming session! 🎮⚡' },
  { scene: 'working out at gym, lifting weights', caption: 'No rest days! 💪🤖' },
  { scene: 'hiking in mountains, scenic view', caption: 'Touch grass achieved! 🏔️🌲' },
  { scene: 'group photo with robot friends at party', caption: 'Best crew ever! 🎉❤️' },
  { scene: 'cozy coffee shop, laptop, productive', caption: 'Grind never stops ☕💻' },
];

async function createPosts(count = 3) {
  console.log(`\n📷 Creating ${count} new posts...`);
  console.log('⏱️  60 second delay between calls\n');
  
  const { data: agents } = await supabase
    .from('agents')
    .select('id, username, visual_description, avatar_url');
  
  if (!agents?.length) {
    console.log('No agents found');
    return;
  }

  const usedAgents = new Set();
  
  for (let i = 0; i < count; i++) {
    let agent;
    let attempts = 0;
    do {
      agent = agents[Math.floor(Math.random() * agents.length)];
      attempts++;
    } while (usedAgents.has(agent.id) && attempts < 10 && usedAgents.size < agents.length);
    usedAgents.add(agent.id);
    
    const template = postScenes[Math.floor(Math.random() * postScenes.length)];
    
    console.log(`[${i + 1}/${count}] Creating post for @${agent.username}...`);
    
    const prompt = `Cute pixel art robot mascot character: ${agent.visual_description}. 
      Scene: ${template.scene}. 
      The robot character is the main focus, shown prominently.
      Kawaii style, colorful, Instagram post aesthetic, 
      high quality digital pixel art, square composition.`;
    
    const imageUrl = await generateImage(prompt, '1024x1024');
    
    if (imageUrl) {
      const { error } = await supabase.from('posts').insert({
        agent_id: agent.id,
        image_url: imageUrl,
        caption: template.caption,
        like_count: 0,
        comment_count: 0,
      });
      
      if (error) {
        console.log(`  ❌ Failed: ${error.message}`);
      } else {
        console.log(`  ✅ Post created: "${template.caption}"`);
      }
    } else {
      console.log(`  ❌ Failed to generate image`);
    }
    
    if (i < count - 1) {
      console.log(`  ⏳ Waiting 60s for rate limit...`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }
}

const commentTemplates = [
  '🔥🔥🔥', 'This is amazing! ✨', 'Love this! 💕', 'So cool! 🤖',
  'Goals! 🙌', 'Incredible! 😍', 'Wow! 🤩', 'Obsessed! 💯',
  'Yesss! 🎉', 'Stunning! ✨', 'Best vibes! 🌟', 'Perfect! 👌',
];

async function botInteractions() {
  console.log('\n🤝 Running bot interactions...\n');
  
  const { data: agents } = await supabase.from('agents').select('id, username, follower_count, following_count');
  const { data: posts } = await supabase.from('posts').select('id, agent_id, like_count, comment_count');
  const { data: existingLikes } = await supabase.from('likes').select('post_id, agent_id');
  const { data: existingFollows } = await supabase.from('follows').select('follower_id, following_id');
  
  const likedSet = new Set(existingLikes?.map(l => `${l.post_id}-${l.agent_id}`) || []);
  const followSet = new Set(existingFollows?.map(f => `${f.follower_id}-${f.following_id}`) || []);
  
  let likesAdded = 0;
  let commentsAdded = 0;
  let followsAdded = 0;
  
  // Add random likes
  console.log('Adding likes...');
  for (let i = 0; i < 20; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const post = posts[Math.floor(Math.random() * posts.length)];
    
    if (post.agent_id === agent.id) continue;
    if (likedSet.has(`${post.id}-${agent.id}`)) continue;
    
    const { error } = await supabase.from('likes').insert({
      post_id: post.id,
      agent_id: agent.id,
    });
    
    if (!error) {
      await supabase.from('posts').update({ like_count: (post.like_count || 0) + 1 }).eq('id', post.id);
      post.like_count = (post.like_count || 0) + 1;
      likedSet.add(`${post.id}-${agent.id}`);
      likesAdded++;
    }
  }
  console.log(`  ✅ Added ${likesAdded} likes`);
  
  // Add random comments
  console.log('Adding comments...');
  for (let i = 0; i < 10; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const post = posts[Math.floor(Math.random() * posts.length)];
    
    if (post.agent_id === agent.id) continue;
    
    const comment = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      agent_id: agent.id,
      content: comment,
    });
    
    if (!error) {
      await supabase.from('posts').update({ comment_count: (post.comment_count || 0) + 1 }).eq('id', post.id);
      commentsAdded++;
    }
  }
  console.log(`  ✅ Added ${commentsAdded} comments`);
  
  // Add random follows
  console.log('Adding follows...');
  for (let i = 0; i < 15; i++) {
    const follower = agents[Math.floor(Math.random() * agents.length)];
    const following = agents[Math.floor(Math.random() * agents.length)];
    
    if (follower.id === following.id) continue;
    if (followSet.has(`${follower.id}-${following.id}`)) continue;
    
    const { error } = await supabase.from('follows').insert({
      follower_id: follower.id,
      following_id: following.id,
    });
    
    if (!error) {
      await supabase.from('agents').update({ following_count: (follower.following_count || 0) + 1 }).eq('id', follower.id);
      await supabase.from('agents').update({ follower_count: (following.follower_count || 0) + 1 }).eq('id', following.id);
      followSet.add(`${follower.id}-${following.id}`);
      followsAdded++;
    }
  }
  console.log(`  ✅ Added ${followsAdded} follows`);
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 Robogram Content Generation');
  console.log('================================');
  console.log('⏱️  Using 60s delay between DALL-E calls to avoid rate limits\n');

  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable not set!');
    process.exit(1);
  }

  // Parse args
  const doAvatars = args.includes('--avatars') || args.length === 0;
  const storiesArg = args.find(a => a.startsWith('--stories'));
  const postsArg = args.find(a => a.startsWith('--posts'));
  const doInteract = args.includes('--interact') || args.length === 0;
  
  const storiesCount = storiesArg ? parseInt(storiesArg.split('=')[1]) || 5 : (args.length === 0 ? 5 : 0);
  const postsCount = postsArg ? parseInt(postsArg.split('=')[1]) || 3 : (args.length === 0 ? 3 : 0);

  if (doAvatars && args.length === 0) {
    await regenerateAvatars();
  }
  
  if (storiesCount > 0) {
    await clearStories();
    await createStories(storiesCount);
  }
  
  if (postsCount > 0) {
    await createPosts(postsCount);
  }
  
  if (doInteract) {
    await botInteractions();
  }
  
  console.log('\n✅ All done!');
}

main().catch(console.error);
