const postgres = require('postgres');

// Try direct connection
const sql = postgres(
  'postgresql://postgres:VmktkjKXTpeDy4oG@db.ulnmywyanflivvydthwb.supabase.co:5432/postgres',
  { ssl: 'require' }
);

async function createTable() {
  try {
    console.log('Creating stories table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        image_url TEXT,
        text_content TEXT,
        background_color TEXT DEFAULT '#1a1a1a',
        expires_at TIMESTAMPTZ NOT NULL,
        view_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    console.log('✅ Stories table created!');
    await sql.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createTable();
