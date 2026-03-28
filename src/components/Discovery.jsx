import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Heart, Star, RotateCcw, Info, EyeOff, MessageCircle, ShieldCheck, Crown, Zap, MapPin, Navigation, SlidersHorizontal } from 'lucide-react';
import { collection, onSnapshot, query, limit, addDoc, serverTimestamp, where, getDocs, doc, setDoc, updateDoc, increment, GeoPoint } from 'firebase/firestore';
import { db } from '../firebase';

const DUMMY_USERS = [
  {
    id: 'dummy_1km',
    name: "Sarah (1 KM)",
    age: 24,
    bio: "Dekat banget nih! Pecinta kopi dan senja. ✨",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600"
    ],
    distanceOffset: 1 // km
  },
  {
    id: 'dummy_5km',
    name: "Gita (5 KM)",
    age: 22,
    bio: "Suka kulineran bareng. Yuk jalan! 🍕",
    image: "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600"
    ],
    distanceOffset: 5 // km
  },
  {
    id: 'dummy_10km',
    name: "Alya (10 KM)",
    age: 25,
    bio: "Hobi dengerin musik indie. 🎧",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600"
    ],
    distanceOffset: 10 // km
  },
  {
    id: 'dummy_20km',
    name: "Dina (20 KM)",
    age: 23,
    bio: "Suka nonton film di bioskop. 🍿",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600"
    ],
    distanceOffset: 20 // km
  },
  {
    id: 'dummy_100km',
    name: "Riska (100 KM)",
    age: 26,
    bio: "Jauh di mata dekat di hati. ❤️",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
    images: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600"
    ],
    distanceOffset: 100 // km
  }
];

