import { useState, useEffect } from 'react';
import Discovery from './components/Discovery.jsx';
import Messages from './components/Messages.jsx';
import Profile from './components/Profile.jsx';
import BottomNav from './components/BottomNav.jsx';
import ChatRoom from './components/ChatRoom.jsx';

// Akun Testing
const TEST_ACCOUNTS = {
  JESSICA: { id: 'jessica_user', name: 'Jessica', age: 22, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300' },
  ANDINI: { id: 'andini_user', name: 'Andini', age: 23, image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=300' }
};

function App() {
  const [activeTab, setActiveTab] = useState('discovery');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  
  // State untuk siapa yang sedang 'login' (Jessica secara default)
  const [currentUser, setCurrentUser] = useState(TEST_ACCOUNTS.JESSICA);

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
            testAccounts={TEST_ACCOUNTS}
          />
        );
      case 'likes':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-10 bg-[#0f172a]">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
              <span className="text-4xl">❤️</span>
            </div>
            <h1 className="text-2xl font-black text-white">Upgrade ke Gold</h1>
            <p className="text-slate-400 mt-4 leading-relaxed">
              Dapatkan lebih banyak match dengan SwitUI Gold!
            </p>
          </div>
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
