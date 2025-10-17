import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ImagePreview } from './components/ImagePreview';
import { Loader } from './components/Loader';
import { generateImage } from './services/geminiService';
import { DownloadIcon } from './components/icons';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Rate limiting state
  const MAX_REQUESTS = 30;
  const WINDOW_MINUTES = 30;
  const [requestsLeft, setRequestsLeft] = useState<number>(MAX_REQUESTS);
  const [limitResetTime, setLimitResetTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    // Initialize rate limit state from localStorage on component mount
    const storedRequests = localStorage.getItem('requestsLeft');
    const storedResetTime = localStorage.getItem('limitResetTime');

    if (storedResetTime && storedRequests) {
      const resetTime = parseInt(storedResetTime, 10);
      if (Date.now() > resetTime) {
        // The limit window has expired, reset it
        localStorage.removeItem('requestsLeft');
        localStorage.removeItem('limitResetTime');
        setRequestsLeft(MAX_REQUESTS);
        setLimitResetTime(null);
      } else {
        // Still within the limit window
        setRequestsLeft(parseInt(storedRequests, 10));
        setLimitResetTime(resetTime);
      }
    }
  }, []);

  useEffect(() => {
    // Timer effect for the countdown
    if (limitResetTime === null || requestsLeft > 0) {
      setCountdown('');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, limitResetTime - now);

      if (timeLeft === 0) {
        clearInterval(interval);
        localStorage.removeItem('requestsLeft');
        localStorage.removeItem('limitResetTime');
        setRequestsLeft(MAX_REQUESTS);
        setLimitResetTime(null);
        setCountdown('');
      } else {
        const minutes = Math.floor((timeLeft / 1000) / 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);
        setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [limitResetTime, requestsLeft]);


  const handleFilesChange = (newFiles: File[]) => {
    if (files.length + newFiles.length > 3) {
      setError(`You can upload a maximum of 3 files.`);
      return;
    }
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (requestsLeft === 0) {
        setError('Generation limit reached. Please try again later.');
        return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt to describe your desired image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateImage(files, prompt);
      setGeneratedImage(imageUrl);
      
      // Update rate limit state after a successful generation
      const newRequestsLeft = requestsLeft - 1;
      setRequestsLeft(newRequestsLeft);
      localStorage.setItem('requestsLeft', newRequestsLeft.toString());

      if (limitResetTime === null) {
        const newResetTime = Date.now() + WINDOW_MINUTES * 60 * 1000;
        setLimitResetTime(newResetTime);
        localStorage.setItem('limitResetTime', newResetTime.toString());
      }

    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred while generating the image.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl flex-grow">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-400">AI Image Editor</h1>
          <p className="text-gray-400 mt-2">Generate a new image from a prompt, or upload your own to edit.</p>
        </header>

        <main>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Upload Images to Edit (Optional)</h2>
            <FileUpload onFilesChange={handleFilesChange} />
            <ImagePreview files={files} onRemoveFile={handleRemoveFile} />
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Describe Your Image</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'A golden retriever sitting on a bench in a park' or 'Add a party hat to the person on the left'"
              className="w-full h-24 p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
            />
          </div>

          <div className="text-center">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim() || requestsLeft === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? 'Generating...' : '✨ Generate Image'}
            </button>
            <div className="mt-4 text-sm text-gray-400">
                {requestsLeft === 0 && limitResetTime ? (
                  <p>
                    Limit reached. Please try again in <span className="font-semibold text-purple-400">{countdown}</span>.
                  </p>
                ) : (
                  <p>
                    Generations remaining: <span className="font-semibold text-white">{requestsLeft}</span> / {MAX_REQUESTS}
                  </p>
                )}
            </div>
          </div>

          {error && <div className="mt-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-md text-center">{error}</div>}

          <div className="mt-8">
            {isLoading && <Loader />}
            {generatedImage && (
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-center">Your Generated Image</h2>
                <div className="relative group">
                  <img src={generatedImage} alt="Generated by AI" className="w-full max-w-md mx-auto rounded-lg shadow-xl" />
                  <a
                    href={generatedImage}
                    download="generated-image.png"
                    className="absolute bottom-4 right-4 bg-black/50 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Download image"
                  >
                    <DownloadIcon className="w-6 h-6" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <footer className="w-full text-center text-gray-500 text-sm mt-8 py-4">
        <p>Made by Rakshit Dubey</p>
        <p>&copy; {new Date().getFullYear()} AI Image Editor. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default App;