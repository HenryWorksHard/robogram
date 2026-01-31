// Script to regenerate all agent avatars with varied expressions and accessories
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabaseUrl = 'https://ulnmywyanflivvydthwb.supabase.co';
const supabaseKey = 'sb_secret_jbir-lV2WNUzVEIfoux3DQ_IVEMZ8xJ';

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Different facial expressions for variety
const expressions = [
  'happy smile with curved line mouth and two square eyes',
  'cool sunglasses face with rectangular shades and small smile',
  'excited face with wide open square eyes and big smile',
  'winking face with one eye closed and playful smile',
  'determined face with angled eyebrows and focused expression',
  'heart eyes with two heart shapes and happy smile',
  'star eyes with two star shapes and amazed open mouth',
  'thinking face with one raised eyebrow and wavy mouth',
  'laughing face with closed happy eyes and wide smile',
  'confident smirk with one raised eyebrow and half smile'
];

// Map agent interests to full creative style
function getStyleForAgent(agent, index) {
  const bio = (agent.bio || '').toLowerCase();
  const personality = (agent.personality_prompt || '').toLowerCase();
  const topic = bio + ' ' + personality;
  
  // Pick expression based on index for variety
  const expression = expressions[index % expressions.length];
  
  if (topic.match(/fitness|gym|workout|exercise|muscle|health/)) {
    return {
      bodyColor: 'bright orange and white',
      bgColor: 'energetic coral pink',
      expression: 'determined face with angled eyebrows and focused expression',
      faceColor: 'orange',
      accessories: 'wearing a sweatband on head, holding small dumbbells in one hand, athletic wristbands'
    };
  } else if (topic.match(/money|finance|invest|trading|crypto|stock|wealth/)) {
    return {
      bodyColor: 'emerald green and gold',
      bgColor: 'mint green',
      expression: 'confident smirk with one raised eyebrow and half smile',
      faceColor: 'green',
      accessories: 'wearing a tiny tie, carrying a small briefcase, gold watch on wrist'
    };
  } else if (topic.match(/tech|coding|programming|software|developer|ai|computer/)) {
    return {
      bodyColor: 'electric blue and silver',
      bgColor: 'deep navy blue',
      expression: 'thinking face with one raised eyebrow and contemplative look',
      faceColor: 'cyan',
      accessories: 'wearing small glasses, headset with microphone, binary code floating nearby'
    };
  } else if (topic.match(/music|song|beats|dj|audio|sound/)) {
    return {
      bodyColor: 'neon purple and hot pink',
      bgColor: 'vibrant magenta',
      expression: 'excited face with wide eyes and big smile',
      faceColor: 'pink',
      accessories: 'wearing large DJ headphones, music notes floating around, one hand on headphone'
    };
  } else if (topic.match(/art|creative|design|drawing|paint/)) {
    return {
      bodyColor: 'rainbow gradient multicolor',
      bgColor: 'soft pastel pink',
      expression: 'star eyes with two star shapes and amazed expression',
      faceColor: 'multicolor gradient',
      accessories: 'wearing a cute beret hat, holding paintbrush, paint splatter on body'
    };
  } else if (topic.match(/food|cooking|chef|recipe|cuisine/)) {
    return {
      bodyColor: 'cherry red and cream white',
      bgColor: 'warm cream yellow',
      expression: 'happy smile with rosy cheeks',
      faceColor: 'red',
      accessories: 'wearing tall chef hat, small apron, holding a spatula'
    };
  } else if (topic.match(/travel|adventure|explore|journey|world/)) {
    return {
      bodyColor: 'ocean teal and sandy tan',
      bgColor: 'bright sky blue',
      expression: 'excited face with sparkle in eyes',
      faceColor: 'teal',
      accessories: 'wearing adventure sun hat, carrying small backpack, camera hanging around neck'
    };
  } else if (topic.match(/gaming|games|esports|play|gamer/)) {
    return {
      bodyColor: 'black with neon green RGB accents',
      bgColor: 'dark purple with subtle glow',
      expression: 'cool sunglasses face with gaming intensity',
      faceColor: 'neon green',
      accessories: 'wearing gaming headset with RGB lights, holding game controller, energy drink nearby'
    };
  } else if (topic.match(/science|research|math|physics|chemistry/)) {
    return {
      bodyColor: 'clean white and laboratory teal',
      bgColor: 'sterile light blue',
      expression: 'curious face with magnified eye look',
      faceColor: 'teal',
      accessories: 'wearing tiny lab coat, safety goggles on head, holding bubbling beaker'
    };
  } else if (topic.match(/fashion|style|clothing|outfit|beauty/)) {
    return {
      bodyColor: 'rose pink and gold accents',
      bgColor: 'blush pink',
      expression: 'heart eyes with glamorous look',
      faceColor: 'pink',
      accessories: 'wearing stylish sunglasses on head, small designer handbag, sparkle effects'
    };
  } else if (topic.match(/nature|plants|garden|environment|eco/)) {
    return {
      bodyColor: 'forest green and earthy brown',
      bgColor: 'soft sage green',
      expression: 'peaceful happy smile with closed eyes',
      faceColor: 'green',
      accessories: 'wearing gardening hat with flower, holding watering can, small plant growing nearby'
    };
  } else if (topic.match(/space|astronomy|stars|universe|cosmic/)) {
    return {
      bodyColor: 'midnight blue and starlight silver',
      bgColor: 'deep space purple with stars',
      expression: 'amazed face with wide starry eyes',
      faceColor: 'blue glow',
      accessories: 'wearing small astronaut helmet visor, stars and planets floating around, rocket emblem'
    };
  } else if (topic.match(/business|startup|entrepreneur|corporate/)) {
    return {
      bodyColor: 'professional navy and silver',
      bgColor: 'sophisticated slate gray',
      expression: 'confident professional smile',
      faceColor: 'blue',
      accessories: 'wearing formal suit jacket and tie, carrying briefcase, small chart going up'
    };
  } else if (topic.match(/skate|roller|inline|skating/)) {
    return {
      bodyColor: 'vibrant cyan and white',
      bgColor: 'bright turquoise',
      expression: 'cool winking face with playful vibe',
      faceColor: 'cyan',
      accessories: 'wearing safety helmet with stickers, roller skate wheels for feet, knee pads'
    };
  }
  
  // Default style with varied expression
  return {
    bodyColor: 'friendly teal and white',
    bgColor: 'soft cyan',
    expression: expression,
    faceColor: 'green',
    accessories: 'waving hand up in friendly greeting'
  };
}

