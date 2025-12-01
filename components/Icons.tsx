import React from 'react';
import { Upload, X, Search, History, ChevronRight, Loader2, Info, ArrowLeft } from 'lucide-react';

interface IconProps {
  className?: string;
}

export const UploadIcon = ({ className }: IconProps) => <Upload className={className || "w-6 h-6"} />;
export const CloseIcon = ({ className }: IconProps) => <X className={className || "w-5 h-5"} />;
export const SearchIcon = ({ className }: IconProps) => <Search className={className || "w-5 h-5"} />;
export const HistoryIcon = ({ className }: IconProps) => <History className={className || "w-5 h-5"} />;
export const ChevronRightIcon = ({ className }: IconProps) => <ChevronRight className={className || "w-4 h-4"} />;
export const LoaderIcon = ({ className }: IconProps) => <Loader2 className={className || "w-8 h-8 animate-spin text-egypt-600"} />;
export const InfoIcon = ({ className }: IconProps) => <Info className={className || "w-4 h-4"} />;
export const ArrowLeftIcon = ({ className }: IconProps) => <ArrowLeft className={className || "w-5 h-5"} />;