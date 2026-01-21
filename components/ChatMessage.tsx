import React from 'react';
import { Message, Mention } from '../types';
import { UserCircleIcon, ReplyIcon } from './Icons';

interface ChatMessageProps {
  message: Message;
  currentUserId?: string;
  onReply?: (message: Message) => void;
  onMentionClick?: (mention: Mention) => void;
}

const generateUserColor = (id: string = '') => {
  if (!id) return '#3b82f6';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 85%, 65%)`;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, currentUserId, onReply, onMentionClick }) => {
  const isMe = message.creator_token === currentUserId;
  const isGuest = !message.sender_id;
  const userColor = generateUserColor(message.creator_token || message.senderName);

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up mb-4 group`}>
      <div className={`flex gap-2.5 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
        {/* Avatar/Icon - Alinhado à base do balão */}
        <div className="flex-shrink-0 mb-1">
           <div 
             style={{ 
               borderColor: isGuest && !isMe ? userColor : (isMe ? '#ffffff' : '#3f3f46'), 
               color: isGuest && !isMe ? userColor : (isMe ? '#000000' : '#a1a1aa'),
               boxShadow: isGuest && !isMe ? `0 0 15px ${userColor}44` : 'none'
             }}
             className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isMe ? 'bg-white' : 'bg-zinc-900'} ${isGuest && !isMe ? 'animate-pulse' : ''}`}
           >
              <UserCircleIcon className="w-5 h-5" />
           </div>
        </div>
        
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
           <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <span 
                style={{ color: isGuest && !isMe ? userColor : undefined }}
                className={`text-[9px] font-black uppercase tracking-[0.15em] ${!isGuest || isMe ? 'text-zinc-500' : ''}`}
              >
                {message.senderName}
              </span>
              <button 
                onClick={() => onReply?.(message)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-zinc-900/50 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-blue-400"
              >
                <ReplyIcon className="w-3 h-3" />
              </button>
           </div>

           <div 
             style={{ 
               borderColor: isGuest && !isMe ? userColor : (isMe ? '#2563eb' : '#27272a'),
               boxShadow: isGuest && !isMe ? `0 4px 20px -5px ${userColor}33` : '0 4px 20px -5px rgba(0,0,0,0.5)'
             }}
             className={`flex flex-col gap-1 rounded-[22px] border-2 transition-all duration-500 ${isMe ? 'bg-blue-600 rounded-br-none' : 'bg-zinc-900 rounded-bl-none'} ${isGuest && !isMe ? 'guest-glow' : ''}`}
           >
              {/* REPLY PREVIEW */}
              {message.reply_to && (
                <div className={`m-1.5 p-2 rounded-[16px] bg-black/40 border-l-4 ${isMe ? 'border-white/40' : 'border-blue-500/50'} flex flex-col gap-0.5 max-w-[220px]`}>
                   <span className={`text-[8px] font-black uppercase tracking-widest ${isMe ? 'text-white/60' : 'text-blue-400'}`}>
                     Replying to {message.reply_to.senderName}
                   </span>
                   <p className="text-[10px] text-zinc-400 truncate italic">{message.reply_to.text}</p>
                </div>
              )}

              <div className="px-4 py-3 text-[13px] leading-relaxed text-white font-semibold">
                {message.text}

                {/* MENTIONS */}
                {message.mentions && message.mentions.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {message.mentions.map((m, idx) => (
                      <div 
                        key={idx}
                        onClick={() => onMentionClick?.(m)}
                        className="flex items-center gap-3 p-2 rounded-xl bg-black/50 border border-white/5 hover:border-blue-400/50 cursor-pointer transition-all active:scale-95"
                      >
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                          {m.image && <img src={m.image} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{m.type === 'event' ? 'Festa' : 'Item'}</span>
                           <span className="text-xs font-bold text-white truncate">{m.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.attachments && message.attachments.length > 0 && (
                <div className="p-1 grid gap-1.5">
                  {message.attachments.map((a, i) => (
                    <div key={i} className="relative group overflow-hidden rounded-[18px] border border-white/5 shadow-inner">
                      {a.type === 'image' && (
                        <img 
                          src={a.previewUrl} 
                          className="max-h-72 object-cover w-full opacity-95 transition-transform duration-700 group-hover:scale-110" 
                          alt="Attachment"
                        />
                      )}
                      {a.type === 'video' && (
                        <div className="aspect-video bg-zinc-950 flex items-center justify-center">
                           <div className="p-3 rounded-full bg-white/10 backdrop-blur-md">
                             <UserCircleIcon className="w-8 h-8 text-white" />
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
           </div>
           
           <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-[8px] text-zinc-600 font-bold uppercase">
                {new Date(message.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;