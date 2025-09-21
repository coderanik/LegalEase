'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  FileText, 
  Users, 
  BarChart3, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useDocumentsStore } from '@/lib/store/documentsStore';

export default function DashboardPage() {
  const { documents, isLoading, fetchDocuments } = useDocumentsStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Calculate stats from documents
  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const processingDocuments = documents.filter(doc => doc.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-300">Welcome back! Here&apos;s what&apos;s happening with your legal practice.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalDocuments}</div>
            <p className="text-xs text-gray-400">
              {completedDocuments} completed, {processingDocuments} processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Completed Analysis</CardTitle>
            <Users className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{completedDocuments}</div>
            <p className="text-xs text-gray-400">
              {totalDocuments > 0 ? Math.round((completedDocuments / totalDocuments) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Processing</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{processingDocuments}</div>
            <p className="text-xs text-gray-400">
              Documents being analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalDocuments}</div>
            <p className="text-xs text-gray-400">
              Total documents uploaded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription>Your latest legal work and AI interactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Contract analysis completed
                </p>
                <p className="text-sm text-gray-400">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  AI consultation session
                </p>
                <p className="text-sm text-gray-400">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Document uploaded
                </p>
                <p className="text-sm text-gray-400">1 day ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Compliance check required
                </p>
                <p className="text-sm text-gray-400">2 days ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/assistant">
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask AI Assistant
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/documents">
                <FileText className="h-4 w-4 mr-2" />
                Upload Document
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/clients">
                <Users className="h-4 w-4 mr-2" />
                Add New Client
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Documents</CardTitle>
              <CardDescription>Your latest uploaded and analyzed documents</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/documents">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No documents uploaded yet</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/dashboard/documents">Upload Document</Link>
                </Button>
              </div>
            ) : (
              documents.slice(0, 3).map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 glass rounded-xl border border-white/10">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">{document.title || document.file_name}</p>
                      <p className="text-sm text-gray-400">
                        Uploaded {new Date(document.upload_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {document.status === 'completed' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-green-400">Analyzed</span>
                      </>
                    ) : document.status === 'processing' ? (
                      <>
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-yellow-400">Processing</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <span className="text-sm text-red-400">Failed</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
