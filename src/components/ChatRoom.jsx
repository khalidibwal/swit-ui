import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, MoreVertical, Phone, Video } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function ChatRoom({ chat, onBack, isPrivacyMode, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef();

  // Listener pesan real-time
  useEffect(() => {
    if (!chat.id) return;

    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chat.id]);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        text: newMessage,
        senderId: currentUser.id, // Gunakan ID user yang sedang login
        senderName: currentUser.name,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] animate-in slide-in-from-right duration-300">
      {/* Chat Header */}
      <div className="px-4 py-4 bg-[#1e293b] border-b border-slate-700 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700">
              <img 
                src={chat.image} 
                alt={chat.name} 
                className={`w-full h-full object-cover ${isPrivacyMode ? 'blur-md scale-125' : ''}`} 
              />
            </div>
            <div>
              <h2 className={`font-bold text-white text-sm ${isPrivacyMode ? 'blur-sm' : ''}`}>
                {isPrivacyMode ? 'HIDDEN' : chat.name}
              </h2>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <button className="p-2 hover:bg-slate-800 rounded-full transition-colors"><Phone size={20} /></button>
          <button className="p-2 hover:bg-slate-800 rounded-full transition-colors"><Video size={20} /></button>
          <button className="p-2 hover:bg-slate-800 rounded-full transition-colors"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          // Pesan dianggap 'milik saya' jika senderId sama dengan currentUser.id
          const isMe = msg.senderId === currentUser.id;
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm transition-all ${
                  isMe 
                    ? 'bg-emerald-500 text-white rounded-br-none' 
                    : 'bg-[#1e293b] text-slate-200 border border-slate-700 rounded-bl-none'
                } ${isPrivacyMode && !isMe ? 'blur-md' : ''}`}
              >
                {msg.text}
                <div className={`text-[9px] mt-1 opacity-60 text-right ${isMe ? 'text-white' : 'text-slate-400'}`}>
                   {msg.timestamp ? (msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
        
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Send size={24} className="text-slate-400 rotate-[-45deg]" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Say Hello to {chat.name}!</p>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form onSubmit={sendMessage} className="p-4 bg-[#1e293b] border-t border-slate-700 pb-28">
        <div className="flex items-center gap-2 bg-[#0f172a] p-2 rounded-2xl border border-slate-700 focus-within:border-emerald-500/50 transition-all">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Ketik pesan sebagai ${currentUser.name}...`}
            className="flex-1 bg-transparent text-white px-4 py-2 text-sm focus:outline-none placeholder:text-slate-600 font-medium"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all active:scale-90 disabled:opacity-50 disabled:active:scale-100"
          >
            <Send size={18} fill="currentColor" />
          </button>
        </div>
      </form>
    </div>
  );
}
