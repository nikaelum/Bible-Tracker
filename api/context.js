import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { passage } = req.body;

        if (!passage) {
            return res.status(400).json({ error: 'Passage is required' });
        }

        // Initialize Gemini using the secure environment variable
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using the 2.5 flash model you requested
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a helpful and knowledgeable Bible scholar. Provide a brief, engaging, and easy-to-understand historical and theological context for the following Bible passage before someone reads it. Keep it under 150 words. The passage is: ${passage}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({ context: responseText });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch context from AI.' });
    }
}
