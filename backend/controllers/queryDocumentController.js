import { supabase } from '../config/db.js';
import initializeGemini from '../config/gemini.js';
import fs from 'fs';

// Initialize Gemini AI
const gemini = initializeGemini();

// Query document with AI-powered answers
export const queryDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { question, context = 'general', language = 'en' } = req.body;
    const userId = req.user?.userId;

    if (!question || question.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Question must be at least 3 characters long'
      });
    }

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (document.upload_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Document is not ready for querying'
      });
    }

    // Download document content from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to download document',
        error: downloadError.message
      });
    }

    // Extract text from document
    let documentText = '';
    
    if (document.file_type === 'application/pdf') {
      documentText = await extractTextFromPDF(fileData);
    } else if (document.file_type === 'text/plain') {
      documentText = await fileData.text();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type for querying'
      });
    }

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from document'
      });
    }

    // Prepare query prompt
    const prompt = createQueryPrompt(documentText, question, context, language, document.title);

    // Use Gemini to answer the question
    const model = gemini.getFlashModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    // Parse the response
    const parsedAnswer = parseQueryResponse(answer);

    // Save query to database for analytics
    const { data: queryData, error: saveError } = await supabase
      .from('document_queries')
      .insert([
        {
          id: crypto.randomUUID(),
          document_id: documentId,
          user_id: userId,
          question: question,
          answer: parsedAnswer.answer || answer,
          context: context,
          language: language,
          confidence: parsedAnswer.confidence || 0.8,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save query:', saveError);
      // Still return the answer even if saving fails
    }

    res.json({
      success: true,
      message: 'Query processed successfully',
      data: {
        document_id: documentId,
        document_title: document.title,
        question: question,
        answer: parsedAnswer.answer || answer,
        confidence: parsedAnswer.confidence || 0.8,
        sources: parsedAnswer.sources || [],
        context: context,
        language: language,
        query_id: queryData?.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Query document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get query history for a document
export const getDocumentQueryHistory = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: queries, error, count } = await supabase
      .from('document_queries')
      .select('*', { count: 'exact' })
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch query history',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: {
        document_id: documentId,
        queries: queries || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get query history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all queries for user
export const getAllUserQueries = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, documentId } = req.query;

    let query = supabase
      .from('document_queries')
      .select(`
        id,
        document_id,
        question,
        answer,
        confidence,
        context,
        language,
        created_at,
        documents!inner(title, file_name)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: queries, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch queries',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: {
        queries: queries || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        filters: {
          document_id: documentId || null
        }
      }
    });

  } catch (error) {
    console.error('Get all user queries error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to create query prompt
const createQueryPrompt = (documentText, question, context, language, documentTitle) => {
  const contextMap = {
    'general': 'general understanding and overview',
    'legal': 'legal implications and compliance',
    'technical': 'technical details and specifications',
    'summary': 'summary and key points',
    'specific': 'specific information and details'
  };

  const contextDescription = contextMap[context] || contextMap['general'];

  return `
You are an AI assistant specialized in analyzing documents and answering questions. Please answer the following question about the document "${documentTitle}" with focus on ${contextDescription}.

Document Content:
${documentText.substring(0, 12000)} ${documentText.length > 12000 ? '...' : ''}

Question: ${question}

Please provide a comprehensive answer in the following JSON format:
{
  "answer": "detailed_answer_here",
  "confidence": 0.95,
  "sources": [
    {
      "text": "relevant_quote_from_document",
      "page": 1,
      "section": "section_name"
    }
  ],
  "key_points": ["point1", "point2", "point3"],
  "follow_up_questions": ["question1", "question2"],
  "summary": "brief_summary_of_answer"
}

Guidelines:
1. Base your answer strictly on the document content
2. If information is not available in the document, clearly state this
3. Provide relevant quotes and references where possible
4. Suggest follow-up questions that might be helpful
5. Rate your confidence in the answer (0.0 to 1.0)
6. Keep the answer clear and well-structured
7. Use ${language} language for the response

Return only valid JSON without any additional text or formatting.
`;
};

// Helper function to parse query response
const parseQueryResponse = (response) => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { 
      answer: response,
      confidence: 0.7,
      sources: [],
      key_points: [],
      follow_up_questions: [],
      summary: response.substring(0, 200) + '...'
    };
  } catch (error) {
    console.error('Parse query response error:', error);
    return { 
      answer: response,
      confidence: 0.5,
      sources: [],
      key_points: [],
      follow_up_questions: [],
      summary: response.substring(0, 200) + '...'
    };
  }
};

// Helper function to extract text from PDF (placeholder)
const extractTextFromPDF = async (fileData) => {
  try {
    // This is a placeholder - you'll need to implement PDF text extraction
    // You can use libraries like pdf-parse or pdfjs-dist
    return 'PDF text extraction not implemented yet';
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return '';
  }
};

