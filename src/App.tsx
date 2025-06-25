import React, { useState, useEffect } from 'react';
import { Link, Copy, ExternalLink, Zap, Shield, BarChart3 } from 'lucide-react';

interface ShortenedUrl {
  id: string;
  longUrl: string;
  shortUrl: string;
  createdAt: string;
}

function App() {
  const [longUrl, setLongUrl] = useState('');
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  // Load saved URLs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shortenedUrls');
    if (saved) {
      setShortenedUrls(JSON.parse(saved));
    }
  }, []);

  // Save URLs to localStorage
  const saveToStorage = (urls: ShortenedUrl[]) => {
    localStorage.setItem('shortenedUrls', JSON.stringify(urls));
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const generateShortId = (): string => {
    return Math.random().toString(36).substring(2, 8);
  };

  const handleShorten = async () => {
    if (!longUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!validateUrl(longUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call - in production, this would call your AWS API Gateway
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const shortId = generateShortId();
      const newUrl: ShortenedUrl = {
        id: shortId,
        longUrl,
        shortUrl: `https://short.ly/${shortId}`, // Replace with your actual domain
        createdAt: new Date().toISOString()
      };

      const updatedUrls = [newUrl, ...shortenedUrls];
      setShortenedUrls(updatedUrls);
      saveToStorage(updatedUrls);
      setLongUrl('');
    } catch (err) {
      setError('Failed to shorten URL. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  const clearHistory = () => {
    setShortenedUrls([]);
    localStorage.removeItem('shortenedUrls');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg">
                <Link className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ZURL</h1>
                <p className="text-sm text-gray-500">AWS-Powered URL Shortener</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Serverless</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-teal-600" />
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Shorten URLs with
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent"> AWS Power</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform long URLs into short, shareable links with enterprise-grade AWS infrastructure.
            Fast, reliable, and secure.
          </p>
        </div>

        {/* URL Shortener Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your long URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="url"
                  value={longUrl}
                  onChange={(e) => {
                    setLongUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://example.com/very-long-url-that-needs-shortening"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Link className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 animate-fadeIn">{error}</p>
              )}
            </div>

            <button
              onClick={handleShorten}
              disabled={isLoading || !longUrl.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Shortening...</span>
                </div>
              ) : (
                'Shorten URL'
              )}
            </button>
          </div>
        </div>

        {/* URL History */}
        {shortenedUrls.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Your Shortened URLs</h3>
              <button
                onClick={clearHistory}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Clear History
              </button>
            </div>

            <div className="space-y-4">
              {shortenedUrls.map((url) => (
                <div
                  key={url.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-lg font-medium text-blue-600 truncate">
                          {url.shortUrl}
                        </p>
                        <button
                          onClick={() => copyToClipboard(url.shortUrl, url.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Copy className={`w-4 h-4 ${copiedId === url.id ? 'text-green-600' : 'text-gray-400'}`} />
                        </button>
                        {copiedId === url.id && (
                          <span className="text-xs text-green-600 animate-pulse">Copied!</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {url.longUrl}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created {new Date(url.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={url.longUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Powered by AWS Lambda for instant URL shortening and redirects.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
            <p className="text-gray-600">Enterprise-grade security with AWS infrastructure and monitoring.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Ready</h3>
            <p className="text-gray-600">Built-in CloudWatch logging for comprehensive analytics and monitoring.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>Built with AWS Lambda, DynamoDB, and API Gateway</p>
            <p className="text-sm mt-2">Serverless • Scalable • Secure</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;