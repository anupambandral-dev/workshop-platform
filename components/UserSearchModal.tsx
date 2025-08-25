

import React, { useState, useMemo } from 'react';
import type { Employee } from '../types';
import { SearchIcon, XMarkIcon } from './Icons';

interface UserSearchModalProps {
  allUsers: Employee[];
  alreadySelected: { email: string }[];
  onClose: () => void;
  onSelect: (user: Employee) => void;
  title: string;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({ allUsers, alreadySelected, onClose, onSelect, title }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const selectedEmails = new Set(alreadySelected.map(u => u.email.toLowerCase()));
    return allUsers.filter(user => 
      !selectedEmails.has(user.email.toLowerCase()) &&
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allUsers, alreadySelected, searchTerm]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-gray-900">{title}</h3>
             <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                <XMarkIcon className="h-6 w-6 text-gray-600" />
             </button>
          </div>
          <div className="relative mt-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
        </div>
        <div className="overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <li key={user.id}>
                  <button 
                    onClick={() => onSelect(user)} 
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-10 text-center text-gray-500">
              <p>No users found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;
