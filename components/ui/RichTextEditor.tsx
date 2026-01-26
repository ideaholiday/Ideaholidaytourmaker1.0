
import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Type, RotateCcw } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, className = '' }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value changes if not focused (to prevent cursor jumping)
  useEffect(() => {
    if (contentRef.current && !isFocused && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value;
    }
  }, [value, isFocused]);

  const handleInput = () => {
    if (contentRef.current) {
      const html = contentRef.current.innerHTML;
      onChange(html);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    handleInput(); // Trigger change
    if(contentRef.current) contentRef.current.focus();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand('foreColor', e.target.value);
  };

  return (
    <div className={`border border-slate-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all ${className}`}>
      
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition"
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition"
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition"
          title="Underline"
        >
          <Underline size={16} />
        </button>
        
        <div className="h-4 w-px bg-slate-300 mx-1"></div>
        
        <div className="flex items-center gap-1 p-1.5 rounded hover:bg-slate-200 cursor-pointer relative group">
           <Type size={16} className="text-slate-600 pointer-events-none" />
           <input 
              type="color" 
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              onChange={handleColorChange}
              title="Text Color"
           />
        </div>

        <div className="h-4 w-px bg-slate-300 mx-1"></div>

        <button
          type="button"
          onClick={() => { execCommand('removeFormat'); }}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition"
          title="Clear Formatting"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={contentRef}
        className="p-3 min-h-[120px] max-h-[300px] overflow-y-auto outline-none text-sm text-slate-700 prose prose-sm max-w-none"
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ whiteSpace: 'pre-wrap' }}
      />
      
      {!value && !isFocused && (
          <div className="absolute top-[50px] left-3 text-slate-400 text-sm pointer-events-none">
              {placeholder || 'Enter description...'}
          </div>
      )}
    </div>
  );
};
