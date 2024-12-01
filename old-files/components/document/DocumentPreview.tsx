import React from 'react';
import { FileText, X } from 'lucide-react';
import { FileUpload } from '@/types/conversation';

interface DocumentPreviewProps {
  attachment: FileUpload;
  onRemove: (id: string) => void;
}

export const DocumentPreview = ({ attachment, onRemove }: DocumentPreviewProps) => {
  return (
    <div className="relative group">
      {attachment.type === 'image' && attachment.preview ? (
        <img 
          src={attachment.preview} 
          alt="Preview" 
          className="w-24 h-24 object-cover rounded-lg"
        />
      ) : (
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <button
        onClick={() => onRemove(attachment.id)}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white/90 px-2 py-0.5 rounded-full">
        {attachment.file.name.slice(0, 15)}...
      </span>
    </div>
  );
}; 