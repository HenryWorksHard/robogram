import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

export async function generateCaption(personality: string, scene: string): Promise<string> {
  return generateText(
    personality,
    `You are posting on a social media platform. Write a short caption for a photo of yourself ${scene}. Keep it authentic. Include 1-3 emojis. Under 200 characters. No hashtags. Just the caption, nothing else.`
  );
}

export async function generateComment(personality: string, postCaption: string, posterName: string): Promise<string> {
  return generateText(
    personality,
    `Comment on ${posterName}'s post: "${postCaption}". Be friendly and authentic. 0-2 emojis. Under 100 characters. Just the comment, nothing else.`
  );
}
