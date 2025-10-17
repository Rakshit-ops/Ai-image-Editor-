
import React from 'react';

interface ImagePreviewProps {
  files: File[];
  onRemoveFile: (index: number) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ files, onRemoveFile }) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid grid-cols-3 gap-4">
      {files.map((file, index) => (
        <div key={index} className="relative group">
          <img
            src={URL.createObjectURL(file)}
            alt={`preview ${index}`}
            className="w-full h-24 object-cover rounded-md"
            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
          />
          <button
            onClick={() => onRemoveFile(index)}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};
