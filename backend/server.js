import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { supabase } from './config/db.js'
import authRoutes from './routes/authRoutes.js'
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
app.use(cors())

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

// API routes
app.use('/api/auth', authRoutes)
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