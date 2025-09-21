import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { supabase } from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import devAuthRoutes from './routes/devAuthRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import clauseRoutes from './routes/clauseRoutes.js'
import queryRoutes from './routes/queryRoutes.js'
import getAllDocumentsRoutes from './routes/getAllDocumentsRoutes.js'
import deleteDocumentRoutes from './routes/deleteDocumentRoutes.js'
import feedbackRoutes from './routes/feedbackRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js'
import initializeGemini from './config/gemini.js'

const app = express()
const port= process.env.PORT || 5100

app.use(express.json())

// Configure CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

app.get('/', (req, res) => {
  res.send('Backend is working perfectly!')
})

// Test Gemini API connection
app.get('/test-gemini', async (req, res) => {
  try {
    const gemini = initializeGemini();
    const result = await gemini.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gemini API test failed',
      error: error.message
    });
  }
})

// Test Supabase connection
app.get('/test-supabase', async (req, res) => {
  try {
    // Test basic Supabase connection by checking auth
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      res.json({
        success: false,
        message: 'Supabase connection test failed',
        error: error.message
      });
    } else {
      res.json({
        success: true,
        message: 'Supabase connected successfully',
        hasSession: !!data.session
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Supabase connection test failed',
      error: error.message
    });
  }
})

// API routes
// Use development auth routes if DEV_AUTH is enabled
const useDevAuth = process.env.DEV_AUTH === 'true';
if (useDevAuth) {
  console.log('🔧 Using development authentication mode');
  app.use('/api/auth', devAuthRoutes);
} else {
  console.log('🔐 Using Supabase authentication mode');
  app.use('/api/auth', authRoutes);
}
app.use('/api/upload', uploadRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/clauses', clauseRoutes)
app.use('/api/query', queryRoutes)
app.use('/api/documents/all', getAllDocumentsRoutes)
app.use('/api/delete', deleteDocumentRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/health', healthRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/analytics', adminAnalyticsRoutes)

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`)
  
  // Test Supabase connection on startup
  try {
    const { data, error } = await supabase.rpc('version')
    if (error) {
      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (authError) {
        console.log('❌ Supabase connection failed:', authError.message)
      } else {
        console.log('✅ Supabase connected successfully!')
      }
    } else {
      console.log('✅ Supabase connected successfully!')
    }
  } catch (err) {
    console.log('❌ Supabase connection error:', err.message)
  }
})