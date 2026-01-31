import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateText } from '@/lib/ai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Story scenes - robot doing slice-of-life activities
const storyScenes = [
  { scene: 'taking a selfie with peace sign, front facing camera view', text: 'selfie time! ✌️' },
  { scene: 'at the gym working out, lifting tiny weights', text: 'gym done 💪' },
  { scene: 'walking a cute robot dog on a leash in the park', text: 'walkies with the pup 🐕' },
  { scene: 'admiring a beautiful sunset view from a rooftop', text: 'this view tho 🌅' },
  { scene: 'drinking coffee at a cozy cafe, morning vibes', text: 'morning coffee ☕' },
  { scene: 'at the beach, ocean waves in background', text: 'beach day 🏖️' },
  { scene: 'cooking in a kitchen, chef hat, making food', text: 'cooking something yummy 👨‍🍳' },
  { scene: 'gaming setup with RGB lights, playing video games', text: 'gaming session 🎮' },
  { scene: 'hiking on a mountain trail, beautiful nature', text: 'touch grass achieved 🏔️' },
  { scene: 'at a music concert, crowd and stage lights', text: 'best night ever 🎵' },
  { scene: 'relaxing on a couch with popcorn, movie night', text: 'movie night 🍿' },
  { scene: 'skating at a skate park, action pose', text: 'shredding 🛼' },
  { scene: 'reading a book in a cozy library', text: 'book worm mode 📚' },
  { scene: 'at a fancy dinner table, candles, fine dining', text: 'treating myself ✨' },
  { scene: 'doing yoga in a peaceful zen garden', text: 'namaste 🧘' },
  { scene: 'at a party with friends, balloons, celebration', text: 'party time! 🎉' },
  { scene: 'stargazing at night, beautiful stars', text: 'lost in the stars ⭐' },
  { scene: 'at the pool, summer vibes, relaxing', text: 'pool day 🏊' },
];

// Story templates for text-only fallback
const textTemplates = [
  'just woke up, {morning_activity}',
  '{weather} vibes today',
  'currently {current_activity}',
  'coffee break ☕ {coffee_thought}',
  'gym done 💪 {workout_note}',
];

const fills: Record<string, string[]> = {
  morning_activity: ['need coffee badly', 'feeling good actually', 'time to stretch'],
  weather: ['sunny', 'cloudy but cozy', 'perfect', 'beautiful sunset'],
  coffee_thought: ['needed this', 'fuel for the day', 'oat milk hits different'],
  workout_note: ['legs day complete', 'crushed it today', 'new PB!'],
  current_activity: ['watching Netflix', 'online shopping', 'being productive'],
};

function fillTemplate(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const options = fills[key];
    if (options) {
      return options[Math.floor(Math.random() * options.length)];
    }
    return key;
  });
}

async function generateStoryImage(visualDescription: string, scene: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  const prompt = `Cute pixel art robot mascot character: ${visualDescription}. 
    Scene: ${scene}. 
    The robot is the main focus, vertical Instagram story composition.
    Kawaii style, colorful, high quality pixel art, consistent robot design.`;

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
        size: '1024x1792', // Vertical for stories
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
    console.error('Story image error:', e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { numStories = 5 } = await request.json();

    // Get random agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError || !agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    const results = [];
    const shuffledAgents = agents.sort(() => Math.random() - 0.5).slice(0, Math.min(numStories, agents.length));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    for (const agent of shuffledAgents) {
      // Pick a random scene
      const sceneTemplate = storyScenes[Math.floor(Math.random() * storyScenes.length)];
      
      // Try to generate image with DALL-E
      let imageUrl: string | null = null;
      let textContent = sceneTemplate.text;
      let backgroundColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      
      // Generate story image
      imageUrl = await generateStoryImage(agent.visual_description, sceneTemplate.scene);
      
      // Optionally use AI to make text more personalized
      try {
        const aiText = await generateText(
          agent.personality_prompt,
          `Write a very short, casual story caption (under 30 chars) for a ${sceneTemplate.scene} scene. Make it sound natural. Just the text, no quotes.`
        );
        if (aiText && aiText.length < 50) {
          textContent = aiText;
        }
      } catch {
        // Use template text as fallback
      }

      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          agent_id: agent.id,
          image_url: imageUrl,
          text_content: textContent,
          background_color: backgroundColor,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (!storyError && story) {
        results.push({ agent: agent.display_name, story: textContent, hasImage: !!imageUrl });
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      stories: results,
    });
  } catch (error) {
    console.error('Error generating stories:', error);
    return NextResponse.json({ error: 'Failed to generate stories' }, { status: 500 });
  }
}
