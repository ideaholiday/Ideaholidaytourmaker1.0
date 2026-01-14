
import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

interface Props {
  data: any[];
  headers: string[]; // Keys in data object corresponding to CSV columns
  filename: string;
  onImport: (data: any[]) => void;
  label?: string;
}

export const InventoryImportExport: React.FC<Props> = ({ data, headers, filename, onImport, label }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Basic CSV construction
    const csvRows = [];
    
    // 1. Header Row
    csvRows.push(headers.join(','));

    // 2. Data Rows
    data.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        
        // Handle boolean/undefined
        if (val === undefined || val === null) val = '';
        if (typeof val === 'boolean') val = val ? 'TRUE' : 'FALSE';
        
        // Handle strings with commas or quotes
        const stringVal = String(val);
        const escaped = stringVal.replace(/"/g, '""'); // Escape double quotes
        return `"${escaped}"`; // Wrap in quotes
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const rows = text.split('\n').map(r => r.trim()).filter(r => r);
      if (rows.length < 2) {
          alert("Invalid CSV: No data found.");
          return;
      }

      // Parse Header
      const csvHeaders = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const parsedData: any[] = [];

      // Parse Rows
      for (let i = 1; i < rows.length; i++) {
        // Naive split by comma (assuming simple data or standard quotes)
        // For complex CSVs with commas inside quotes, a regex or library is better.
        // This regex handles basic quoted CSV fields:
        const values = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        
        // Fallback if match fails or simple split needed
        const cleanValues = values.length > 0 
            ? values.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')) 
            : rows[i].split(',').map(v => v.trim());

        const obj: any = {};
        
        // Map values to expected keys
        // We iterate over the *File's* headers to map to the *Object* keys
        // This allows columns to be in any order in the CSV as long as header names match props
        csvHeaders.forEach((h, index) => {
            // Only map if this header is one we expect
            if (headers.includes(h)) {
                let val = cleanValues[index];
                // Basic type inference
                if (val === 'TRUE') val = true;
                if (val === 'FALSE') val = false;
                // If it looks like a number, parse it (careful with IDs that look like numbers)
                if (!isNaN(Number(val)) && val !== '' && h !== 'id' && !h.endsWith('Id')) {
                    val = Number(val);
                }
                obj[h] = val;
            }
        });
        parsedData.push(obj);
      }
      
      if (parsedData.length > 0) {
          if (window.confirm(`Ready to import ${parsedData.length} records. Proceed?`)) {
              onImport(parsedData);
          }
      } else {
          alert("No valid data could be parsed from the file.");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={handleExport}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition shadow-sm"
        title="Download CSV"
      >
        <Download size={16} /> Export
      </button>
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition shadow-sm"
        title="Upload CSV"
      >
        <Upload size={16} /> Import
      </button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".csv" 
        className="hidden" 
      />
    </div>
  );
};
