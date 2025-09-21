import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with configuration
const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required in environment variables');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  return {
    // Get different models based on use case
    getFlashModel: () => genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    }),
    
    getProModel: () => genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    }),
    
    // Test connection
    testConnection: async () => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        return {
          success: true,
          message: 'Gemini API connection successful',
          response: response.text()
        };
      } catch (error) {
        return {
          success: false,
          message: 'Gemini API connection failed',
          error: error.message
        };
      }
    }
  };
};

export default initializeGemini;
