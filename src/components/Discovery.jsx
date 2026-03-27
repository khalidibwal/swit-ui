import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Heart, Star, RotateCcw, Info, EyeOff, MessageCircle } from 'lucide-react';
import { collection, onSnapshot, query, limit, addDoc, serverTimestamp, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DUMMY_USERS = [
  {
    id: 'sample_user_1',
    name: "Sarah (Local)",
    age: 24,
    bio: "Pecinta kopi dan senja. ✨",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
  },
];

export default function Discovery({ isPrivacyMode, currentUser, onGoToChat }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDirection, setLastDirection] = useState(null);
  const [matchedUser, setMatchedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Ambil ID user yang sudah di-swipe oleh currentUser
      const swipesRef = collection(db, 'swipes');
      const swipesQuery = query(swipesRef, where('senderId', '==', currentUser.id));
      const swipesSnapshot = await getDocs(swipesQuery);
      const swipedUserIds = swipesSnapshot.docs.map(doc => doc.data().targetUserId);
      
      // 2. Ambil semua user dari Firestore
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, limit(50)); // Ambil lebih banyak untuk difilter
      
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => 
            user.id !== currentUser.id && // Bukan diri sendiri
            !swipedUserIds.includes(user.id) // Belum pernah di-swipe
          );
        
        if (usersData.length === 0 && swipedUserIds.length === 0) {
          // Jika benar-benar kosong dan belum ada swipe, tampilkan dummy
          setUsers(DUMMY_USERS);
        } else {
          setUsers(usersData);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error onSnapshot users:", error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching users/swipes:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe;
    fetchUsers().then(unsub => {
      unsubscribe = unsub;
    });
    return () => unsubscribe && unsubscribe();
  }, [currentUser.id]);

  const swiped = async (direction, swipedUser) => {
    if (!swipedUser) return;
    setLastDirection(direction);
    console.log(`Swiping ${direction} on:`, swipedUser.name);
    setUsers((prev) => prev.slice(0, -1));

    try {
      // 1. Simpan Swipe (ID dokumen unik gabungan sender & target agar tidak duplikat)
      const swipeId = `${currentUser.id}_to_${swipedUser.id}`;
      await setDoc(doc(db, 'swipes', swipeId), {
        senderId: currentUser.id,
        targetUserId: swipedUser.id,
        direction: direction,
        type: direction === 'right' ? 'LIKE' : 'DISLIKE',
        timestamp: serverTimestamp(),
      });

      // 2. Cek Match jika LIKE (kanan)
      if (direction === 'right') {
        console.log("Checking for mutual like from:", swipedUser.id);
        const q = query(
          collection(db, 'swipes'),
          where('senderId', '==', swipedUser.id),
          where('targetUserId', '==', currentUser.id),
          where('type', '==', 'LIKE')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log("MATCH FOUND!");
          handleMatch(swipedUser);
        } else {
          console.log("No mutual like yet.");
        }
      }
    } catch (error) {
      console.error("Error swiping:", error);
    }
  };

  const handleMatch = async (otherUser) => {
    // Buat ID chat yang konsisten: urutkan ID agar siapapun yang match, ID-nya sama
    const chatDocId = [currentUser.id, otherUser.id].sort().join('_');
    console.log("Creating/Updating chat doc with ID:", chatDocId);
    
    setMatchedUser({ ...otherUser, chatId: chatDocId });
    
    try {
      const matchData = {
        userIds: [currentUser.id, otherUser.id].sort(), // Pastikan array userIds juga terurut
        users: {
          [currentUser.id]: { name: currentUser.name, image: currentUser.image },
          [otherUser.id]: { name: otherUser.name, image: otherUser.image }
        },
        createdAt: serverTimestamp(),
        lastMessage: "It's a Match! Say hello.",
        lastMessageTime: serverTimestamp()
      };
      
      // Gunakan setDoc dengan chatDocId yang konsisten agar kedua user melihat dokumen yang sama
      await setDoc(doc(db, 'chats', chatDocId), matchData, { merge: true });
      console.log("Chat document saved successfully.");
    } catch (e) {
      console.error("Match saving error:", e);
    }
  };

  const handleRefresh = () => fetchUsers();

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#0f172a] items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold animate-pulse">Mencari orang baru...</p>
      </div>
    );
  }

  const topUser = users[users.length - 1];

  return (
    <div className="flex flex-col h-full bg-[#0f172a] pb-24 overflow-hidden relative">
      {/* Match Overlay */}
      <AnimatePresence>
        {matchedUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center px-6 text-center"
          >
            <motion.h2 initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }} className="text-5xl font-black italic text-emerald-400 mb-2 tracking-tighter">IT'S A MATCH!</motion.h2>
            <p className="text-slate-300 mb-10">Anda dan {matchedUser.name} saling menyukai.</p>
            <div className="flex items-center gap-4 mb-12">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500 overflow-hidden shadow-2xl"><img src={currentUser.image} alt="Me" className="w-full h-full object-cover" /></div>
              <Heart className="text-emerald-500 fill-emerald-500 animate-pulse" size={32} />
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500 overflow-hidden shadow-2xl"><img src={matchedUser.image} alt="Other" className="w-full h-full object-cover" /></div>
            </div>
            <div className="w-full space-y-4">
              <button onClick={() => { onGoToChat({ id: matchedUser.chatId, name: matchedUser.name, image: matchedUser.image }); setMatchedUser(null); }} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"><MessageCircle size={20} fill="currentColor" /> Kirim Pesan</button>
              <button onClick={() => setMatchedUser(null)} className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all">Nanti Saja</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-[#1e293b] border-b border-slate-700 shadow-lg">
        <h1 className="text-2xl font-black tracking-tighter gradient-text">SwitUI</h1>
        <div className="flex items-center gap-3">
          {isPrivacyMode && <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400"><EyeOff size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Privacy On</span></div>}
          <button className="text-slate-400 hover:text-emerald-400 transition-colors p-2 bg-slate-800 rounded-xl"><Info size={22} /></button>
        </div>
      </div>

      {/* Card Container */}
      <div className="flex-1 relative mt-6 px-4 flex items-center justify-center">
        <AnimatePresence>
          {users.map((user, index) => (
            <SwipeCard key={user.id} user={user} onSwipe={(dir) => swiped(dir, user)} isTop={index === users.length - 1} isPrivacyMode={isPrivacyMode} forcedDirection={index === users.length - 1 ? lastDirection : null} />
          ))}
        </AnimatePresence>
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center p-10">
            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-slate-700"><RotateCcw className="text-emerald-400" size={40} /></div>
            <h3 className="text-xl font-bold text-slate-100">Habis Terjual!</h3>
            <button onClick={handleRefresh} className="mt-8 px-8 py-3 bg-emerald-500 text-white font-bold rounded-2xl">Refresh</button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-6 flex justify-between items-center max-w-[360px] mx-auto w-full gap-4">
        <button onClick={handleRefresh} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-yellow-500 hover:scale-110 transition-all shadow-lg"><RotateCcw size={20} /></button>
        <button onClick={() => swiped('left', topUser)} disabled={users.length === 0} className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-500 hover:scale-110 transition-all shadow-xl disabled:opacity-50"><X size={32} /></button>
        <button onClick={() => swiped('right', topUser)} disabled={users.length === 0} className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 hover:scale-110 transition-all shadow-lg disabled:opacity-50"><Star size={20} fill="currentColor" /></button>
        <button onClick={() => swiped('right', topUser)} disabled={users.length === 0} className="w-16 h-16 rounded-3xl bg-emerald-500 flex items-center justify-center text-white hover:scale-110 transition-all shadow-xl disabled:opacity-50"><Heart size={32} fill="currentColor" /></button>
      </div>
    </div>
  );
}

