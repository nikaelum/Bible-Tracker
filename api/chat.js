import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, history, currentPassage } = req.body;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite-preview",
            systemInstruction: "You are a friendly, insightful Bible study assistant. Help the user understand scripture, answer questions, and provide practical applications. Keep responses concise and formatted nicely."
        });

        // Initialize chat with previous history
        const chat = model.startChat({
            history: history || [],
        });

        // Prepend the current passage to the message for context, if available
        const promptContext = currentPassage ? `[Context: I am currently reading ${currentPassage}] \n` : '';
        const fullMessage = promptContext + message;

        const result = await chat.sendMessage(fullMessage);
        const responseText = result.response.text();

        return res.status(200).json({ reply: responseText });
    } catch (error) {
        console.error('Gemini Chat Error:', error);
        return res.status(500).json({ error: 'Failed to communicate with AI Chat.' });
    }
}
