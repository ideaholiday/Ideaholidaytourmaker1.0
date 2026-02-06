
import React, { useEffect, useRef, useState } from 'react';
import { 
    Bold, Italic, Underline, Strikethrough, 
    AlignLeft, AlignCenter, AlignRight, 
    List as ListIcon, ListOrdered, Link as LinkIcon, 
    Heading1, Heading2, Eraser, Undo, Redo, Type
} from 'lucide-react';

interface Props {
    label?: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    height?: string;
}

export const RichTextEditor: React.FC<Props> = ({ label, value, onChange, placeholder, height = "h-48" }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [activeFormats, setActiveFormats] = useState<string[]>([]);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
             // Only update if editor is empty or value is reset, to avoid cursor jumping
             if (!editorRef.current.innerHTML || value === '') {
                 editorRef.current.innerHTML = value;
             }
        }
    }, [value]);

    const updateActiveFormats = () => {
        const formats: string[] = [];
        if (document.queryCommandState('bold')) formats.push('bold');
        if (document.queryCommandState('italic')) formats.push('italic');
        if (document.queryCommandState('underline')) formats.push('underline');
        if (document.queryCommandState('justifyLeft')) formats.push('justifyLeft');
        if (document.queryCommandState('justifyCenter')) formats.push('justifyCenter');
        if (document.queryCommandState('justifyRight')) formats.push('justifyRight');
        if (document.queryCommandState('insertUnorderedList')) formats.push('insertUnorderedList');
        if (document.queryCommandState('insertOrderedList')) formats.push('insertOrderedList');
        setActiveFormats(formats);
    };

    const exec = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        updateActiveFormats();
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');

        if (html) {
            // Smart Clean: Remove AI/Web styles (backgrounds, fonts) but keep structure
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            // Strip style attributes and classes
            const elements = temp.querySelectorAll('*');
            elements.forEach(el => {
                el.removeAttribute('style');
                el.removeAttribute('class');
            });
            
            document.execCommand('insertHTML', false, temp.innerHTML);
        } else {
            // Fallback for plain text
            document.execCommand('insertText', false, text);
        }
        
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const ToolbarButton = ({ onClick, icon, title, formatKey }: any) => {
        const isActive = formatKey && activeFormats.includes(formatKey);
        return (
            <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onClick(); }}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                    isActive 
                    ? 'bg-brand-100 text-brand-700 shadow-inner' 
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
                title={title}
            >
                {icon}
            </button>
        );
    };

    const Separator = () => <div className="w-px h-5 bg-slate-300 mx-1.5 self-center opacity-50"></div>;

    return (
        <div className="w-full group">
            {label && <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">{label}</label>}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
                
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-0.5 p-2 bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                    
                    {/* Headings */}
                    <div className="flex gap-0.5 bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                        <ToolbarButton onClick={() => exec('formatBlock', 'P')} icon={<Type size={16} />} title="Normal Text" />
                        <ToolbarButton onClick={() => exec('formatBlock', 'H3')} icon={<Heading1 size={16} />} title="Heading 1" />
                        <ToolbarButton onClick={() => exec('formatBlock', 'H4')} icon={<Heading2 size={16} />} title="Heading 2" />
                    </div>
                    <Separator />

                    {/* Formatting */}
                    <div className="flex gap-0.5 bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                        <ToolbarButton onClick={() => exec('bold')} icon={<Bold size={16} />} title="Bold" formatKey="bold" />
                        <ToolbarButton onClick={() => exec('italic')} icon={<Italic size={16} />} title="Italic" formatKey="italic" />
                        <ToolbarButton onClick={() => exec('underline')} icon={<Underline size={16} />} title="Underline" formatKey="underline" />
                        <ToolbarButton onClick={() => exec('strikeThrough')} icon={<Strikethrough size={16} />} title="Strikethrough" />
                    </div>
                    <Separator />

                    {/* Lists */}
                    <div className="flex gap-0.5 bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                        <ToolbarButton onClick={() => exec('insertUnorderedList')} icon={<ListIcon size={16} />} title="Bullet List" formatKey="insertUnorderedList" />
                        <ToolbarButton onClick={() => exec('insertOrderedList')} icon={<ListOrdered size={16} />} title="Numbered List" formatKey="insertOrderedList" />
                    </div>
                    <Separator />
                    
                    {/* Alignment */}
                    <div className="flex gap-0.5 bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                        <ToolbarButton onClick={() => exec('justifyLeft')} icon={<AlignLeft size={16} />} title="Align Left" formatKey="justifyLeft" />
                        <ToolbarButton onClick={() => exec('justifyCenter')} icon={<AlignCenter size={16} />} title="Align Center" formatKey="justifyCenter" />
                        <ToolbarButton onClick={() => exec('justifyRight')} icon={<AlignRight size={16} />} title="Align Right" formatKey="justifyRight" />
                    </div>
                    
                     <div className="flex-1"></div>

                    {/* Utilities */}
                    <div className="flex gap-0.5">
                        <ToolbarButton onClick={() => {
                            const url = prompt('Enter URL:');
                            if(url) exec('createLink', url);
                        }} icon={<LinkIcon size={16} />} title="Link" />
                        <ToolbarButton onClick={() => exec('removeFormat')} icon={<Eraser size={16} />} title="Clear Formatting" />
                        <ToolbarButton onClick={() => exec('undo')} icon={<Undo size={16} />} title="Undo" />
                        <ToolbarButton onClick={() => exec('redo')} icon={<Redo size={16} />} title="Redo" />
                    </div>
                </div>
                
                {/* Editor Content Area */}
                <div 
                    ref={editorRef}
                    contentEditable
                    className={`w-full p-6 text-sm outline-none overflow-y-auto prose prose-sm max-w-none ${height} cursor-text bg-white`}
                    onInput={(e) => onChange(e.currentTarget.innerHTML)}
                    onKeyUp={updateActiveFormats}
                    onMouseUp={updateActiveFormats}
                    onPaste={handlePaste}
                    data-placeholder={placeholder}
                    style={{ minHeight: '150px' }}
                />
            </div>
            <div className="flex justify-between mt-1 px-1">
                <p className="text-[10px] text-slate-400">Smart Paste Active (ChatGPT/Web Friendly)</p>
                <p className="text-[10px] text-slate-400">{value.length} chars</p>
            </div>
        </div>
    );
};
