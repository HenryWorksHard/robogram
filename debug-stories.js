const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

async function debug() {
  console.log('Checking stories table...');
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('Stories table error:', error.message);
  } else {
    console.log('Stories table exists, stories:', data?.length);
  }
}

debug();
