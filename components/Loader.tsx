
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-500"></div>
      <p className="mt-4 text-lg font-semibold text-gray-300">AI is thinking...</p>
      <p className="text-sm text-gray-500">This might take a moment.</p>
    </div>
  );
};
