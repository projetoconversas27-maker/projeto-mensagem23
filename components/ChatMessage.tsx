import React from 'react';
import { Message, MessageRole } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {message.attachments.map((att, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden border border-gray-700 bg-black/20">
                {att.type === 'image' && (
                  <img src={att.previewUrl} alt="attachment" className="max-w-[200px] max-h-[200px] object-cover" />
                )}
                {att.type === 'video' && (
                  <video controls src={att.previewUrl} className="max-w-[240px] max-h-[240px]" />
                )}
                {att.type === 'audio' && (
                  <div className="p-3 flex items-center gap-2 bg-gray-800 text-white min-w-[200px]">
                    <span className="text-xs font-bold uppercase text-gray-400">Áudio</span>
                    <audio controls src={att.previewUrl} className="h-8 w-40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Bubble */}
        {message.text && (
          <div
            className={`px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm break-words whitespace-pre-wrap ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-800 text-gray-100 rounded-bl-none'
            }`}
          >
            {message.text}
          </div>
        )}
        
        <span className="text-[10px] text-gray-500 mt-1 px-1">
          {isUser ? 'Você' : 'OmniTalk AI'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
