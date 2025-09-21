import { supabase } from '../config/db.js';
import initializeGemini from '../config/gemini.js';

// Initialize Gemini AI
const gemini = initializeGemini();

// Submit feedback for document query
export const submitQueryFeedback = async (req, res) => {
  try {
    const { queryId } = req.params;
    const { rating, feedback, feedbackType = 'general' } = req.body;
    const userId = req.user?.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!feedback || feedback.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Feedback must be at least 10 characters long'
      });
    }

    // Verify query exists and belongs to user
    const { data: query, error: queryError } = await supabase
      .from('document_queries')
      .select('id, document_id, question, answer')
      .eq('id', queryId)
      .eq('user_id', userId)
      .single();

    if (queryError || !query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Save feedback
    const { data: feedbackData, error: saveError } = await supabase
      .from('query_feedback')
      .insert([
        {
          id: crypto.randomUUID(),
          query_id: queryId,
          user_id: userId,
          rating: rating,
          feedback: feedback.trim(),
          feedback_type: feedbackType,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (saveError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save feedback',
        error: saveError.message
      });
    }

    // Analyze feedback with AI to extract insights
    const analysisResult = await analyzeFeedbackWithAI(feedback, rating, query);

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedback_id: feedbackData.id,
        query_id: queryId,
        rating: rating,
        feedback: feedback.trim(),
        feedback_type: feedbackType,
        ai_analysis: analysisResult,
        submitted_at: feedbackData.created_at
      }
    });

  } catch (error) {
    console.error('Submit query feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Submit feedback for clause extraction
export const submitClauseFeedback = async (req, res) => {
  try {
    const { clauseId } = req.params;
    const { rating, feedback, accuracy, relevance, completeness } = req.body;
    const userId = req.user?.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Verify clause exists and belongs to user
    const { data: clause, error: clauseError } = await supabase
      .from('document_clauses')
      .select('id, document_id, extracted_data')
      .eq('id', clauseId)
      .eq('user_id', userId)
      .single();

    if (clauseError || !clause) {
      return res.status(404).json({
        success: false,
        message: 'Clause not found'
      });
    }

    // Save feedback
    const { data: feedbackData, error: saveError } = await supabase
      .from('clause_feedback')
      .insert([
        {
          id: crypto.randomUUID(),
          clause_id: clauseId,
          user_id: userId,
          rating: rating,
          feedback: feedback?.trim() || null,
          accuracy: accuracy || null,
          relevance: relevance || null,
          completeness: completeness || null,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (saveError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save feedback',
        error: saveError.message
      });
    }

    res.json({
      success: true,
      message: 'Clause feedback submitted successfully',
      data: {
        feedback_id: feedbackData.id,
        clause_id: clauseId,
        rating: rating,
        feedback: feedback?.trim() || null,
        metrics: {
          accuracy: accuracy || null,
          relevance: relevance || null,
          completeness: completeness || null
        },
        submitted_at: feedbackData.created_at
      }
    });

  } catch (error) {
    console.error('Submit clause feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Submit general document feedback
export const submitDocumentFeedback = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { rating, feedback, aspect = 'overall' } = req.body;
    const userId = req.user?.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Verify document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Save feedback
    const { data: feedbackData, error: saveError } = await supabase
      .from('document_feedback')
      .insert([
        {
          id: crypto.randomUUID(),
          document_id: documentId,
          user_id: userId,
          rating: rating,
          feedback: feedback?.trim() || null,
          aspect: aspect,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (saveError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save feedback',
        error: saveError.message
      });
    }

    res.json({
      success: true,
      message: 'Document feedback submitted successfully',
      data: {
        feedback_id: feedbackData.id,
        document_id: documentId,
        document_title: document.title,
        rating: rating,
        feedback: feedback?.trim() || null,
        aspect: aspect,
        submitted_at: feedbackData.created_at
      }
    });

  } catch (error) {
    console.error('Submit document feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get feedback analytics
export const getFeedbackAnalytics = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { type = 'all', days = 30 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    let analytics = {};

    if (type === 'all' || type === 'queries') {
      // Query feedback analytics
      const { data: queryFeedback, error: queryError } = await supabase
        .from('query_feedback')
        .select('rating, feedback_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', daysAgo.toISOString());

      if (!queryError) {
        analytics.queries = calculateFeedbackMetrics(queryFeedback || []);
      }
    }

    if (type === 'all' || type === 'clauses') {
      // Clause feedback analytics
      const { data: clauseFeedback, error: clauseError } = await supabase
        .from('clause_feedback')
        .select('rating, accuracy, relevance, completeness, created_at')
        .eq('user_id', userId)
        .gte('created_at', daysAgo.toISOString());

      if (!clauseError) {
        analytics.clauses = calculateClauseFeedbackMetrics(clauseFeedback || []);
      }
    }

    if (type === 'all' || type === 'documents') {
      // Document feedback analytics
      const { data: docFeedback, error: docError } = await supabase
        .from('document_feedback')
        .select('rating, aspect, created_at')
        .eq('user_id', userId)
        .gte('created_at', daysAgo.toISOString());

      if (!docError) {
        analytics.documents = calculateFeedbackMetrics(docFeedback || []);
      }
    }

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        analytics: analytics,
        summary: {
          total_feedback: Object.values(analytics).reduce((acc, curr) => acc + (curr?.total || 0), 0),
          average_rating: calculateOverallAverageRating(analytics)
        }
      }
    });

  } catch (error) {
    console.error('Get feedback analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get feedback suggestions based on AI analysis
export const getFeedbackSuggestions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { type = 'queries' } = req.query;

    // Get recent low-rated feedback
    const { data: feedback, error } = await supabase
      .from(`${type}_feedback`)
      .select('rating, feedback, created_at')
      .eq('user_id', userId)
      .lte('rating', 3)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch feedback',
        error: error.message
      });
    }

    if (!feedback || feedback.length === 0) {
      return res.json({
        success: true,
        data: {
          suggestions: [],
          message: 'No low-rated feedback found for analysis'
        }
      });
    }

    // Analyze feedback with AI
    const suggestions = await generateFeedbackSuggestions(feedback, type);

    res.json({
      success: true,
      data: {
        type: type,
        suggestions: suggestions,
        analyzed_feedback_count: feedback.length
      }
    });

  } catch (error) {
    console.error('Get feedback suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to analyze feedback with AI
const analyzeFeedbackWithAI = async (feedback, rating, query) => {
  try {
    const prompt = `
Analyze the following user feedback for a document query system:

Query: ${query.question}
Answer: ${query.answer}
Rating: ${rating}/5
Feedback: ${feedback}

Please provide insights in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "key_issues": ["issue1", "issue2"],
  "improvement_areas": ["area1", "area2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "confidence": 0.85
}

Focus on identifying patterns and actionable insights for improving the AI responses.
`;

    const model = gemini.getFlashModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('AI analysis parse error:', parseError);
    }

    return {
      sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
      key_issues: [],
      improvement_areas: [],
      suggestions: [],
      confidence: 0.5
    };

  } catch (error) {
    console.error('AI feedback analysis error:', error);
    return {
      sentiment: 'neutral',
      key_issues: [],
      improvement_areas: [],
      suggestions: [],
      confidence: 0.3
    };
  }
};

// Helper function to generate feedback suggestions
const generateFeedbackSuggestions = async (feedback, type) => {
  try {
    const feedbackText = feedback.map(f => `Rating: ${f.rating}/5, Feedback: ${f.feedback || 'No text feedback'}`).join('\n');

    const prompt = `
Analyze the following low-rated feedback for a ${type} system and provide improvement suggestions:

${feedbackText}

Please provide suggestions in JSON format:
{
  "common_issues": ["issue1", "issue2"],
  "improvement_priorities": ["priority1", "priority2"],
  "specific_suggestions": ["suggestion1", "suggestion2"],
  "system_recommendations": ["rec1", "rec2"]
}

Focus on actionable improvements for the AI system.
`;

    const model = gemini.getFlashModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestions = response.text();

    try {
      const jsonMatch = suggestions.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Suggestions parse error:', parseError);
    }

    return {
      common_issues: ['Response accuracy', 'Relevance'],
      improvement_priorities: ['Better context understanding', 'More precise answers'],
      specific_suggestions: ['Improve prompt engineering', 'Add more training data'],
      system_recommendations: ['Implement feedback loop', 'Regular model updates']
    };

  } catch (error) {
    console.error('Generate suggestions error:', error);
    return {
      common_issues: [],
      improvement_priorities: [],
      specific_suggestions: [],
      system_recommendations: []
    };
  }
};

// Helper function to calculate feedback metrics
const calculateFeedbackMetrics = (feedback) => {
  if (!feedback || feedback.length === 0) {
    return {
      total: 0,
      average_rating: 0,
      rating_distribution: {},
      trend: 'stable'
    };
  }

  const total = feedback.length;
  const averageRating = feedback.reduce((acc, f) => acc + f.rating, 0) / total;
  
  const ratingDistribution = feedback.reduce((acc, f) => {
    acc[f.rating] = (acc[f.rating] || 0) + 1;
    return acc;
  }, {});

  return {
    total,
    average_rating: parseFloat(averageRating.toFixed(2)),
    rating_distribution: ratingDistribution,
    trend: 'stable' // Could be calculated based on time series
  };
};

// Helper function to calculate clause feedback metrics
const calculateClauseFeedbackMetrics = (feedback) => {
  const baseMetrics = calculateFeedbackMetrics(feedback);
  
  if (feedback.length === 0) {
    return baseMetrics;
  }

  const accuracyAvg = feedback.reduce((acc, f) => acc + (f.accuracy || 0), 0) / feedback.length;
  const relevanceAvg = feedback.reduce((acc, f) => acc + (f.relevance || 0), 0) / feedback.length;
  const completenessAvg = feedback.reduce((acc, f) => acc + (f.completeness || 0), 0) / feedback.length;

  return {
    ...baseMetrics,
    accuracy_average: parseFloat(accuracyAvg.toFixed(2)),
    relevance_average: parseFloat(relevanceAvg.toFixed(2)),
    completeness_average: parseFloat(completenessAvg.toFixed(2))
  };
};

// Helper function to calculate overall average rating
const calculateOverallAverageRating = (analytics) => {
  const allRatings = [];
  
  Object.values(analytics).forEach(metric => {
    if (metric && metric.average_rating) {
      allRatings.push(metric.average_rating);
    }
  });

  if (allRatings.length === 0) return 0;
  
  return parseFloat((allRatings.reduce((acc, rating) => acc + rating, 0) / allRatings.length).toFixed(2));
};

