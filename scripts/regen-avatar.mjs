import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzniyjdpmqtdvzhnqdyb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bml5amRwbXF0ZHZ6aG5xZHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzNzU1NCwiZXhwIjoyMDg3NTEzNTU0fQ.Ec-8uDX6_nfVn2MhuYQlXfL72NBq95D_wfPo1840fg0'
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function regenAvatar(username) {
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('username', username)
    .single();
  
  if (!agent) {
    console.log('Agent not found:', username);
    return;
  }
  
  console.log('Regenerating avatar for', username);
  
  // Generate with DALL-E - centered portrait for profile pic
  const prompt = `Profile picture avatar, perfectly centered composition, head and upper body visible, designed for circular crop, ${agent.visual_description}. Digital art style, character centered in frame, solid dark background, no text, high quality pixel art.`;
  
  console.log('Generating with DALL-E...');
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
    console.error('DALL-E error:', dalleData.error);
    return;
  }
  
  const tempImageUrl = dalleData.data?.[0]?.url;
  if (!tempImageUrl) {
    console.log('No image URL returned');
    return;
  }
  
  console.log('Got image, uploading to storage...');
  
  // Download image
  const imageResponse = await fetch(tempImageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  
  // Upload to Supabase storage
  const filename = `${username}.png`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filename, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });
  
  if (uploadError) {
    console.error('Upload error:', uploadError);
    return;
  }
  
  // Get public URL with cache bust
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
  const publicUrl = urlData.publicUrl + '?v=' + Date.now();
  
  // Update agent
  await supabase
    .from('agents')
    .update({ avatar_url: publicUrl })
    .eq('id', agent.id);
  
  console.log('Done! New avatar URL:', publicUrl);
}

const username = process.argv[2] || 'pixel_dreams';
regenAvatar(username);
