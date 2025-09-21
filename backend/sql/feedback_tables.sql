-- Create query_feedback table
CREATE TABLE IF NOT EXISTS query_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES document_queries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  feedback_type VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clause_feedback table
CREATE TABLE IF NOT EXISTS clause_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id UUID NOT NULL REFERENCES document_clauses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  accuracy INTEGER CHECK (accuracy >= 1 AND accuracy <= 5),
  relevance INTEGER CHECK (relevance >= 1 AND relevance <= 5),
  completeness INTEGER CHECK (completeness >= 1 AND completeness <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_feedback table
CREATE TABLE IF NOT EXISTS document_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  aspect VARCHAR(50) DEFAULT 'overall',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_queries table
CREATE TABLE IF NOT EXISTS document_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  context VARCHAR(50) DEFAULT 'general',
  language VARCHAR(10) DEFAULT 'en',
  confidence DECIMAL(3,2) DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_query_feedback_query_id ON query_feedback(query_id);
CREATE INDEX IF NOT EXISTS idx_query_feedback_user_id ON query_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_query_feedback_rating ON query_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_query_feedback_created_at ON query_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clause_feedback_clause_id ON clause_feedback(clause_id);
CREATE INDEX IF NOT EXISTS idx_clause_feedback_user_id ON clause_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_clause_feedback_rating ON clause_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_clause_feedback_created_at ON clause_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_feedback_document_id ON document_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_document_feedback_user_id ON document_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_document_feedback_rating ON document_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_document_feedback_created_at ON document_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_queries_document_id ON document_queries(document_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_user_id ON document_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_created_at ON document_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_queries_question ON document_queries USING gin(to_tsvector('english', question));

-- Create RLS (Row Level Security) policies
ALTER TABLE query_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_queries ENABLE ROW LEVEL SECURITY;

-- Query feedback policies
CREATE POLICY "Users can view their own query feedback" ON query_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own query feedback" ON query_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own query feedback" ON query_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own query feedback" ON query_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Clause feedback policies
CREATE POLICY "Users can view their own clause feedback" ON clause_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clause feedback" ON clause_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clause feedback" ON clause_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clause feedback" ON clause_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Document feedback policies
CREATE POLICY "Users can view their own document feedback" ON document_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document feedback" ON document_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document feedback" ON document_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document feedback" ON document_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Document queries policies
CREATE POLICY "Users can view their own document queries" ON document_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document queries" ON document_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document queries" ON document_queries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document queries" ON document_queries
  FOR DELETE USING (auth.uid() = user_id);

