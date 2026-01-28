
import React, { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/adminService';
import { Destination, Hotel } from '../../types';
import { User } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    user: User | null;
}

interface ParsedRow {
    name: string;
    city: string;
    category: string;
    roomType: string;
    plan: string;
    rate: number;
    season: string;
    validFrom: string;
    validTo: string;
    description: string;
    // Internal
    isValid: boolean;
    errors: string[];
    destinationId?: string;
    mappedPlan?: 'RO' | 'BB' | 'HB' | 'FB' | 'AI';
}

export const HotelBulkUploadModal: React.FC<Props> = ({ isOpen, onClose, onComplete, user }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [destinations, setDestinations] = useState<Destination[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            setDestinations(adminService.getDestinationsSync());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- TEMPLATE GENERATION ---
    const handleDownloadTemplate = () => {
        const headers = [
            'Hotel Name', 'City', 'Category (3 Star/4 Star/5 Star)', 
            'Room Type', 'Plan (RO/CP/MAP/AP)', 'Net Rate', 
            'Season (Peak/Off-Peak)', 'Valid From (YYYY-MM-DD)', 'Valid To (YYYY-MM-DD)', 'Description'
        ];
        
        const sampleData = [
            ['Grand Hyatt', 'Dubai', '5 Star', 'Deluxe Room', 'CP', 12000, 'Off-Peak', '2024-01-01', '2024-12-31', 'Luxury stay near creek'],
            ['Citymax Bur Dubai', 'Dubai', '3 Star', 'Standard Room', 'RO', 4500, 'Peak', '2024-01-01', '2024-03-31', 'Budget city hotel']
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        
        // Auto-width
        const wscols = headers.map(h => ({ wch: h.length + 5 }));
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "hotel_bulk_upload_template.xlsx");
    };

    // --- PARSING LOGIC ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // Skip header row
                const rows = data.slice(1) as any[][];
                
                const parsed: ParsedRow[] = rows.map((row, idx) => {
                    const validation: ParsedRow = {
                        name: row[0],
                        city: row[1],
                        category: row[2],
                        roomType: row[3],
                        plan: row[4],
                        rate: row[5],
                        season: row[6],
                        validFrom: parseExcelDate(row[7]),
                        validTo: parseExcelDate(row[8]),
                        description: row[9] || '',
                        isValid: true,
                        errors: []
                    };

                    // 1. Validate Required
                    if (!validation.name || !validation.city || !validation.rate) {
                        validation.isValid = false;
                        validation.errors.push('Missing required fields');
                    }

                    // 2. Validate City Mapping
                    const matchedDest = destinations.find(d => 
                        d.city.toLowerCase() === (validation.city || '').toLowerCase() ||
                        d.country.toLowerCase() === (validation.city || '').toLowerCase()
                    );
                    
                    if (matchedDest) {
                        validation.destinationId = matchedDest.id;
                    } else {
                        validation.isValid = false;
                        validation.errors.push('City not found in system');
                    }

                    // 3. Map Meal Plan
                    const planUpper = (validation.plan || '').toUpperCase();
                    const mapPlan: Record<string, 'RO' | 'BB' | 'HB' | 'FB'> = {
                        'RO': 'RO', 'EP': 'RO', 'ROOM ONLY': 'RO',
                        'CP': 'BB', 'BB': 'BB', 'BREAKFAST': 'BB',
                        'MAP': 'HB', 'HB': 'HB', 'HALF BOARD': 'HB',
                        'AP': 'FB', 'FB': 'FB', 'FULL BOARD': 'FB', 'AI': 'AI' as any
                    };
                    
                    if (mapPlan[planUpper]) {
                        validation.mappedPlan = mapPlan[planUpper];
                    } else {
                        validation.mappedPlan = 'BB'; // Default fallback
                        // Not an error, just fallback
                    }
                    
                    // 4. Validate Numbers
                    if (isNaN(Number(validation.rate))) {
                        validation.isValid = false;
                        validation.errors.push('Invalid Rate');
                    }

                    return validation;
                });

                // Filter out completely empty rows
                const finalRows = parsed.filter(r => r.name || r.city);
                setParsedRows(finalRows);

            } catch (err) {
                console.error(err);
                alert("Failed to parse file. Please use the template.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    // Helper to handle Excel dates
    const parseExcelDate = (val: any): string => {
        if (!val) return new Date().toISOString().split('T')[0];
        // Excel serial date
        if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569)*86400*1000));
            return date.toISOString().split('T')[0];
        }
        // String
        return String(val);
    };

    // --- IMPORT ACTION ---
    const handleImport = async () => {
        const validRows = parsedRows.filter(r => r.isValid);
        if (validRows.length === 0) return;

        setIsUploading(true);
        try {
            const hotelsToCreate: Hotel[] = validRows.map(row => ({
                id: '', // Will be generated
                name: row.name,
                destinationId: row.destinationId!,
                category: (row.category || '4 Star') as any,
                roomType: row.roomType || 'Standard',
                mealPlan: row.mappedPlan as any,
                cost: Number(row.rate),
                costType: 'Per Room', // Default for bulk
                season: (row.season || 'Off-Peak') as any,
                validFrom: row.validFrom,
                validTo: row.validTo,
                currency: 'INR', // Enforced
                isActive: true,
                description: row.description,
                createdBy: user?.id
            }));

            await adminService.bulkCreateHotels(hotelsToCreate);
            onComplete();
            onClose();
            alert(`Successfully imported ${hotelsToCreate.length} hotels!`);
        } catch (e: any) {
            alert("Import failed: " + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const validCount = parsedRows.filter(r => r.isValid).length;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="text-green-600" /> Bulk Hotel Upload
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Upload inventory via Excel (.xlsx) or CSV.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                </div>

                {/* Toolbar */}
                <div className="p-4 bg-white border-b border-slate-100 flex gap-4 items-center">
                     <button 
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                     >
                         <Download size={16} /> Download Template
                     </button>
                     
                     <div className="h-8 w-px bg-slate-200"></div>

                     <div className="relative">
                         <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".xlsx, .xls, .csv" 
                            className="hidden"
                         />
                         <button 
                             onClick={() => fileInputRef.current?.click()}
                             className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 border border-blue-100"
                         >
                             <Upload size={16} /> Select File
                         </button>
                     </div>
                     
                     {parsedRows.length > 0 && (
                         <div className="ml-auto text-sm text-slate-600">
                             Found <strong className="text-slate-900">{parsedRows.length}</strong> rows. 
                             Valid: <strong className="text-green-600">{validCount}</strong>.
                         </div>
                     )}
                </div>

                {/* Preview Table */}
                <div className="flex-1 overflow-auto bg-slate-50 p-4">
                    {parsedRows.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <FileSpreadsheet size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">No data loaded.</p>
                            <p className="text-sm">Download the template, fill it, and upload here.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Hotel Name</th>
                                        <th className="px-4 py-3">City</th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Rate</th>
                                        <th className="px-4 py-3">Validity</th>
                                        <th className="px-4 py-3">Issues</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {parsedRows.map((row, idx) => (
                                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50 hover:bg-red-100'}>
                                            <td className="px-4 py-2">
                                                {row.isValid ? (
                                                    <CheckCircle size={16} className="text-green-500" />
                                                ) : (
                                                    <AlertTriangle size={16} className="text-red-500" />
                                                )}
                                            </td>
                                            <td className="px-4 py-2 font-medium text-slate-900">{row.name}</td>
                                            <td className="px-4 py-2">
                                                {row.city}
                                                {row.destinationId && <span className="block text-[9px] text-green-600">Matched</span>}
                                            </td>
                                            <td className="px-4 py-2">
                                                {row.plan} <span className="text-slate-400">→</span> <strong>{row.mappedPlan}</strong>
                                            </td>
                                            <td className="px-4 py-2 font-mono">{row.rate}</td>
                                            <td className="px-4 py-2 text-slate-500">{row.validFrom} to {row.validTo}</td>
                                            <td className="px-4 py-2 text-red-600 font-medium">
                                                {row.errors.join(', ')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium border border-slate-200">
                        Cancel
                    </button>
                    <button 
                        onClick={handleImport} 
                        disabled={validCount === 0 || isUploading}
                        className="px-8 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        Import {validCount} Records
                    </button>
                </div>
            </div>
        </div>
    );
};
