import { useState, useEffect } from 'react';
import Discovery from './components/Discovery.jsx';
import Messages from './components/Messages.jsx';
import Profile from './components/Profile.jsx';
import BottomNav from './components/BottomNav.jsx';
import ChatRoom from './components/ChatRoom.jsx';
import GoldUpgrade from './components/GoldUpgrade.jsx';
import Auth from './components/Auth.jsx';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function App() {
  const [activeTab, setActiveTab] = useState('discovery');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setPermissionError(null);
      if (user) {
        try {
          // Ambil data user dari firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data());
          } else {
            setCurrentUser(null);
          }
        } catch (err) {
          const msg = typeof err?.message === 'string' ? err.message : '';
          if (err?.code === 'permission-denied' || msg.toLowerCase().includes('insufficient permissions')) {
            setPermissionError('Firestore rules menolak akses baca/tulis. Periksa Security Rules di Firebase Console.');
          } else {
            setPermissionError('Terjadi error saat mengambil profil dari Firestore.');
          }
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-700 rounded-3xl p-6">
          <h2 className="text-lg font-black text-white tracking-tight">Akses Firestore Ditolak</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">{permissionError}</p>
          <div className="mt-5 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Buka Firebase Console → Firestore Database → Rules, lalu pastikan user yang login boleh baca/tulis dokumen sendiri di <span className="text-slate-200 font-bold">users/{'{uid}'}</span> dan mengakses data publik yang diperlukan aplikasi.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onAuthComplete={setCurrentUser} />;
  }

  const renderContent = () => {
    // Jika ada chat yang dipilih, tampilkan ChatRoom (khusus di tab messages)
    if (activeTab === 'messages' && selectedChat) {
      return (
        <ChatRoom 
          chat={selectedChat} 
          currentUser={currentUser}
          onBack={() => setSelectedChat(null)} 
          isPrivacyMode={isPrivacyMode} 
        />
      );
    }

    switch (activeTab) {
      case 'discovery':
        return (
          <Discovery 
            isPrivacyMode={isPrivacyMode} 
            currentUser={currentUser} 
            onGoToChat={(chat) => {
              setActiveTab('messages');
              setSelectedChat(chat);
            }}
          />
        );
      case 'messages':
        return <Messages isPrivacyMode={isPrivacyMode} currentUser={currentUser} onChatClick={setSelectedChat} setActiveTab={setActiveTab} />;
      case 'profile':
        return (
          <Profile 
            isPrivacyMode={isPrivacyMode} 
            setIsPrivacyMode={setIsPrivacyMode}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            setActiveTab={setActiveTab}
          />
        );
      case 'likes':
        return (
          <GoldUpgrade 
            currentUser={currentUser} 
            setCurrentUser={setCurrentUser}
            onBack={() => setActiveTab('discovery')} 
          />
        );
      default:
        return <Discovery isPrivacyMode={isPrivacyMode} currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#020617]">
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderContent()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
