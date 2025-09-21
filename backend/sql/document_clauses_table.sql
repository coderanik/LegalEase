-- Create document_clauses table
CREATE TABLE IF NOT EXISTS document_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clause_types TEXT[] NOT NULL DEFAULT '{}',
  language VARCHAR(10) DEFAULT 'en',
  extracted_data JSONB NOT NULL DEFAULT '{}',
  extraction_status VARCHAR(20) DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_clauses_document_id ON document_clauses(document_id);
CREATE INDEX IF NOT EXISTS idx_document_clauses_user_id ON document_clauses(user_id);
CREATE INDEX IF NOT EXISTS idx_document_clauses_status ON document_clauses(extraction_status);
CREATE INDEX IF NOT EXISTS idx_document_clauses_created_at ON document_clauses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_clauses_types ON document_clauses USING GIN(clause_types);
CREATE INDEX IF NOT EXISTS idx_document_clauses_data ON document_clauses USING GIN(extracted_data);

-- Create RLS (Row Level Security) policies
ALTER TABLE document_clauses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own clauses
CREATE POLICY "Users can view their own clauses" ON document_clauses
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own clauses
CREATE POLICY "Users can insert their own clauses" ON document_clauses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own clauses
CREATE POLICY "Users can update their own clauses" ON document_clauses
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own clauses
CREATE POLICY "Users can delete their own clauses" ON document_clauses
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clauses_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_document_clauses_updated_at
  BEFORE UPDATE ON document_clauses
  FOR EACH ROW
  EXECUTE FUNCTION update_clauses_updated_at_column();
