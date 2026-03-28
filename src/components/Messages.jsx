import { useState, useEffect } from 'react';
import { Search, EyeOff, Lock, Heart, Crown } from 'lucide-react';
import { collection, onSnapshot, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Messages({ isPrivacyMode, currentUser, onChatClick, setActiveTab }) {
  const [chats, setChats] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Fetch Chats/Matches
    const qChats = query(
      collection(db, 'chats'),
      where('userIds', 'array-contains', currentUser.id)
    );

    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const chatList = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUserId = data.userIds?.find(id => id !== currentUser.id);
        const otherUser = data.users?.[otherUserId];
        
        return {
          id: doc.id,
          name: otherUser?.name || 'Unknown',
          image: otherUser?.image || '',
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime,
          unread: data.unread
        };
      });
      
      const getMillis = (time) => {
        if (!time) return 0;
        if (time.toMillis) return time.toMillis();
        if (time instanceof Date) return time.getTime();
        return new Date(time).getTime();
      };
      
      setChats(chatList.sort((a, b) => getMillis(b.lastMessageTime) - getMillis(a.lastMessageTime)));
    });

    // 2. Fetch "Who Liked You" (Swipes where targetUserId is me and type is LIKE)
    const qLikes = query(
      collection(db, 'swipes'),
      where('targetUserId', '==', currentUser.id),
      where('type', '==', 'LIKE')
    );

    const unsubLikes = onSnapshot(qLikes, async (snapshot) => {
      // Ambil ID sender yang menyukai kita
      const likerIds = snapshot.docs.map(doc => doc.data().senderId);
      
      // Filter out ID yang sudah jadi match (sudah ada di chats)
      // Caranya: cek di koleksi chats apakah ada match antara currentUser.id dan likerId
      const matchesRef = collection(db, 'chats');
      const matchesQuery = query(matchesRef, where('userIds', 'array-contains', currentUser.id));
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchedUserIds = matchesSnapshot.docs.flatMap(doc => doc.data().userIds).filter(id => id !== currentUser.id);

      const filteredLikerIds = likerIds.filter(id => !matchedUserIds.includes(id));

      if (filteredLikerIds.length === 0) {
        setLikes([]);
        setLoading(false);
        return;
      }

      // Ambil detail user untuk para likers
      const likersData = await Promise.all(
        filteredLikerIds.map(async (id) => {
          const userDoc = await getDoc(doc(db, 'users', id));
          return { id: userDoc.id, ...userDoc.data() };
        })
      );

      setLikes(likersData);
      setLoading(false);
    });

    return () => {
      unsubChats();
      unsubLikes();
    };
  }, [currentUser.id]);

  return (
    <div className="flex flex-col h-full bg-[#0f172a] pb-24">
      {/* Header */}
      <div className="px-6 py-6 border-b border-slate-700 bg-[#1e293b]">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-white tracking-tight">Messages</h1>
          {isPrivacyMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <EyeOff size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Privacy On</span>
            </div>
          )}
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Matches"
            className="w-full pl-12 pr-4 py-3 bg-[#0f172a] border border-slate-700 rounded-2xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Who Liked You Section */}
          <div className="py-6">
            <div className="px-6 flex justify-between items-center mb-4">
              <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Who Liked You</h2>
              {likes.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/20">
                  {likes.length} LIKES
                </span>
              )}
            </div>
            
            <div className="relative">
              <div className="flex gap-4 px-6 overflow-x-auto no-scrollbar">
                {likes.length > 0 ? (
                  likes.map((liker) => (
                    <div 
                      key={liker.id}
                      className="flex-shrink-0 relative group"
                      onClick={() => !currentUser.isGold && setActiveTab('likes')}
                    >
                      <div className="w-20 h-28 rounded-2xl overflow-hidden border border-slate-700 bg-slate-800">
                        <img 
                          src={liker.image} 
                          className={`w-full h-full object-cover transition-all duration-500 ${!currentUser.isGold ? 'blur-md scale-110 grayscale brightness-50' : ''}`} 
                          alt="Liker"
                        />
                        {!currentUser.isGold && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <Lock className="text-emerald-400" size={18} />
                          </div>
                        )}
                      </div>
                      {!currentUser.isGold && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
                          GOLD ONLY
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="w-full flex flex-col items-center justify-center py-4 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700 mx-6">
                    <Heart className="text-slate-600 mb-2" size={24} />
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Belum ada yang menyukai</p>
                  </div>
                )}
              </div>

              {/* Gold Upgrade Overlay if not Gold */}
              {likes.length > 0 && !currentUser.isGold && (
                <div 
                  onClick={() => setActiveTab('likes')}
                  className="absolute inset-0 bg-emerald-500/5 backdrop-blur-[2px] flex items-center justify-center cursor-pointer group"
                >
                  <div className="bg-slate-900/90 border border-emerald-500/30 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 group-hover:scale-105 transition-transform">
                    <Crown size={16} className="text-amber-400" fill="currentColor" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Upgrade to See</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* New Matches (Horizontal) */}
          <div className="py-6">
            <h2 className="px-6 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">New Matches</h2>
            <div className="flex gap-5 px-6 overflow-x-auto no-scrollbar pb-2">
              {chats.length > 0 ? chats.map((chat) => (
                <div 
                  key={chat.id} 
                  className="flex-shrink-0 flex flex-col items-center gap-3 group cursor-pointer"
                  onClick={() => onChatClick(chat)}
                >
                  <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-emerald-300 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full border-2 border-[#0f172a] overflow-hidden">
                      <img 
                        src={chat.image} 
                        alt={chat.name} 
                        className={`w-full h-full object-cover transition-all duration-700 ${isPrivacyMode ? 'blur-xl scale-150' : 'blur-0 scale-100'}`} 
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-bold text-slate-300 group-hover:text-emerald-400 transition-all duration-500 ${isPrivacyMode ? 'blur-sm' : 'blur-0'}`}>
                    {isPrivacyMode ? 'HIDDEN' : chat.name}
                  </span>
                </div>
              )) : (
                <p className="text-[10px] text-slate-500 px-6 italic">Belum ada match baru.</p>
              )}
            </div>
          </div>

          {/* Chat List (Vertical) */}
          <div className="flex-1">
            <h2 className="px-6 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Messages</h2>
            <div className="divide-y divide-slate-800/50">
              {chats.length > 0 ? chats.map((chat) => (
                <button 
                  key={chat.id} 
                  onClick={() => onChatClick(chat)}
                  className="w-full px-6 py-5 flex items-center gap-4 hover:bg-slate-800/50 transition-all active:bg-slate-800"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-700 shadow-md">
                      <img 
                        src={chat.image} 
                        alt={chat.name} 
                        className={`w-full h-full object-cover transition-all duration-700 ${isPrivacyMode ? 'blur-xl scale-150' : 'blur-0 scale-100'}`} 
                      />
                    </div>
                    {chat.unread && !isPrivacyMode && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0f172a] shadow-sm"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-slate-100 transition-all duration-500 ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>
                        {isPrivacyMode ? 'HIDDEN USER' : chat.name}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {chat.lastMessageTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Now'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-sm line-clamp-1 transition-all duration-500 ${chat.unread ? 'text-slate-200 font-semibold' : 'text-slate-400 font-normal'} ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>
                        {isPrivacyMode ? 'Message hidden for privacy' : chat.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                   <Search size={40} className="text-slate-500 mb-4" />
                   <p className="text-sm font-bold uppercase tracking-widest">No chats yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
