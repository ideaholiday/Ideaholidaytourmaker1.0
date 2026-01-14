
import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  currentLogoUrl?: string;
  onLogoChange: (url: string) => void;
}

export const LogoUploader: React.FC<Props> = ({ currentLogoUrl, onLogoChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: Type
    if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG/JPG)');
        return;
    }

    // Validation: Size (Max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        setError('File size must be less than 2MB');
        return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
            onLogoChange(event.target.result as string);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
      if (fileInputRef.current) fileInputRef.current.value = '';
      onLogoChange('');
  };

  return (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Agency Logo</label>
        
        <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                {currentLogoUrl ? (
                    <>
                        <img src={currentLogoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                        <button 
                            onClick={handleRemove}
                            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                        >
                            <X size={20} />
                        </button>
                    </>
                ) : (
                    <ImageIcon className="text-slate-300" size={32} />
                )}
            </div>

            <div className="flex-1">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                >
                    <Upload size={16} /> Upload Logo
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg" 
                    onChange={handleFileChange}
                />
                <p className="text-xs text-slate-500 mt-2">
                    Recommended: Square (1:1), 512x512px. <br/>
                    Formats: PNG, JPG. Max 2MB.
                </p>
                {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
        </div>
    </div>
  );
};
