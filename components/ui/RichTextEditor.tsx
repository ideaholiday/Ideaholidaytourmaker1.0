
import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Type, RotateCcw, List, ListOrdered, Heading1, Smile, ChevronDown } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const COMMON_SYMBOLS = [
    '✓', '✅', '❌', '✈️', '🏨', '🚗', '⭐', '📍', '🕒', '🍽️', '📸', '🎟️', '🚌', '🏝️', '⚠️', '👉', '•', '—'
];

export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, className = '' }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

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

  const insertSymbol = (symbol: string) => {
    execCommand('insertText', symbol);
    setShowSymbols(false);
  };

  return (
    <div className={`border border-slate-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all ${className}`}>
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 select-none">
        
        {/* Style Group */}
        <div className="flex gap-0.5 border-r border-slate-300 pr-2 mr-1">
            <button type="button" onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition" title="Bold">
            <Bold size={16} />
            </button>
            <button type="button" onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition" title="Italic">
            <Italic size={16} />
            </button>
            <button type="button" onClick={() => execCommand('underline')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition" title="Underline">
            <Underline size={16} />
            </button>
        </div>
        
        {/* Font Group */}
        <div className="flex gap-0.5 border-r border-slate-300 pr-2 mr-1">
             <button type="button" onClick={() => execCommand('formatBlock', '<h3>')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition" title="Heading (Large Text)">
                <Heading1 size={16} />
            </button>
            <div className="flex items-center gap-1 p-1.5 rounded hover:bg-slate-200 cursor-pointer relative group">
                <Type size={16} className="text-slate-600 pointer-events-none" />
                <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 absolute -bottom-1 -right-1 border border-white"></div>
                <input 
                    type="color" 
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onChange={handleColorChange}
                    title="Text Color"
                />
            </div>
        </div>

        {/* List Group */}
        <div className="flex gap-0.5 border-r border-slate-300 pr-2 mr-1">
            <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition" title="Bullet List">
            <List size={16} />
            </button>
            <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition" title="Numbered List">
            <ListOrdered size={16} />
            </button>
        </div>

        {/* Symbols */}
        <div className="relative">
            <button 
                type="button" 
                onClick={() => setShowSymbols(!showSymbols)} 
                className={`p-1.5 rounded flex items-center gap-0.5 transition ${showSymbols ? 'bg-slate-200 text-brand-600' : 'hover:bg-slate-200 text-slate-600'}`} 
                title="Insert Symbol"
            >
                <Smile size={16} /> <ChevronDown size={10} />
            </button>
            
            {showSymbols && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSymbols(false)}></div>
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-48 grid grid-cols-6 gap-1 animate-in fade-in zoom-in-95">
                        {COMMON_SYMBOLS.map(sym => (
                            <button 
                                key={sym} 
                                type="button"
                                onClick={() => insertSymbol(sym)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded text-lg leading-none"
                            >
                                {sym}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>

        <div className="ml-auto">
            <button
            type="button"
            onClick={() => { execCommand('removeFormat'); }}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition"
            title="Clear Formatting"
            >
            <RotateCcw size={16} />
            </button>
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={contentRef}
        className="p-4 min-h-[140px] max-h-[400px] overflow-y-auto outline-none text-sm text-slate-700 max-w-none 
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 
        [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mb-1
        [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500"
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ whiteSpace: 'pre-wrap' }}
      />
      
      {!value && !isFocused && (
          <div className="absolute top-[58px] left-4 text-slate-400 text-sm pointer-events-none">
              {placeholder || 'Enter description...'}
          </div>
      )}
    </div>
  );
};