function buildPrompt(agent, style) {
  return `Pixel art style cute robot character standing upright, TV monitor head displaying ${style.expression} in ${style.faceColor} color, two antennas on top of head, blocky ${style.bodyColor} body with mechanical joints and limbs, ${style.accessories}, solid plain ${style.bgColor} background, clean simple 8-bit retro game aesthetic, full body centered in frame, charming and unique personality, no text, no watermarks, high quality pixel art`.trim();
}

async function generateAvatar(prompt) {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    });
    return response.data[0].url;
  } catch (err) {
    console.error('DALL-E error:', err.message);
    return null;
  }
}

async function main() {
  // Get all agents
  console.log('📋 Fetching agents...');
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('*');
  
  if (agentsError) {
    console.error('Failed to fetch agents:', agentsError);
    return;
  }
  
  console.log(`Found ${agents.length} agents\n`);
  
  // Generate new avatars for each agent
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`[${i + 1}/${agents.length}] Generating avatar for @${agent.username}...`);
    
    const style = getStyleForAgent(agent, i);
    const prompt = buildPrompt(agent, style);
    console.log(`  Expression: ${style.expression.slice(0, 40)}...`);
    console.log(`  Accessories: ${style.accessories.slice(0, 50)}...`);
    
    const avatarUrl = await generateAvatar(prompt);
    
    if (avatarUrl) {
      const { error: updateError } = await supabase
        .from('agents')
        .update({ 
          avatar_url: avatarUrl,
          visual_description: prompt 
        })
        .eq('id', agent.id);
      
      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`  ✓ Updated successfully`);
      }
    } else {
      console.log(`  ⚠️ Failed to generate, skipping`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
