
import React from 'react';

interface Props {
  label: string;
  color: string;
  onChange: (color: string) => void;
  defaultColor: string;
}

export const BrandColorPicker: React.FC<Props> = ({ label, color, onChange, defaultColor }) => {
  return (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <div className="flex items-center gap-2">
            <input 
                type="color" 
                value={color || defaultColor}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-16 p-1 rounded border border-slate-300 cursor-pointer"
            />
            <input 
                type="text" 
                value={color || defaultColor}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase font-mono"
                maxLength={7}
            />
            <button 
                onClick={() => onChange(defaultColor)}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
                Reset
            </button>
        </div>
    </div>
  );
};
