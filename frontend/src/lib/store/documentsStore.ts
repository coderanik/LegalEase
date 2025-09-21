import { create } from 'zustand';
import { documentsAPI, queryAPI } from '../api';

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  user_id: string;
  status: 'processing' | 'completed' | 'failed';
  analysis_result?: any;
  clauses?: Clause[];
}

interface Clause {
  id: string;
  document_id: string;
  clause_text: string;
  clause_type: string;
  start_position: number;
  end_position: number;
  confidence_score: number;
  created_at: string;
}

interface QueryResult {
  id: string;
  document_id: string;
  query: string;
  answer: string;
  confidence_score: number;
  created_at: string;
}

interface DocumentsState {
  documents: Document[];
  currentDocument: Document | null;
  clauses: Clause[];
  queryResults: QueryResult[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  uploadProgress: number;
}

interface DocumentsActions {
  // Document management
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  getDocument: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  
  // Clauses
  fetchClauses: (documentId: string) => Promise<void>;
  
  // Query
  queryDocument: (documentId: string, query: string) => Promise<void>;
  
  // Utility
  setCurrentDocument: (document: Document | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setUploadProgress: (progress: number) => void;
}

type DocumentsStore = DocumentsState & DocumentsActions;

export const useDocumentsStore = create<DocumentsStore>((set, get) => ({
  // State
  documents: [],
  currentDocument: null,
  clauses: [],
  queryResults: [],
  isLoading: false,
  isUploading: false,
  error: null,
  uploadProgress: 0,

  // Actions
  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentsAPI.getAll();
      set({
        documents: response.data.data || [],
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch documents';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  uploadDocument: async (file: File) => {
    set({ isUploading: true, uploadProgress: 0, error: null });
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        const currentProgress = get().uploadProgress;
        if (currentProgress < 90) {
          set({ uploadProgress: currentProgress + 10 });
        }
      }, 200);

      const response = await documentsAPI.upload(formData);
      
      clearInterval(progressInterval);
      set({ uploadProgress: 100 });
      
      // Add new document to the list
      const newDocument = response.data.data;
      set((state) => ({
        documents: [newDocument, ...state.documents],
        isUploading: false,
        uploadProgress: 0,
        error: null,
      }));
      
      // Reset progress after a short delay
      setTimeout(() => {
        set({ uploadProgress: 0 });
      }, 1000);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Upload failed';
      set({
        isUploading: false,
        uploadProgress: 0,
        error: errorMessage,
      });
      throw error;
    }
  },

  getDocument: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentsAPI.getById(id);
      set({
        currentDocument: response.data.data,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to get document';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  deleteDocument: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await documentsAPI.delete(id);
      
      // Remove document from the list
      set((state) => ({
        documents: state.documents.filter(doc => doc.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete document';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  fetchClauses: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentsAPI.getClauses(documentId);
      set({
        clauses: response.data.data || [],
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch clauses';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  queryDocument: async (documentId: string, query: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await queryAPI.queryDocument(documentId, query);
      const result = response.data.data;
      
      set((state) => ({
        queryResults: [result, ...state.queryResults],
        isLoading: false,
        error: null,
      }));
      
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Query failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  setCurrentDocument: (document) => set({ currentDocument: document }),
  clearError: () => set({ error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));
