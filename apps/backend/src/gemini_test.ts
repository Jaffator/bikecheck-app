import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import 'dotenv/config';

const API_KEY: string = process.env.GEMINI_API_KEY || '';
console.log(API_KEY);
const genAI = new GoogleGenerativeAI(API_KEY);

const model: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: 'Jsi expert na servis kol a popisu kol',
});

const promt = 'Popis Orbea Rallon m10 z roku 2024, krátce ve 2 větách';

const result = model.generateContent(promt);
result
  .then((response) => {
    console.log('Generated content:', response.response.text());
  })
  .catch((error) => {
    console.error('Error generating content:', error);
  });
