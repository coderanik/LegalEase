import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Bot, User } from 'lucide-react';

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Legal Assistant</h1>
        <p className="text-gray-600">Get instant legal advice and document analysis from our AI assistant.</p>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Chat with AI Assistant</span>
              </CardTitle>
              <CardDescription>
                Ask questions about legal matters, document analysis, or get general legal advice.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p className="text-sm">Hello! I&apos;m your AI legal assistant. How can I help you today? You can ask me about:</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Contract analysis and review</li>
                      <li>• Legal research and case law</li>
                      <li>• Document interpretation</li>
                      <li>• Compliance questions</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Ask your legal question..."
                  className="flex-1"
                />
                <Button>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Questions</CardTitle>
              <CardDescription>Common legal questions to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
                <div>
                  <div className="font-medium">Contract Review</div>
                  <div className="text-sm text-gray-500">Analyze contract terms and clauses</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
                <div>
                  <div className="font-medium">Legal Research</div>
                  <div className="text-sm text-gray-500">Find relevant case law and statutes</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
                <div>
                  <div className="font-medium">Compliance Check</div>
                  <div className="text-sm text-gray-500">Verify regulatory compliance</div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Conversations</CardTitle>
              <CardDescription>Your recent AI interactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="font-medium text-sm">Contract Analysis</div>
                <div className="text-xs text-gray-500">2 hours ago</div>
              </div>
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="font-medium text-sm">Legal Research Query</div>
                <div className="text-xs text-gray-500">1 day ago</div>
              </div>
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="font-medium text-sm">Compliance Question</div>
                <div className="text-xs text-gray-500">3 days ago</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
