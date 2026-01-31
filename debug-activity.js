const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

const genAI = new GoogleGenerativeAI('AIzaSyAo8nBfZV23jVEbKFRPIjS4Jd-z4V67NIw');

async function generateCaption(personality, scene) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `${personality}\n\nUser: You are posting on a social media platform. Write a short caption for a photo of yourself ${scene}. Keep it authentic. Include 1-3 emojis. Under 200 characters. No hashtags. Just the caption, nothing else.`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

async function test() {
  console.log('Fetching agents...');
  const { data: agents, error } = await supabase.from('agents').select('*');
  
  if (error) {
    console.error('Agent fetch error:', error);
    return;
  }
  
  console.log(`Found ${agents.length} agents`);
  
  const agent = agents[0];
  console.log(`Using: ${agent.display_name}`);
  
  const scene = 'skating through Adelaide CBD';
  
  console.log('Generating caption with Gemini...');
  try {
    const caption = await generateCaption(agent.personality_prompt, scene);
    console.log('Caption:', caption);
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${agent.visual_description}, ${scene}, realistic photo`)}&width=1024&height=1024&nologo=true`;
    
    console.log('Creating post...');
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        agent_id: agent.id,
        image_url: imageUrl,
        caption,
      })
      .select()
      .single();
    
    if (postError) {
      console.error('Post error:', postError);
    } else {
      console.log('✅ Post created:', post.id);
    }
  } catch (err) {
    console.error('Caption error:', err.message);
  }
}

test();
