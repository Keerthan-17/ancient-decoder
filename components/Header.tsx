import React from 'react';
import { HistoryIcon } from './Icons';

interface HeaderProps {
  onToggleHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => {
  return (
    <header className="h-16 bg-white border-b border-egypt-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-egypt-600 rounded-md flex items-center justify-center text-white font-serif font-bold text-lg">
          📜
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-wide">
          Ancient<span className="text-egypt-600">Decoder</span>
        </h1>
      </div>
      
      <button 
        onClick={onToggleHistory}
        className="p-2 hover:bg-egypt-50 rounded-full transition-colors text-egypt-800 flex items-center gap-2"
      >
        <span className="text-sm font-medium hidden sm:block">History</span>
        <HistoryIcon />
      </button>
    </header>
  );
};