function SwipeCard({ user, onSwipe, isTop, isPrivacyMode, forcedDirection }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-100, 100], [-10, 10]);
  const opacity = useTransform(x, [-150, -100, 0, 100, 150], [0, 1, 1, 1, 0]);
  const handleDragEnd = (_, info) => { if (info.offset.x > 100) onSwipe('right'); else if (info.offset.x < -100) onSwipe('left'); };
  const getExitX = () => { if (forcedDirection === 'left') return -500; if (forcedDirection === 'right') return 500; return x.get() < 0 ? -500 : 500; };
  return (
    <motion.div style={{ x, rotate, opacity, zIndex: isTop ? 10 : 0 }} drag={isTop ? "x" : false} dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd} initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ x: getExitX(), opacity: 0, transition: { duration: 0.3 } }} className="absolute w-full h-[520px] max-w-[400px] cursor-grab active:cursor-grabbing">
      <div className="w-full h-full rounded-[32px] overflow-hidden relative tinder-card-shadow bg-slate-800 border border-slate-700">
        <img src={user.image} alt={user.name} className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-700 ${isPrivacyMode ? 'blur-3xl scale-125' : 'blur-0 scale-100'}`} />
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent text-white">
          <div className="flex items-baseline gap-3"><h2 className={`text-3xl font-black tracking-tight transition-all duration-500 ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>{isPrivacyMode ? 'HIDDEN' : user.name}</h2><span className={`text-2xl font-light text-emerald-400 transition-all duration-500 ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>{isPrivacyMode ? '??' : user.age}</span></div>
          <p className={`mt-3 text-slate-200 text-sm font-medium leading-relaxed line-clamp-2 opacity-90 transition-all duration-500 ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>{user.bio}</p>
        </div>
        <motion.div style={{ opacity: useTransform(x, [0, 100], [0, 1]) }} className="absolute top-12 left-12 border-4 border-emerald-400 text-emerald-400 font-black px-6 py-2 rounded-2xl rotate-[-20deg] uppercase text-4xl pointer-events-none tracking-tighter">LIKE</motion.div>
        <motion.div style={{ opacity: useTransform(x, [0, -100], [0, 1]) }} className="absolute top-12 right-12 border-4 border-rose-500 text-rose-500 font-black px-6 py-2 rounded-2xl rotate-[20deg] uppercase text-4xl pointer-events-none tracking-tighter">NOPE</motion.div>
      </div>
    </motion.div>
  );
}
