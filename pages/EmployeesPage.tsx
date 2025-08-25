import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import type { AppContextType } from '../types';
import { PlusIcon, UsersIcon } from '../components/Icons';
import CSVImportModal from '../components/CSVImportModal';

const EmployeesPage: React.FC = () => {
    const { employees, addEmployees, isLoading } = useContext(AppContext) as AppContextType;
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importResult, setImportResult] = useState<{ newCount: number; duplicateCount: number; error: string | null } | null>(null);

    const handleImport = async (newUsers: { name: string; email: string }[]) => {
        const result = await addEmployees(newUsers);
        setImportResult(result);
        setIsImportModalOpen(false);
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {isImportModalOpen && (
                <CSVImportModal 
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImport}
                />
            )}
            
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage Employees</h1>
                    <p className="mt-1 text-lg text-gray-600">Add, view, and manage all employees in the system.</p>
                </div>
                <button
                    onClick={() => {
                        setIsImportModalOpen(true);
                        setImportResult(null);
                    }}
                    className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Import Employees
                </button>
            </div>
            
            {importResult && (
                <div className={`mb-6 p-4 rounded-md ${importResult.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {importResult.error ? (
                        <p><strong>Import Failed:</strong> {importResult.error}</p>
                    ) : (
                        <p>
                            <strong>Import Complete:</strong> {importResult.newCount} new employees added. {importResult.duplicateCount} duplicates were skipped.
                        </p>
                    )}
                </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-hidden border">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold flex items-center">
                        <UsersIcon className="h-6 w-6 mr-3 text-gray-500" />
                        All Employees ({employees.length})
                    </h2>
                </div>
                {isLoading && employees.length === 0 ? (
                    <div className="text-center p-10">Loading...</div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map((employee) => (
                                <tr key={employee.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(employee.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {employees.length === 0 && (
                        <div className="text-center p-10 text-gray-500">
                            No employees found.
                        </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
};

export default EmployeesPage;