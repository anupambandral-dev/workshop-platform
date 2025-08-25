import React, { useState, useCallback } from 'react';
import { DocumentArrowUpIcon, XMarkIcon, ExclamationTriangleIcon } from './Icons';

interface CSVImportModalProps {
  onClose: () => void;
  onImport: (users: { name: string; email: string }[]) => void;
}

type ParsedUser = {
    name: string;
    email: string;
    status: 'valid' | 'invalid' | 'duplicate';
    error?: string;
};

const CSVImportModal: React.FC<CSVImportModalProps> = ({ onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string>('');

    const resetState = () => {
        setFile(null);
        setParsedUsers([]);
        setIsProcessing(false);
        setError('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        resetState();
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv') {
                setError('Invalid file type. Please upload a .csv file.');
                return;
            }
            setFile(selectedFile);
            processFile(selectedFile);
        }
    };

    const processFile = (fileToProcess: File) => {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            let text = event.target?.result as string;
             if (!text) {
                setError('File is empty.');
                setIsProcessing(false);
                return;
            }

            // Handle UTF-8 BOM (Byte Order Mark) which can be present in files from Excel
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
            
            try {
                const lines = text.trim().split(/\r?\n/);
                if (lines.length < 2) {
                    throw new Error("CSV is empty or has no data rows.");
                }

                const headerLine = lines[0].toLowerCase();
                const headers = headerLine.split(',').map(h => h.trim());
                const nameIndex = headers.indexOf('name');
                const emailIndex = headers.indexOf('email');

                if (nameIndex === -1 || emailIndex === -1) {
                    throw new Error("CSV must contain 'name' and 'email' columns.");
                }

                const seenEmails = new Set<string>();
                const users: ParsedUser[] = lines.slice(1).map((line): ParsedUser | null => {
                    if (!line.trim()) return null; // Skip empty lines
                    
                    // Robust CSV parsing: split by comma but ignore commas inside double quotes.
                    const values = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                                   .map(v => v.trim().replace(/^"|"$/g, '')); // Remove quotes from start/end

                    if (values.length !== headers.length) {
                        return { name: line, email: '', status: 'invalid' as const, error: 'Column count mismatch.' };
                    }

                    const name = values[nameIndex] || '';
                    const email = (values[emailIndex] || '').toLowerCase();

                    if (!name || !email) {
                        return { name, email, status: 'invalid' as const, error: 'Missing name or email.' };
                    }
                    if (!/^\S+@\S+\.\S+$/.test(email)) {
                        return { name, email, status: 'invalid' as const, error: 'Invalid email format.' };
                    }
                    if (seenEmails.has(email)) {
                        return { name, email, status: 'duplicate' as const, error: 'Duplicate email in file.' };
                    }
                    seenEmails.add(email);
                    return { name, email, status: 'valid' as const };
                }).filter((user): user is ParsedUser => user !== null);

                setParsedUsers(users);

            } catch (err: any) {
                setError(err.message || 'Failed to parse CSV file.');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            setError('Failed to read the file.');
            setIsProcessing(false);
        };
        reader.readAsText(fileToProcess);
    };
    
    const handleImportClick = () => {
        const validUsers = parsedUsers.filter(u => u.status === 'valid').map(({ name, email }) => ({ name, email }));
        if (validUsers.length > 0) {
            onImport(validUsers);
        } else {
            onClose();
        }
    };
    
    const validCount = parsedUsers.filter(u => u.status === 'valid').length;
    const invalidCount = parsedUsers.filter(u => u.status !== 'valid').length;


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b sticky top-0 bg-white z-10">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-900">Import Participants from CSV</h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                            <XMarkIcon className="h-6 w-6 text-gray-600" />
                        </button>
                    </div>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    {!file ? (
                         <div>
                            <p className="text-sm text-gray-600 mb-2">Upload a CSV file with 'name' and 'email' columns. The first row must be the header.</p>
                            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                                <div className="text-center">
                                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500">
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-600">CSV up to 10MB</p>
                                </div>
                            </div>
                            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-md border">
                                <div>
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-sm text-gray-500">{parsedUsers.length} rows found.</p>
                                </div>
                                <button onClick={resetState} className="text-sm font-medium text-primary hover:underline">Change file</button>
                            </div>

                            {isProcessing && <p>Processing...</p>}
                            
                            {parsedUsers.length > 0 && (
                                <div className="border rounded-lg">
                                    <div className="p-3 bg-gray-50 rounded-t-lg">
                                        <p className="font-semibold">{validCount} valid participants to import.</p>
                                        {invalidCount > 0 && <p className="text-sm text-yellow-700">{invalidCount} rows have issues and will be skipped.</p>}
                                    </div>
                                    <div className="max-h-60 overflow-y-auto divide-y">
                                        {parsedUsers.map((user, index) => (
                                            <div key={index} className={`p-3 text-sm flex justify-between items-center ${user.status !== 'valid' ? 'bg-yellow-50' : ''}`}>
                                                <div>
                                                    <p className={`font-medium ${user.status !== 'valid' ? 'text-gray-500' : 'text-gray-900'}`}>{user.name || <span className="italic">No Name</span>}</p>
                                                    <p className={user.status !== 'valid' ? 'text-gray-500' : 'text-gray-600'}>{user.email || <span className="italic">No Email</span>}</p>
                                                </div>
                                                {user.status !== 'valid' && (
                                                    <div className="flex items-center space-x-2 text-yellow-700">
                                                        <ExclamationTriangleIcon className="h-4 w-4" />
                                                        <span className="font-medium">{user.error}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 flex justify-end space-x-3 sticky bottom-0 z-10 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={handleImportClick} disabled={!file || isProcessing || validCount === 0} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed">
                        Import {validCount > 0 ? `${validCount} Participants` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CSVImportModal;