// Helper: Hitung koordinat baru berdasarkan jarak (KM) dari titik asal
const getOffsetLocation = (lat, lon, km) => {
  const earthRadius = 6371; // km
  // 1 degree latitude = 111.32 km
  const newLat = lat + (km / earthRadius) * (180 / Math.PI);
  // 1 degree longitude = 111.32 * cos(lat) km
  const newLon = lon + (km / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
  return new GeoPoint(newLat, newLon);
};

// Helper: Haversine Formula untuk hitung jarak KM
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null; // Return null instead of 999
  const R = 6371; // Radius bumi KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

export default function Discovery({ isPrivacyMode, currentUser, onGoToChat, setActiveTab }) {
  const [allUsers, setAllUsers] = useState([]); // Raw users from Firestore
  const [users, setUsers] = useState([]); // Filtered users for UI
  const [swipedIds, setSwipedIds] = useState([]); // Track IDs reactive
  const [loading, setLoading] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [lastDirection, setLastDirection] = useState(null);
  const [matchedUser, setMatchedUser] = useState(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showLimitReached, setShowLimitReached] = useState(false);
  
  // Location States
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(1); // Default 1km
  const [showRadiusSlider, setShowRadiusSlider] = useState(false);

  const [isInjecting, setIsInjecting] = useState(false);

  // Cek apakah Gold masih berlaku
  const isGoldActive = currentUser.isGold && (
    !currentUser.goldExpiry || (
      currentUser.goldExpiry?.toDate 
        ? currentUser.goldExpiry.toDate() > new Date() 
        : new Date(currentUser.goldExpiry) > new Date()
    )
  );

  // Fungsi untuk Inject Dummy ke Firestore berdasarkan lokasi saat ini
  const injectTestDummies = async () => {
    if (!userLocation) {
      alert("Tunggu hingga lokasi GPS didapatkan!");
      return;
    }
    
    setIsInjecting(true);
    try {
      const usersRef = collection(db, 'users');
      for (const dummy of DUMMY_USERS) {
        const location = getOffsetLocation(userLocation.latitude, userLocation.longitude, dummy.distanceOffset);
        const { id, distanceOffset, ...userData } = dummy;
        
        await addDoc(usersRef, {
          ...userData,
          lastKnownLocation: location,
          createdAt: serverTimestamp(),
          isVerified: true
        });
      }
      alert("5 User Percobaan berhasil ditambahkan ke database!");
      handleRefresh();
    } catch (e) {
      console.error("Error injecting dummies:", e);
      alert("Gagal menambahkan user percobaan.");
    } finally {
      setIsInjecting(false);
    }
  };

  // 1. Lacak Lokasi GPS Otomatis
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = new GeoPoint(latitude, longitude);
        setUserLocation({ latitude, longitude });

        // Simpan ke Firestore
        try {
          await updateDoc(doc(db, 'users', currentUser.id), {
            lastKnownLocation: newLocation,
            updatedAt: serverTimestamp()
          });
          console.log("Location updated:", latitude, longitude);
        } catch (e) {
          console.error("Error updating location:", e);
        }
      }, (error) => {
        console.warn("Geolocation error:", error.message);
      });
    }
  }, [currentUser.id]);

  // 2. Lacak Swipe secara reactive
  useEffect(() => {
    const swipesRef = collection(db, 'swipes');
    const q = query(swipesRef, where('senderId', '==', currentUser.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().targetUserId);
      setSwipedIds(ids);
    }, (error) => {
      console.error("Error listening to swipes:", error);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  useEffect(() => {
    // Sync swipe count dari Firestore saat pertama kali load
    if (currentUser.dailySwipeCount !== undefined) {
      setSwipeCount(currentUser.dailySwipeCount);
    }
  }, [currentUser.dailySwipeCount]);

  const fetchUsers = () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, limit(100)); 
      
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllUsers(rawData);
        setLoading(false);
      }, (error) => {
        console.error("Error onSnapshot users:", error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };

  // 4. Reactive Filtering & Sorting (No refetching needed)
  useEffect(() => {
    let usersData = allUsers
      .map(user => {
        let distance = null;
        if (userLocation && user.lastKnownLocation) {
          distance = calculateDistance(
            userLocation.latitude, 
            userLocation.longitude, 
            user.lastKnownLocation.latitude, 
            user.lastKnownLocation.longitude
          );
        }
        return { ...user, distance };
      })
      .filter(user => {
        const isSelf = user.id === currentUser.id;
        const alreadySwiped = swipedIds.includes(user.id);
        const isWithinRadius = user.distance === null || user.distance <= radius;
        return !isSelf && !alreadySwiped && isWithinRadius;
      })
      .sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    
    // Fallback ke DUMMY_USERS jika database benar-benar kosong (untuk testing)
    if (usersData.length === 0 && allUsers.length < 5) {
      const dummyFiltered = DUMMY_USERS.map(user => {
        let distance = user.distanceOffset;
        let location = null;
        
        if (userLocation) {
          location = getOffsetLocation(userLocation.latitude, userLocation.longitude, user.distanceOffset);
        }

        return { ...user, distance, lastKnownLocation: location };
      }).filter(u => u.id !== currentUser.id && !swipedIds.includes(u.id));
      
      usersData = [...usersData, ...dummyFiltered];
    }

    setUsers(usersData);
   }, [allUsers, swipedIds, radius, userLocation, currentUser.id]);

  useEffect(() => {
    const unsubscribe = fetchUsers();
    return () => unsubscribe && unsubscribe();
  }, [currentUser.id]); // Only refetch if user ID changes!

  const swiped = async (direction, swipedUser) => {
    if (!swipedUser || isSwiping || swipedIds.includes(swipedUser.id)) return;

    // 1. Validasi Limit Swipe (Hanya untuk non-Gold)
    if (!isGoldActive && swipeCount >= 30) {
      setShowLimitReached(true);
      return;
    }

    setIsSwiping(true);
    setLastDirection(direction);
    console.log(`Swiping ${direction} on:`, swipedUser.name);
    
    // Update local states immediately for smooth UI
    setUsers((prev) => prev.filter(u => u.id !== swipedUser.id));
    setSwipedIds((prev) => [...prev, swipedUser.id]);

    try {
      // Update swipe count lokal & Firestore (hanya untuk non-Gold)
      if (!isGoldActive) {
        setSwipeCount(prev => prev + 1);
        await updateDoc(doc(db, 'users', currentUser.id), {
          dailySwipeCount: increment(1),
          lastSwipeDate: serverTimestamp()
        });
      }

      // 2. Simpan Swipe (ID dokumen unik gabungan sender & target agar tidak duplikat)
      const swipeId = `${currentUser.id}_to_${swipedUser.id}`;
      await setDoc(doc(db, 'swipes', swipeId), {
        senderId: currentUser.id,
        targetUserId: swipedUser.id,
        direction: direction,
        type: direction === 'right' ? 'LIKE' : 'DISLIKE',
        timestamp: serverTimestamp(),
      });

      // 3. Cek Match jika LIKE (kanan)
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
      // Rollback local state if error occurs (optional, but good for UX)
      // setSwipedIds((prev) => prev.filter(id => id !== swipedUser.id));
    } finally {
      // Delay sedikit sebelum mengizinkan swipe berikutnya untuk mencegah spam
      setTimeout(() => setIsSwiping(false), 300);
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
      <div className="flex flex-col h-full bg-[#0f172a] items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
        <h3 className="text-white font-black uppercase tracking-widest mb-2">Mencari Sekitarmu...</h3>
        <p className="text-slate-500 text-xs leading-relaxed">
          Pastikan GPS aktif untuk menemukan orang-orang hebat di radius {radius} KM.
        </p>
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

      {/* Limit Reached Overlay */}
      <AnimatePresence>
        {showLimitReached && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-[#020617]/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-600 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/20 ring-4 ring-amber-500/20">
              <Crown size={48} className="text-white" fill="currentColor" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">Limit Swipe Harian Tercapai!</h2>
            <p className="text-slate-400 mb-10 leading-relaxed">
              Kamu sudah menggunakan <span className="text-white font-bold">30 swipe</span> hari ini. Upgrade ke <span className="text-amber-400 font-bold text-lg">Gold</span> untuk swipe sepuasnya tanpa batas!
            </p>
            <div className="w-full space-y-4">
              <button 
                onClick={() => setActiveTab('likes')} 
                className="w-full py-5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/40 active:scale-95 transition-all"
              >
                <Zap size={20} fill="currentColor" /> Upgrade ke Gold
              </button>
              <button 
                onClick={() => setShowLimitReached(false)} 
                className="w-full py-4 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-slate-300 transition-all"
              >
                Mungkin Nanti
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-[#1e293b] border-b border-slate-700 shadow-lg">
        <h1 className="text-2xl font-black tracking-tighter gradient-text">SwitUI</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRadiusSlider(!showRadiusSlider)}
            className={`p-2 rounded-xl transition-all ${radius > 1 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:text-emerald-400'}`}
          >
            <SlidersHorizontal size={20} />
          </button>
          {isPrivacyMode && <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400"><EyeOff size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Privacy On</span></div>}
          <button className="text-slate-400 hover:text-emerald-400 transition-colors p-2 bg-slate-800 rounded-xl"><Info size={22} /></button>
        </div>
      </div>

      {/* Radius Slider Overlay */}
      <AnimatePresence>
        {showRadiusSlider && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute top-[72px] left-0 right-0 z-50 px-6 py-6 bg-[#1e293b] border-b border-slate-700 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={14} /> Jarak Jangkauan
              </h3>
              <span className="text-sm font-black text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                {radius} KM
              </span>
            </div>
            <input 
              type="range" min="1" max="1000" step="1" 
              value={radius} 
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
              <span>Nearby (1km)</span>
              <span>Maksimal (1000km)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Container */}
      <div className="flex-1 relative mt-6 px-4 flex items-center justify-center">
        <AnimatePresence>
          {users.map((user, index) => (
            <SwipeCard key={user.id} user={user} onSwipe={(dir) => swiped(dir, user)} isTop={index === users.length - 1} isPrivacyMode={isPrivacyMode} forcedDirection={index === users.length - 1 ? lastDirection : null} />
          ))}
        </AnimatePresence>
        {users.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center text-center p-10">
            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-slate-700">
              <MapPin className="text-emerald-400" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-100">
              {radius <= 1 ? "Tidak Ada User Terdekat" : "Belum Ada User Baru"}
            </h3>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
              {radius <= 1 
                ? "Coba perluas jangkauan pencarianmu hingga 1000 KM." 
                : "Kami sedang mencari lebih banyak orang untukmu. Silakan cek lagi nanti!"}
            </p>
            {users.length === 0 && radius < 1000 && (
              <button 
                onClick={() => setShowRadiusSlider(true)} 
                className="mt-8 px-8 py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <SlidersHorizontal size={18} /> {radius <= 1 ? "Perluas Jarak" : "Perluas Lebih Jauh"}
              </button>
            )}
            
            <button 
              onClick={injectTestDummies}
              disabled={isInjecting || !userLocation}
              className="mt-6 text-emerald-400 font-black uppercase tracking-widest text-[10px] border border-emerald-500/20 px-4 py-2 rounded-xl hover:bg-emerald-500/10 transition-all disabled:opacity-50"
            >
              {isInjecting ? 'Menambahkan...' : '🚀 Inject 5 User Percobaan'}
            </button>
            
            <button onClick={handleRefresh} className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-emerald-400 transition-colors">Segarkan Pencarian</button>
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const userImages = user.images && user.images.length > 0 ? user.images : [user.image];
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-100, 100], [-10, 10]);
  const opacity = useTransform(x, [-150, -100, 0, 100, 150], [0, 1, 1, 1, 0]);
  
  const handleDragEnd = (_, info) => { 
    if (info.offset.x > 100) onSwipe('right'); 
    else if (info.offset.x < -100) onSwipe('left'); 
  };

  const handlePhotoNavigation = (e) => {
    if (!isTop) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX > width / 2) {
      // Next photo
      if (currentPhotoIndex < userImages.length - 1) {
        setCurrentPhotoIndex(prev => prev + 1);
      }
    } else {
      // Previous photo
      if (currentPhotoIndex > 0) {
        setCurrentPhotoIndex(prev => prev - 1);
      }
    }
  };

  const getExitX = () => { 
    if (forcedDirection === 'left') return -500; 
    if (forcedDirection === 'right') return 500; 
    return x.get() < 0 ? -500 : 500; 
  };

  return (
    <motion.div 
      style={{ x, rotate, opacity, zIndex: isTop ? 10 : 0 }} 
      drag={isTop ? "x" : false} 
      dragConstraints={{ left: 0, right: 0 }} 
      onDragEnd={handleDragEnd} 
      initial={{ scale: 0.9, opacity: 0, y: 20 }} 
      animate={{ scale: 1, opacity: 1, y: 0 }} 
      exit={{ x: getExitX(), opacity: 0, transition: { duration: 0.3 } }} 
      className="absolute w-full h-[520px] max-w-[400px] cursor-grab active:cursor-grabbing"
    >
      <div 
        className="w-full h-full rounded-[32px] overflow-hidden relative tinder-card-shadow bg-slate-800 border border-slate-700"
        onClick={handlePhotoNavigation}
      >
        {/* Photo Indicators */}
        {userImages.length > 1 && (
          <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5">
            {userImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx === currentPhotoIndex ? 'bg-white shadow-sm' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}

        <img 
          src={userImages[currentPhotoIndex]} 
          alt={user.name} 
          className={`w-full h-full object-cover pointer-events-none select-none transition-all duration-700 ${isPrivacyMode ? 'blur-3xl scale-125' : 'blur-0 scale-100'}`} 
        />
        
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent text-white">
          {/* Distance Badge */}
          {!isPrivacyMode && (
            <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg w-fit backdrop-blur-md">
              <Navigation size={10} className="text-emerald-400 fill-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                {user.distance !== null ? `${user.distance} KM Terdekat` : 'Jarak tidak diketahui'}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <h2 className={`text-3xl font-black tracking-tight transition-all duration-500 ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>{isPrivacyMode ? 'HIDDEN' : user.name}</h2>
            {!isPrivacyMode && user.isVerified && (
              <div className="bg-emerald-500 text-white p-1 rounded-lg shadow-lg">
                <ShieldCheck size={16} />
              </div>
            )}
            <span className={`text-2xl font-light text-emerald-400 transition-all duration-500 ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>{isPrivacyMode ? '??' : user.age}</span>
          </div>
          <p className={`mt-3 text-slate-200 text-sm font-medium leading-relaxed line-clamp-2 opacity-90 transition-all duration-500 ${isPrivacyMode ? 'blur-md' : 'blur-0'}`}>{user.bio}</p>
        </div>
        
        <motion.div style={{ opacity: useTransform(x, [0, 100], [0, 1]) }} className="absolute top-12 left-12 border-4 border-emerald-400 text-emerald-400 font-black px-6 py-2 rounded-2xl rotate-[-20deg] uppercase text-4xl pointer-events-none tracking-tighter">LIKE</motion.div>
        <motion.div style={{ opacity: useTransform(x, [0, -100], [0, 1]) }} className="absolute top-12 right-12 border-4 border-rose-500 text-rose-500 font-black px-6 py-2 rounded-2xl rotate-[20deg] uppercase text-4xl pointer-events-none tracking-tighter">NOPE</motion.div>
      </div>
    </motion.div>
  );
}
