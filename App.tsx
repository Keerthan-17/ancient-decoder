import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageCanvas } from './components/ImageCanvas';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadIcon, ArrowLeftIcon } from './components/Icons';
import { analyzeHieroglyph } from './services/translationService';
import { TranslationResult, BoundingBox } from './types';

function App() {
  // State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [currentResult, setCurrentResult] = useState<TranslationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rosetta_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  // Save history on change
  useEffect(() => {
    localStorage.setItem('rosetta_history', JSON.stringify(history));
  }, [history]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setCurrentResult(null); // Clear previous result
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBoxComplete = async (box: BoundingBox, dataUrl: string) => {
    setIsAnalyzing(true);
    setCurrentResult(null);

    try {
      // Call the service (which simulates the CNN backend)
      const result = await analyzeHieroglyph(dataUrl);
      
      setCurrentResult(result);
      
      // Update history
      setHistory(prev => [result, ...prev].slice(0, 20)); // Keep last 20
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Failed to analyze symbol. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setCurrentResult(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-egypt-50 text-gray-800 overflow-hidden">
      <Header onToggleHistory={() => setShowHistory(!showHistory)} />

      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left / Main Area: Image Workspace */}
        <div className="flex-1 flex flex-col relative z-10 transition-all duration-300">
          {!imageSrc ? (
            // Upload State
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="bg-white p-12 rounded-2xl shadow-xl border-2 border-dashed border-egypt-200 text-center max-w-lg w-full">
                <div className="w-20 h-20 bg-egypt-100 text-egypt-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UploadIcon />
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">Upload Artifact</h2>
                <p className="text-gray-500 mb-8">Upload a clear image of Egyptian Hieroglyphs to begin translation.</p>
                
                <label className="inline-flex items-center justify-center px-8 py-4 bg-egypt-600 hover:bg-egypt-700 text-white rounded-lg cursor-pointer transition-transform hover:scale-105 shadow-md">
                  <span className="font-bold tracking-wide">Select Image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
              </div>
            </div>
          ) : (
            // Workspace State
            <div className="h-full flex flex-col">
              <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between flex-shrink-0">
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-egypt-700 transition-colors"
                >
                  <ArrowLeftIcon /> Back to Upload
                </button>
                <div className="text-sm font-medium text-gray-400">
                  Draw a box around a symbol
                </div>
              </div>
              
              <div className="flex-1 relative bg-gray-100 overflow-hidden">
                <ImageCanvas imageSrc={imageSrc} onBoxComplete={handleBoxComplete} />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Results */}
        {imageSrc && (
          <div className="w-96 bg-white shadow-2xl z-20 flex-shrink-0 border-l border-egypt-200">
             <ResultsPanel isLoading={isAnalyzing} result={currentResult} />
          </div>
        )}

        {/* History Sidebar Overlay (Optional Enhancement) */}
        {showHistory && (
          <div className="absolute inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform border-l border-egypt-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-egypt-50">
              <h2 className="font-serif font-bold text-gray-800">Recent Discoveries</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-red-500">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.length === 0 && <p className="text-center text-gray-400 mt-10">No history yet.</p>}
              {history.map((item) => (
                <div key={item.id} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 cursor-pointer transition-all"
                  onClick={() => {
                    setCurrentResult(item);
                    setShowHistory(false);
                  }}
                >
                   <img src={item.croppedImageBase64} className="w-12 h-12 object-contain bg-gray-100 rounded border border-gray-200" alt="thumb" />
                   <div>
                      <p className="font-bold text-sm text-gray-800">{item.predictions[0]?.symbol || "Unknown"}</p>
                      <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;