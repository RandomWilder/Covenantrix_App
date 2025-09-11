import React, { useState } from 'react';
import { Search, Filter, Target, Clock, FileText, Lightbulb, Zap, AlertTriangle, TrendingUp, Shield } from '../icons';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { clsx } from 'clsx';

interface SearchResult {
  id: string;
  documentName: string;
  content: string;
  relevance: number;
  section?: string;
  highlight?: string;
}

interface SearchSuggestion {
  text: string;
  icon: React.ReactNode;
  category: string;
}

export const SearchView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory] = useState<string[]>([
    'termination clause',
    'salary negotiation',
    'intellectual property',
    'non-compete agreement'
  ]);

  const searchSuggestions: SearchSuggestion[] = [
    {
      text: 'termination clause',
      icon: <AlertTriangle size={16} className="text-red-600" />,
      category: 'Risk Analysis'
    },
    {
      text: 'salary increase provisions',
      icon: <TrendingUp size={16} className="text-green-600" />,
      category: 'Opportunities'
    },
    {
      text: 'intellectual property rights',
      icon: <Lightbulb size={16} className="text-yellow-600" />,
      category: 'Legal Terms'
    },
    {
      text: 'non-disclosure agreement',
      icon: <Shield size={16} className="text-blue-600" />,
      category: 'Legal Terms'
    },
    {
      text: 'performance bonus criteria',
      icon: <Target size={16} className="text-purple-600" />,
      category: 'Compensation'
    },
    {
      text: 'vacation policy details',
      icon: <Clock size={16} className="text-gray-600" />,
      category: 'Benefits'
    }
  ];

  const mockSearchResults: SearchResult[] = [
    {
      id: '1',
      documentName: 'Employment Contract - Asaf.docx',
      content: 'The employee may terminate this agreement with thirty (30) days written notice...',
      relevance: 95,
      section: 'Section 4.2 - Termination',
      highlight: 'terminate this agreement with thirty (30) days'
    },
    {
      id: '2',
      documentName: 'Service Agreement - TechCorp.pdf',
      content: 'Either party may terminate this service agreement immediately upon written notice...',
      relevance: 87,
      section: 'Section 6.1 - Early Termination',
      highlight: 'terminate this service agreement immediately'
    }
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Simulate API call
      setTimeout(() => {
        if (searchQuery.toLowerCase().includes('termination')) {
          setSearchResults(mockSearchResults);
        } else {
          setSearchResults([]);
        }
        setIsSearching(false);
      }, 1000);
    } catch (error) {
      console.error('Search error:', error);
      setIsSearching(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch();
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search across all your contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching} className="h-12 px-6">
            {isSearching ? (
              <div className="animate-spin mr-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Search size={16} className="mr-2" />
            )}
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter size={16} className="mr-2" />
            Advanced Filters
          </Button>
          <Button variant="outline" size="sm">
            <Target size={16} className="mr-2" />
            Smart Search
          </Button>
          <Button variant="outline" size="sm">
            <Zap size={16} className="mr-2" />
            AI Insights
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery && searchResults.length > 0 ? (
          /* Search Results */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Found {searchResults.length} results for "{searchQuery}"
              </h3>
              <div className="text-sm text-muted-foreground">
                Searched in {Math.floor(Math.random() * 500 + 100)}ms
              </div>
            </div>
            
            {searchResults.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      <span className="font-medium text-foreground">{result.documentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        result.relevance >= 90 ? "bg-green-100 text-green-800" :
                        result.relevance >= 70 ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {result.relevance}% match
                      </div>
                    </div>
                  </div>
                  
                  {result.section && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {result.section}
                    </div>
                  )}
                  
                  <p className="text-sm text-foreground leading-relaxed">
                    {result.highlight ? (
                      <>
                        {result.content.split(result.highlight)[0]}
                        <mark className="bg-yellow-200 text-yellow-900 px-1 rounded">
                          {result.highlight}
                        </mark>
                        {result.content.split(result.highlight)[1]}
                      </>
                    ) : (
                      result.content
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchQuery && !isSearching ? (
          /* No Results */
          <div className="text-center text-muted-foreground py-12">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p>Try different keywords or check your spelling</p>
          </div>
        ) : (
          /* Welcome State */
          <div className="space-y-6">
            {/* Search Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb size={20} className="text-yellow-600" />
                  Popular Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="flex items-center gap-3 p-3 text-left bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      {suggestion.icon}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {suggestion.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.category}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    Recent Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(term)}
                        className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target size={20} className="text-purple-600" />
                  Search Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-bold">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Use specific terms</p>
                        <p className="text-xs text-muted-foreground">Search for "salary increase" instead of "money"</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 text-xs font-bold">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Try different phrases</p>
                        <p className="text-xs text-muted-foreground">Use "termination clause" or "end contract"</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 text-xs font-bold">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Search by section</p>
                        <p className="text-xs text-muted-foreground">Include section numbers like "4.2" or "Schedule A"</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-yellow-600 text-xs font-bold">4</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Use AI insights</p>
                        <p className="text-xs text-muted-foreground">Let AI suggest related terms and concepts</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap size={20} className="text-orange-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleSuggestionClick('risks OR issues OR problems')}
                    className="flex flex-col items-center gap-2 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                  >
                    <AlertTriangle size={24} className="text-red-600" />
                    <span className="text-sm font-medium text-red-900">Find All Risks</span>
                    <span className="text-xs text-red-700">Identify potential issues</span>
                  </button>
                  
                  <button
                    onClick={() => handleSuggestionClick('opportunities OR benefits OR advantages')}
                    className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                  >
                    <Target size={24} className="text-green-600" />
                    <span className="text-sm font-medium text-green-900">Find Opportunities</span>
                    <span className="text-xs text-green-700">Discover improvements</span>
                  </button>
                  
                  <button
                    onClick={() => handleSuggestionClick('dates OR deadlines OR timeline')}
                    className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    <Clock size={24} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Find Dates</span>
                    <span className="text-xs text-blue-700">Check timelines</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};