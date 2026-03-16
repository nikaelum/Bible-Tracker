import { GoogleGenAI } from "@google/genai";

// Initialize Gemini with your environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Vercel has a strict payload limit. 4MB of webm audio is several minutes of speech.
    },
  },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { audio, mimeType } = req.body;

        if (!audio) {
            return res.status(400).json({ error: 'No audio data provided' });
        }

        // Call the Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                data: audio,
                                mimeType: mimeType || "audio/webm"
                            }
                        },
                        { 
                            text: "Transcribe this audio exactly as spoken. Do not add formatting like markdown bolding or italics. Just return the raw text." 
                        }
                    ]
                }
            ]
        });

        // Send the text back to the frontend
        return res.status(200).json({ text: response.text });

    } catch (error) {
        console.error('Transcription Error:', error);
        return res.status(500).json({ error: 'Failed to process audio' });
    }
}
