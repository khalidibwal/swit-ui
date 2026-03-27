import { useState, useEffect } from 'react';
import Discovery from './components/Discovery.jsx';
import Messages from './components/Messages.jsx';
import Profile from './components/Profile.jsx';
import BottomNav from './components/BottomNav.jsx';
import ChatRoom from './components/ChatRoom.jsx';
import GoldUpgrade from './components/GoldUpgrade.jsx';
import Auth from './components/Auth.jsx';
import { seedUsers } from './seed';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function App() {
  const [activeTab, setActiveTab] = useState('discovery');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedUsers();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Ambil data user dari firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data());
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
        return <Messages isPrivacyMode={isPrivacyMode} currentUser={currentUser} onChatClick={setSelectedChat} />;
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
