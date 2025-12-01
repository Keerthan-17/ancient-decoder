import React from 'react';
import { TranslationResult, Prediction } from '../types';
import { LoaderIcon, InfoIcon } from './Icons';

interface ResultsPanelProps {
  isLoading: boolean;
  result: TranslationResult | null;
}

const ProbabilityBar: React.FC<{ value: number }> = ({ value }) => {
  const percentage = Math.round(value * 100);
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-1">
      <div 
        className="h-full bg-egypt-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ isLoading, result }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <LoaderIcon />
        <h3 className="text-xl font-serif text-egypt-800">Deciphering...</h3>
        <p className="text-gray-500 text-sm">Consulting the ancient records</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
        <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg mb-4 flex items-center justify-center">
          <span className="text-2xl">?</span>
        </div>
        <p>Select a symbol on the image to translate it.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-white">
      <div className="mb-6 flex items-start gap-4 pb-6 border-b border-gray-100">
        <div className="w-20 h-20 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
          <img 
            src={result.croppedImageBase64} 
            alt="Selected symbol" 
            className="w-full h-full object-contain p-2"
          />
        </div>
        <div>
          <h2 className="text-lg font-bold font-serif text-gray-800">Analysis Result</h2>
          <p className="text-xs text-gray-500 mt-1">ID: {result.id.slice(0, 8)}</p>
          <p className="text-xs text-gray-500">Detected {result.predictions.length} potential matches</p>
        </div>
      </div>

      <div className="space-y-6">
        {result.predictions.map((pred, index) => (
          <div 
            key={index} 
            className={`
              relative p-4 rounded-xl border transition-all duration-200
              ${index === 0 
                ? 'bg-egypt-50 border-egypt-300 shadow-sm' 
                : 'bg-white border-gray-100 hover:border-egypt-200'
              }
            `}
          >
            {index === 0 && (
              <div className="absolute -top-3 -right-3 bg-egypt-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                BEST MATCH
              </div>
            )}
            
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-800 font-serif">
                  {pred.symbol} 
                  {pred.gardinerCode && <span className="text-sm font-sans font-normal text-gray-500 ml-2">({pred.gardinerCode})</span>}
                </h3>
                <p className="text-sm font-medium text-egypt-700">{pred.meaning}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">{(pred.probability * 100).toFixed(1)}%</span>
              </div>
            </div>

            <ProbabilityBar value={pred.probability} />

            <div className="mt-4 flex gap-2 text-sm text-gray-600 bg-white/50 p-3 rounded-lg">
              <InfoIcon className="w-4 h-4 text-egypt-600 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{pred.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};