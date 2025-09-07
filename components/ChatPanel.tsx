import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, CurrentUser } from '../types';
import { SendIcon } from './Icons';

interface ChatPanelProps {
  chat: ChatMessage[];
  currentUser: CurrentUser;
  onSend: (message: string) => void;
  isReadOnly?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ chat, currentUser, onSend, isReadOnly = false }) => {
    const [message, setMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            onSend(message.trim());
            setMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md border">
            <h3 className="text-lg font-bold p-4 border-b">{isReadOnly ? 'Chat History' : 'Live Chat'}</h3>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chat.length === 0 && !isReadOnly && (
                    <div className="text-center text-gray-500 pt-8">
                        <p>No messages yet. Say hello!</p>
                    </div>
                )}
                 {chat.length === 0 && isReadOnly && (
                    <div className="text-center text-gray-500 pt-8">
                        <p>There were no messages in this session.</p>
                    </div>
                )}
                {chat.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.sender_id === currentUser.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}>
                            <p className="font-bold text-sm">{msg.sender_name}</p>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            {!isReadOnly && (
                <form onSubmit={handleSend} className="p-4 border-t flex items-center space-x-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        aria-label="Chat message input"
                    />
                    <button type="submit" className="p-2 text-white bg-primary rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" aria-label="Send message">
                        <SendIcon className="h-5 w-5" />
                    </button>
                </form>
            )}
        </div>
    );
};

export default ChatPanel;
