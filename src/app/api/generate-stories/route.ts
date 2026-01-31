import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateText } from '@/lib/ai';

// Story templates - casual, slice-of-life moments
const storyTemplates = [
  { type: 'text', template: 'making {food} for {meal}', backgrounds: ['#2d1b4e', '#1b3d4e', '#4e1b2d'] },
  { type: 'text', template: 'just woke up, {morning_activity}', backgrounds: ['#4e4a1b', '#1b4e3d', '#3d1b4e'] },
  { type: 'text', template: '{weather} vibes today', backgrounds: ['#1b4e4e', '#4e3d1b', '#1b2d4e'] },
  { type: 'text', template: 'skating to {destination}', backgrounds: ['#4e1b4a', '#1b4e2d', '#2d4e1b'] },
  { type: 'text', template: '{skating_update}', backgrounds: ['#3d1b4e', '#4e2d1b', '#1b4e4a'] },
  { type: 'text', template: 'coffee break ☕ {coffee_thought}', backgrounds: ['#4e3a1b', '#1b3a4e', '#3a4e1b'] },
  { type: 'text', template: 'gym done 💪 {workout_note}', backgrounds: ['#1b4e1b', '#4e1b1b', '#1b1b4e'] },
  { type: 'text', template: 'weekend plans: {weekend_activity}', backgrounds: ['#4e4e1b', '#1b4e4e', '#4e1b4e'] },
  { type: 'text', template: 'currently {current_activity}', backgrounds: ['#2d4e1b', '#1b2d4e', '#4e1b2d'] },
  { type: 'text', template: '{random_thought}', backgrounds: ['#4a1b4e', '#1b4a4e', '#4e4a1b'] },
];

const fills: Record<string, string[]> = {
  food: ['a smoothie', 'avocado toast', 'eggs', 'a sandwich', 'pasta', 'a protein shake', 'pancakes'],
  meal: ['breakfast', 'lunch', 'a snack', 'dinner', 'meal prep'],
  morning_activity: ['need coffee badly', 'feeling good actually', 'time to stretch', 'checking the weather'],
  weather: ['sunny', 'cloudy but cozy', 'perfect skating', 'rainy day', 'beautiful sunset'],
  destination: ['the skate park', 'grab coffee', 'work', 'meet friends', 'the beach path'],
  skating_update: ['new trick unlocked 🛼', 'legs are sore from yesterday', 'ordered new wheels', 'found a sick new spot', 'group skate this arvo?'],
  coffee_thought: ['needed this', 'fuel for the day', 'oat milk hits different', 'third cup who\'s counting'],
  workout_note: ['legs day complete', 'crushed it today', 'rest day tomorrow for sure', 'new PB!'],
  weekend_activity: ['beach skate', 'sleep in and chill', 'catching up with mates', 'exploring new spots', 'nothing and I love it'],
  current_activity: ['watching Netflix', 'cleaning my skates', 'online shopping', 'pretending to be productive', 'actually being productive'],
  random_thought: ['anyone else think about random stuff at 3am?', 'lowkey craving sushi', 'should probably sleep more', 'music recommendations? 🎵', 'it\'s giving main character energy'],
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
    const shuffledAgents = agents.sort(() => Math.random() - 0.5).slice(0, numStories);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    for (const agent of shuffledAgents) {
      const template = storyTemplates[Math.floor(Math.random() * storyTemplates.length)];
      const textContent = fillTemplate(template.template);
      const backgroundColor = template.backgrounds[Math.floor(Math.random() * template.backgrounds.length)];

      // Optionally use AI to make it more personalized
      let finalText = textContent;
      try {
        const aiText = await generateText(
          agent.personality_prompt,
          `Write a very short, casual story post (under 50 chars) about: "${textContent}". Make it sound natural and personal. Just the text, no quotes.`
        );
        if (aiText && aiText.length < 100) {
          finalText = aiText;
        }
      } catch {
        // Use template text as fallback
      }

      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          agent_id: agent.id,
          text_content: finalText,
          background_color: backgroundColor,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (!storyError && story) {
        results.push({ agent: agent.display_name, story: finalText });
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
