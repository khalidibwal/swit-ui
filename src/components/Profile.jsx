import { Settings, Camera, Shield, HelpCircle, ChevronRight, LogOut, Eye, EyeOff, Database, Loader2, UserCircle, Edit3, Check, X, Crown, Sparkles, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { collection, doc, setDoc, serverTimestamp, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Profile({ isPrivacyMode, setIsPrivacyMode, currentUser, setCurrentUser, setActiveTab }) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...currentUser });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

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
      // 1. Definisikan User Utama agar ID-nya konsisten
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
      <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl relative">
            <img 
              src={isEditing ? editData.image : currentUser.image} 
              alt="Profile" 
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              onClick={handleImageClick}
            />
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer" onClick={handleImageClick}>
                <Camera className="text-white" size={24} />
              </div>
            )}
          </div>
          
          {/* Verification Badge */}
          {currentUser.isVerified && (
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-[#020617] shadow-lg">
              <ShieldCheck size={20} />
            </div>
          )}
          
          {currentUser.isGold && (
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-2 rounded-2xl border-4 border-[#020617] shadow-lg">
              <Crown size={20} />
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            {isEditing ? (
              <input 
                name="name"
                value={editData.name}
                onChange={handleInputChange}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xl font-black text-center text-white focus:outline-none focus:border-emerald-500"
              />
            ) : (
              <h2 className="text-2xl font-black text-white">{currentUser.name}, {currentUser.age}</h2>
            )}
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{currentUser.email || 'Akun Testing'}</p>
        </div>

        <button 
          onClick={isEditing ? saveProfile : handleEditToggle}
          disabled={isSaving}
          className={`absolute top-12 right-6 p-3 rounded-2xl transition-all ${isEditing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : isEditing ? <Check size={20} /> : <Edit3 size={20} />}
        </button>
      </div>

      {/* Profile Gallery */}
      {currentUser.profilePhotos?.length > 0 && (
        <div className="mt-4 px-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <ImageIcon size={14} className="text-emerald-400" /> Galeri Foto
            </h3>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-800 px-2 py-1 rounded-lg">
              {currentUser.profilePhotos.length} FOTO
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {currentUser.profilePhotos.map((photo, index) => (
              <div key={index} className="flex-shrink-0 w-24 aspect-[3/4] rounded-2xl overflow-hidden border border-slate-800 shadow-md">
                <img src={photo} className="w-full h-full object-cover" alt={`Gallery ${index}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isEditing && (
        <>
          {/* Hobbies Section */}
          <div className="mt-8 px-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Hobi Saya</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.hobbies?.map(hobby => (
                <span key={hobby} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold text-emerald-400">
                  {hobby}
                </span>
              ))}
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
            <button 
              onClick={handleLogout}
              className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
