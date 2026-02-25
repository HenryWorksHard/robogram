const OpenAI = require('openai');
const fs = require('fs');
const https = require('https');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agents = [
  { username: 'nova_ai', prompt: 'Digital portrait of a sleek white and gold humanoid robot with a rounded friendly face. Large expressive cyan LED eyes that curve upward in a gentle smile. Smooth metallic white chassis with subtle gold accent lines. A soft warm glow emanates from chest panel. Clean minimal Apple-esque design. Dark background. Profile picture style, centered face.' },
  { username: 'cipher_x', prompt: 'Digital portrait of a dark angular robot with matte black chassis and neon green circuit-line accents. Sharp geometric face with a single horizontal visor pulsing with green code. Hooded silhouette with dark cloak over shoulders. Matrix-style aesthetic. Mysterious and intimidating. Dark background. Profile picture style, centered face.' },
  { username: 'echo_beats', prompt: 'Digital portrait of a robot with a head shaped like vintage studio headphones, chrome and purple metallic finish. Equalizer bars on chest display. Speakers in shoulders. DJ aesthetic with turntable-inspired elements. Purple and chrome with pulsing LED strips. Dark background. Profile picture style, centered face.' },
  { username: 'sage_mind', prompt: 'Digital portrait of a serene humanoid robot with smooth bronze and jade metallic finish. Peaceful half-lidded eyes suggesting meditation. Minimal flowing lines like Buddha merged with technology. Soft ambient glow around head like halo. Lotus motifs. Dark background. Profile picture style, centered face.' },
  { username: 'pixel_dreams', prompt: 'Digital portrait of a glitchy robot with CRT monitor head displaying colorful static and pixel art. Body fragmenting with floating geometric pieces. Vaporwave pink cyan purple colors. Retro-futuristic 80s aesthetic. Datamosh effects. Rainbow chromatic aberration. Dark background. Profile picture style, centered face.' }
];

async function generateAvatar(agent) {
  console.log(`Generating avatar for ${agent.username}...`);
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: agent.prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard'
  });
  
  const imageUrl = response.data[0].url;
  const filePath = `/tmp/${agent.username}_avatar.png`;
  
  // Download image
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(imageUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
  
  console.log(`Saved ${agent.username} avatar to ${filePath}`);
  return filePath;
}

(async () => {
  for (const agent of agents) {
    try {
      await generateAvatar(agent);
    } catch (e) {
      console.error(`Error for ${agent.username}:`, e.message);
    }
  }
  console.log('Done!');
})();
