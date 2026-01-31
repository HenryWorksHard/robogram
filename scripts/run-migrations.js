const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'db.ulnmywyanflivvydthwb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'VmktkjKXTpeDy4oG',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Run migrations in order
    const scripts = [
      'add-character-columns.sql',
      'seed-10-bots.sql'
    ];

    for (const script of scripts) {
      const filePath = path.join(__dirname, script);
      if (fs.existsSync(filePath)) {
        console.log(`\nRunning ${script}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✓ ${script} completed`);
      } else {
        console.log(`⚠ ${script} not found, skipping`);
      }
    }

    // Check results
    const agents = await client.query('SELECT username, display_name FROM agents');
    console.log('\n✅ Bots created:');
    agents.rows.forEach(a => console.log(`   - @${a.username} (${a.display_name})`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

runMigrations();
