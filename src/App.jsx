import { useState, useEffect } from 'react';
import Discovery from './components/Discovery.jsx';
import Messages from './components/Messages.jsx';
import Profile from './components/Profile.jsx';
import BottomNav from './components/BottomNav.jsx';
import ChatRoom from './components/ChatRoom.jsx';
import GoldUpgrade from './components/GoldUpgrade.jsx';

// Akun Testing
const TEST_ACCOUNTS = {
  JESSICA: { id: 'jessica_user', name: 'Jessica', age: 22, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300', isGold: false },
  ANDINI: { id: 'andini_user', name: 'Andini', age: 23, image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=300', isGold: false }
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
