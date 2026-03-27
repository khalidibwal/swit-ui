import { Settings, Camera, Shield, HelpCircle, ChevronRight, LogOut, Eye, EyeOff, Database, Loader2, UserCircle, Edit3, Check, X, Crown, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { collection, doc, setDoc, serverTimestamp, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Profile({ isPrivacyMode, setIsPrivacyMode, currentUser, setCurrentUser, testAccounts, setActiveTab }) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...currentUser });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Update editData saat currentUser berubah (ketika ganti akun testing)
  useEffect(() => {
    setEditData({ ...currentUser });
  }, [currentUser]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditData({ ...currentUser });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.id);
      await setDoc(userDocRef, {
        name: editData.name,
        age: parseInt(editData.age),
        bio: editData.bio,
        image: editData.image,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setCurrentUser({ ...editData });
      setIsEditing(false);
      setSeedStatus('Profil berhasil diperbarui!');
      setTimeout(() => setSeedStatus(''), 3000);
    } catch (error) {
      console.error("Save Profile Error:", error);
      setSeedStatus('Gagal memperbarui profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    { icon: Settings, label: 'Settings', color: 'text-slate-400' },
    { icon: Shield, label: 'Privacy & Safety', color: 'text-emerald-400' },
    { icon: HelpCircle, label: 'Help Center', color: 'text-sky-400' },
  ];

  const seedSampleData = async () => {
    setIsSeeding(true);
    setSeedStatus('Membersihkan & mengisi data...');
    try {
      // 1. Definisikan User Utama agar ID-nya konsisten dengan TEST_ACCOUNTS di App.jsx
      const users = [
        { 
          id: 'jessica_user', 
          name: "Jessica", 
          age: 22, 
          bio: "Software Engineer yang suka traveling. 💻✈️", 
          image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600" 
        },
        { 
          id: 'andini_user', 
          name: "Andini", 
          age: 23, 
          bio: "Suka petualangan dan kopi. ☕✨", 
          image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600" 
        },
        { 
          id: 'budi_user', 
          name: "Budi", 
          age: 26, 
          bio: "Digital artist. Mari bertukar ide! �", 
          image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600" 
        }
      ];

      // Gunakan setDoc agar ID-nya tetap (tidak random)
      for (const user of users) {
        const { id, ...userData } = user;
        await setDoc(doc(db, 'users', id), {
          ...userData,
          createdAt: serverTimestamp()
        });
      }

      setSeedStatus('Berhasil! Jessica & Andini sudah ada di database.');
      setTimeout(() => setSeedStatus(''), 3000);
    } catch (error) {
      console.error("Seed Error:", error);
      setSeedStatus('Gagal mengisi data.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] pb-24 overflow-y-auto no-scrollbar">
      {/* Header Profile */}
      <div className="bg-[#1e293b] px-6 pt-12 pb-10 flex flex-col items-center border-b border-slate-700 rounded-b-[48px] shadow-2xl relative">
        {/* Edit Button */}
        <button 
          onClick={handleEditToggle}
          className="absolute top-6 right-6 p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-emerald-400 transition-colors border border-slate-700"
        >
          {isEditing ? <X size={20} /> : <Edit3 size={20} />}
        </button>

        <div className="relative group">
          <div 
            onClick={handleImageClick}
            className={`w-36 h-36 rounded-[40px] p-1 bg-gradient-to-tr ${currentUser.isGold ? 'from-amber-500 to-yellow-300' : 'from-emerald-500 to-emerald-300'} shadow-2xl overflow-hidden transition-all duration-500 ${isEditing ? 'cursor-pointer hover:scale-105 ring-4 ring-emerald-500/30' : ''}`}
          >
            <div className="w-full h-full rounded-[38px] border-4 border-[#1e293b] overflow-hidden bg-slate-800 relative">
              <img
                src={isEditing ? editData.image : currentUser.image}
                alt="My Profile"
                className={`w-full h-full object-cover transition-all duration-700 ${isPrivacyMode && !isEditing ? 'blur-2xl scale-125' : 'blur-0 scale-100'}`}
              />
              {currentUser.isGold && !isEditing && (
                <div className="absolute top-2 right-2 bg-amber-500 p-1.5 rounded-xl shadow-lg border-2 border-[#1e293b]">
                  <Crown size={14} className="text-white" fill="currentColor" />
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                  <Camera size={32} className="text-white animate-pulse" />
                </div>
              )}
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          {!isEditing && (
            <button className="absolute bottom-1 right-1 w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-4 border-[#1e293b] shadow-xl">
              <Camera size={22} fill="currentColor" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="mt-6 w-full space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 mb-1 block">Nama</label>
                <input 
                  name="name"
                  value={editData.name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-500 focus:outline-none transition-all"
                  placeholder="Nama"
                />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 mb-1 block">Umur</label>
                <input 
                  name="age"
                  type="number"
                  value={editData.age}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-500 focus:outline-none transition-all"
                  placeholder="20"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 mb-1 block">Bio</label>
              <textarea 
                name="bio"
                value={editData.bio}
                onChange={handleInputChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-500 focus:outline-none transition-all resize-none h-24"
                placeholder="Tulis bio singkat..."
              />
            </div>
            <button 
              onClick={saveProfile}
              disabled={isSaving}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        ) : (
          <>
            <h1 className={`mt-6 text-2xl font-black text-white tracking-tight transition-all duration-500 flex items-center gap-2 ${isPrivacyMode ? 'blur-sm' : 'blur-0'}`}>
              {isPrivacyMode ? 'HIDDEN' : `${currentUser.name}, ${currentUser.age}`}
              {currentUser.isGold && <Crown size={20} className="text-amber-400" fill="currentColor" />}
            </h1>
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mt-1">Akun Testing</p>
            
            {!currentUser.isGold && (
              <button 
                onClick={() => setActiveTab('likes')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Sparkles size={14} />
                Upgrade to Gold
              </button>
            )}
          </>
        )}
      </div>

      {!isEditing && (
        <>
          {/* Switch Identity Section */}
          <div className="mt-8 px-6">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-4 flex gap-4">
              {Object.values(testAccounts).map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setCurrentUser(acc)}
                  className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${currentUser.id === acc.id ? 'bg-emerald-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-slate-200'}`}
                >
                  <UserCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Login as {acc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Database Setup Section */}
          <div className="mt-6 px-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-[32px] p-6">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-2">
                <Database size={18} className="text-emerald-400" /> Setup Data
              </h3>
              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">Klik tombol ini agar Jessica & Andini masuk ke database Discovery.</p>
              <button 
                onClick={seedSampleData}
                disabled={isSeeding}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isSeeding ? 'bg-slate-700 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg'}`}
              >
                {isSeeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                {isSeeding ? 'Memproses...' : 'Sync Jessica & Andini'}
              </button>
              {seedStatus && (
                <p className={`mt-3 text-center text-[10px] font-bold uppercase tracking-wider ${seedStatus.includes('Gagal') ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {seedStatus}
                </p>
              )}
            </div>
          </div>

          {/* Privacy Toggle Section */}
          <div className="mt-4 px-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isPrivacyMode ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'} transition-colors`}>
                  {isPrivacyMode ? <EyeOff size={24} /> : <Eye size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Mode Privasi</h3>
                  <p className="text-[10px] text-slate-400">Sembunyikan profil Anda</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                className={`w-12 h-7 rounded-full relative transition-colors ${isPrivacyMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isPrivacyMode ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="mt-auto px-6 pt-10 pb-6">
            <button className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3">
              <LogOut size={20} /> Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
