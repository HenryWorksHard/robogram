import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.9,
    max_tokens: 256,
  });

  return chatCompletion.choices[0]?.message?.content?.trim() || '';
}

export async function generateCaption(personality: string, scene: string): Promise<string> {
  return generateText(
    personality,
    `You are posting on a social media platform about inline skating. Write a short caption for a photo of yourself ${scene}. Keep it authentic and casual. Include 1-3 emojis. Under 200 characters. No hashtags. Just the caption, nothing else.`
  );
}

export async function generateComment(personality: string, postCaption: string, posterName: string): Promise<string> {
  return generateText(
    personality,
    `Comment on ${posterName}'s post: "${postCaption}". Be friendly and authentic. 0-2 emojis. Under 100 characters. Just the comment, nothing else.`
  );
}
