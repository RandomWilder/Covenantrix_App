import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, Copy, Check, Lightbulb, Search, BarChart3 } from '../icons';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { clsx } from 'clsx';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  copied?: boolean;
}

export const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const copyToClipboard = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setChatHistory(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, copied: true }
          : { ...msg, copied: false }
      ));
      
      // Reset copied status after 2 seconds
      setTimeout(() => {
        setChatHistory(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, copied: false } : msg
        ));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatMessage = (content: string) => {
    // Basic markdown-like formatting
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    return { __html: formatted };
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const result = await window.electronAPI.testLLM(userMessage.content);
      
      let responseContent: string;
      if (result.success) {
        responseContent = result.data?.response || 'No response received from AI';
      } else {
        responseContent = `Error: ${result.error || 'Unknown error occurred'}`;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Welcome to Covenantrix AI</h3>
            <p>Use intelligent search to find specific clauses, terms, or insights across your contract portfolio</p>
            <div className="mt-6 grid grid-cols-1 gap-2 max-w-md mx-auto text-sm">
              <div className="bg-muted rounded-lg p-3 text-left cursor-pointer hover:bg-muted/80 transition-colors" 
                   onClick={() => setMessage('Find termination clauses')}>
                <Search className="inline mr-2" size={14} />
                "termination clause"
              </div>
              <div className="bg-muted rounded-lg p-3 text-left cursor-pointer hover:bg-muted/80 transition-colors"
                   onClick={() => setMessage('Show salary increase provisions')}>
                <BarChart3 className="inline mr-2" size={14} />
                "salary increase provisions"
              </div>
              <div className="bg-muted rounded-lg p-3 text-left cursor-pointer hover:bg-muted/80 transition-colors"
                   onClick={() => setMessage('Find intellectual property rights')}>
                <Lightbulb className="inline mr-2" size={14} />
                "intellectual property rights"
              </div>
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card className={clsx(
                  'max-w-[70%] group relative',
                  chat.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card'
                )}>
                  <CardContent className="p-3">
                    <div 
                      className="text-sm"
                      dangerouslySetInnerHTML={formatMessage(chat.content)}
                    />
                    {chat.type === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background border shadow-sm"
                        onClick={() => copyToClipboard(chat.id, chat.content)}
                      >
                        {chat.copied ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm text-muted-foreground">Analyzing your contracts...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about your contracts..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};