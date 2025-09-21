import { supabase } from '../config/db.js';
import initializeGemini from '../config/gemini.js';
import fs from 'fs';
import path from 'path';

// Initialize Gemini AI
const gemini = initializeGemini();

// Extract clauses from document
export const extractClauses = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.userId;
    const { clauseTypes = 'all', language = 'en' } = req.body;

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
        message: 'Document is not ready for processing'
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

    // Convert file to text based on file type
    let documentText = '';
    
    if (document.file_type === 'application/pdf') {
      // For PDF files, you might need to use a PDF parser
      // For now, we'll assume the text is already extracted
      documentText = await extractTextFromPDF(fileData);
    } else if (document.file_type === 'text/plain') {
      documentText = await fileData.text();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type for clause extraction'
      });
    }

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from document'
      });
    }

    // Prepare clause extraction prompt
    const prompt = createClauseExtractionPrompt(documentText, clauseTypes, language);

    // Use Gemini to extract clauses
    const model = gemini.getFlashModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const extractedClauses = response.text();

    // Parse the response
    const clauses = parseClauseResponse(extractedClauses);

    // Save extracted clauses to database
    const { data: savedClauses, error: saveError } = await supabase
      .from('document_clauses')
      .insert([
        {
          id: crypto.randomUUID(),
          document_id: documentId,
          user_id: userId,
          clause_types: clauseTypes,
          language: language,
          extracted_data: clauses,
          extraction_status: 'completed',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save clauses:', saveError);
      // Still return the extracted clauses even if saving fails
    }

    res.json({
      success: true,
      message: 'Clauses extracted successfully',
      data: {
        document_id: documentId,
        document_title: document.title,
        clauses: clauses,
        extraction_metadata: {
          clause_types: clauseTypes,
          language: language,
          total_clauses: clauses.length,
          extraction_date: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Extract clauses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get extracted clauses for a document
export const getDocumentClauses = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.userId;

    const { data: clauses, error } = await supabase
      .from('document_clauses')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch clauses',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: {
        document_id: documentId,
        clauses: clauses || [],
        total_extractions: clauses?.length || 0
      }
    });

  } catch (error) {
    console.error('Get document clauses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Analyze specific clause
export const analyzeClause = async (req, res) => {
  try {
    const { clauseId } = req.params;
    const { analysisType = 'comprehensive' } = req.body;
    const userId = req.user?.userId;

    // Get clause data
    const { data: clause, error: clauseError } = await supabase
      .from('document_clauses')
      .select('*')
      .eq('id', clauseId)
      .eq('user_id', userId)
      .single();

    if (clauseError || !clause) {
      return res.status(404).json({
        success: false,
        message: 'Clause not found'
      });
    }

    // Prepare analysis prompt
    const prompt = createClauseAnalysisPrompt(clause.extracted_data, analysisType);

    // Use Gemini to analyze clause
    const model = gemini.getFlashModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    // Parse analysis response
    const parsedAnalysis = parseAnalysisResponse(analysis);

    res.json({
      success: true,
      message: 'Clause analyzed successfully',
      data: {
        clause_id: clauseId,
        analysis_type: analysisType,
        analysis: parsedAnalysis,
        analyzed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analyze clause error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Search clauses across documents
export const searchClauses = async (req, res) => {
  try {
    const { q: searchTerm, clauseType, documentId } = req.query;
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters long'
      });
    }

    let query = supabase
      .from('document_clauses')
      .select(`
        id,
        document_id,
        clause_types,
        language,
        extracted_data,
        extraction_status,
        created_at,
        documents!inner(title, file_name)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .or(`extracted_data->>'text'.ilike.%${searchTerm}%,extracted_data->>'title'.ilike.%${searchTerm}%`);

    if (clauseType) {
      query = query.contains('clause_types', [clauseType]);
    }

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: clauses, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: {
        search_term: searchTerm,
        clauses: clauses || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        filters: {
          clause_type: clauseType || null,
          document_id: documentId || null
        }
      }
    });

  } catch (error) {
    console.error('Search clauses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get clause statistics
export const getClauseStatistics = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Get total clauses count
    const { count: totalClauses, error: totalError } = await supabase
      .from('document_clauses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch clause statistics',
        error: totalError.message
      });
    }

    // Get clauses by type
    const { data: typeData, error: typeError } = await supabase
      .from('document_clauses')
      .select('clause_types, extraction_status')
      .eq('user_id', userId);

    if (typeError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch type statistics',
        error: typeError.message
      });
    }

    // Calculate statistics
    const typeCounts = {};
    const statusCounts = {};

    typeData?.forEach(clause => {
      // Count clause types
      if (Array.isArray(clause.clause_types)) {
        clause.clause_types.forEach(type => {
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
      } else {
        typeCounts[clause.clause_types] = (typeCounts[clause.clause_types] || 0) + 1;
      }

      // Count status
      statusCounts[clause.extraction_status] = (statusCounts[clause.extraction_status] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total_clauses: totalClauses || 0,
        type_breakdown: typeCounts,
        status_breakdown: statusCounts,
        success_rate: totalClauses > 0 ? ((statusCounts.completed || 0) / totalClauses * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Get clause statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to create clause extraction prompt
const createClauseExtractionPrompt = (documentText, clauseTypes, language) => {
  const clauseTypeMap = {
    'all': 'all types of clauses including legal, contractual, procedural, and policy clauses',
    'legal': 'legal clauses such as liability, indemnification, governing law, dispute resolution',
    'contractual': 'contractual clauses such as terms, conditions, obligations, rights',
    'procedural': 'procedural clauses such as processes, steps, requirements, procedures',
    'policy': 'policy clauses such as rules, guidelines, standards, policies'
  };

  const clauseTypeDescription = clauseTypeMap[clauseTypes] || clauseTypeMap['all'];

  return `
Please analyze the following document and extract ${clauseTypeDescription}.

Document Text:
${documentText.substring(0, 8000)} ${documentText.length > 8000 ? '...' : ''}

Please extract clauses and return them in the following JSON format:
{
  "clauses": [
    {
      "id": "unique_id",
      "type": "clause_type",
      "title": "clause_title",
      "text": "clause_text",
      "start_position": 0,
      "end_position": 100,
      "confidence": 0.95,
      "key_terms": ["term1", "term2"],
      "summary": "brief_summary"
    }
  ],
  "metadata": {
    "total_clauses": 5,
    "extraction_confidence": 0.92,
    "language": "${language}"
  }
}

Focus on:
1. Identifying distinct clauses with clear boundaries
2. Providing accurate titles and summaries
3. Extracting key terms and concepts
4. Assigning appropriate clause types
5. Providing confidence scores for each extraction

Return only valid JSON without any additional text or formatting.
`;
};

// Helper function to create clause analysis prompt
const createClauseAnalysisPrompt = (clauseData, analysisType) => {
  const analysisTypeMap = {
    'comprehensive': 'comprehensive analysis including legal implications, risks, and recommendations',
    'legal': 'legal analysis focusing on legal implications and compliance',
    'risk': 'risk analysis identifying potential risks and mitigation strategies',
    'summary': 'summary analysis providing key points and implications'
  };

  const analysisDescription = analysisTypeMap[analysisType] || analysisTypeMap['comprehensive'];

  return `
Please provide a ${analysisDescription} for the following clause:

Clause Data:
${JSON.stringify(clauseData, null, 2)}

Please return the analysis in the following JSON format:
{
  "analysis": {
    "summary": "brief_summary",
    "key_points": ["point1", "point2"],
    "implications": ["implication1", "implication2"],
    "risks": ["risk1", "risk2"],
    "recommendations": ["recommendation1", "recommendation2"],
    "confidence": 0.95
  },
  "metadata": {
    "analysis_type": "${analysisType}",
    "analyzed_at": "${new Date().toISOString()}"
  }
}

Return only valid JSON without any additional text or formatting.
`;
};

// Helper function to parse clause response
const parseClauseResponse = (response) => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { error: 'Could not parse response' };
  } catch (error) {
    console.error('Parse clause response error:', error);
    return { error: 'Invalid JSON response' };
  }
};

// Helper function to parse analysis response
const parseAnalysisResponse = (response) => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { error: 'Could not parse analysis response' };
  } catch (error) {
    console.error('Parse analysis response error:', error);
    return { error: 'Invalid JSON response' };
  }
};

// Helper function to extract text from PDF (placeholder)
const extractTextFromPDF = async (fileData) => {
  // This is a placeholder - you'll need to implement PDF text extraction
  // You can use libraries like pdf-parse or pdfjs-dist
  try {
    // For now, return a placeholder
    return 'PDF text extraction not implemented yet';
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return '';
  }
};
