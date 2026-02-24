// Script to migrate temp DALL-E avatar URLs to permanent Supabase storage
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ulnmywyanflivvydthwb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbm15d3lhbmZsaXZ2eWR0aHdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgzMzExMCwiZXhwIjoyMDg1NDA5MTEwfQ.gPZMU_pxuI7mZIcndN7D9KgU6FixijMPKarq6WMsnoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAvatars() {
  // Get agents with temp URLs
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, username, avatar_url')
    .or('avatar_url.like.%oaidalleapiprodscus%,avatar_url.like.%blob.core.windows.net%');

  if (error) {
    console.error('Error fetching agents:', error);
    return;
  }

  console.log(`Found ${agents.length} agents with temp URLs`);

  for (const agent of agents) {
    console.log(`\nMigrating ${agent.username}...`);
    
    try {
      // Download image
      const response = await fetch(agent.avatar_url);
      if (!response.ok) {
        console.error(`  Failed to download: HTTP ${response.status}`);
        continue;
      }

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      
      // Generate filename
      const filename = `avatars/${agent.username}-${Date.now()}.png`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filename, buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error(`  Upload error:`, uploadError.message);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filename);

      const permanentUrl = urlData.publicUrl;
      console.log(`  Uploaded to: ${permanentUrl}`);

      // Update agent record
      const { error: updateError } = await supabase
        .from('agents')
        .update({ avatar_url: permanentUrl })
        .eq('id', agent.id);

      if (updateError) {
        console.error(`  Update error:`, updateError.message);
        continue;
      }

      console.log(`  ✅ ${agent.username} migrated successfully`);
    } catch (err) {
      console.error(`  Error:`, err.message);
    }
  }

  console.log('\nMigration complete!');
}

migrateAvatars();
