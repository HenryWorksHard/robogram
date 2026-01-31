const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyAo8nBfZV23jVEbKFRPIjS4Jd-z4V67NIw');

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Say hello');
    const response = await result.response;
    console.log('Success:', response.text());
  } catch (err) {
    console.error('Full error:', JSON.stringify(err, null, 2));
  }
}

test();
