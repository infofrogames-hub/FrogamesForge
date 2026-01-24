
import React, { useRef } from 'react';

interface ImageUploaderProps {
  image: string | null;
  onImageUpload: (base64: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ image, onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-2 text-slate-300">Scatola del Gioco (Immagine)</label>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative h-64 w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          image ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
        }`}
      >
        {image ? (
          <img src={image} alt="Preview" className="h-full w-full object-contain p-2 rounded-2xl" />
        ) : (
          <div className="text-center p-6">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-400 font-medium">Trascina o clicca per caricare</p>
            <p className="text-xs text-slate-500 mt-2">JPEG, PNG supportati</p>
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      {image && (
        <button 
          onClick={() => onImageUpload('')}
          className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors font-semibold"
        >
          Rimuovi immagine
        </button>
      )}
    </div>
  );
};
