import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, ChevronRight, Check, Camera, Upload, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const HOBBIES_LIST = [
  "Musik", "Travel", "Gaming", "Membaca", "Olahraga", 
  "Memasak", "Fotografi", "Seni", "Teknologi", "Film",
  "Kopi", "Gunung", "Pantai", "Kucing", "Anjing",
  "Fashion", "Kesehatan", "Bisnis", "Menulis", "Coding"
];

export default function Auth({ onAuthComplete }) {
  const [step, setStep] = useState('welcome'); // welcome -> onboarding
  const [name, setName] = useState('');
  const [selectedHobbies, setSelectedHobbies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tempUser, setTempUser] = useState(null);
  const [profilePhotos, setProfilePhotos] = useState([]);
  const [verificationPhoto, setVerificationPhoto] = useState(null);
  const profilePhotoInputRef = useRef(null);
  const verificationPhotoInputRef = useRef(null);

  const toggleHobby = (hobby) => {
    setError(null);
    if (selectedHobbies.includes(hobby)) {
      setSelectedHobbies(prev => prev.filter(h => h !== hobby));
    } else {
      setSelectedHobbies(prev => [...prev, hobby]);
    }
  };

  const handlePhotoUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfilePhotos(prev => [...prev, reader.result]);
        } else {
          setVerificationPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index) => {
    setProfilePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Cek apakah user sudah ada di Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists() && userDoc.data().hobbies?.length >= 3 && userDoc.data().isVerified) {
        // Jika sudah ada dan lengkap, langsung masuk
        onAuthComplete(userDoc.data());
      } else {
        // Jika belum lengkap, lanjut ke step onboarding
        setTempUser(user);
        setName(user.displayName || '');
        setStep('onboarding');
      }
    } catch (err) {
      console.error("Google Auth error:", err);
      setError("Gagal login dengan Google: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!tempUser || profilePhotos.length < 2 || !verificationPhoto) return;
    
    setLoading(true);
    setError(null);
    try {
      const userData = {
        id: tempUser.uid,
        name: name,
        email: tempUser.email,
        hobbies: selectedHobbies,
        profilePhotos: profilePhotos,
        verificationPhoto: verificationPhoto,
        isVerified: true, // Untuk demo, langsung di-verify
        createdAt: serverTimestamp(),
        image: profilePhotos[0], // Gunakan foto pertama sebagai avatar utama
        age: 20 + Math.floor(Math.random() * 10),
        bio: `Hi! Saya ${name}, senang bertemu kamu.`
      };

      await setDoc(doc(db, 'users', tempUser.uid), userData);
      onAuthComplete(userData);
    } catch (err) {
      console.error("Firestore error:", err);
      setError("Gagal menyimpan profil: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center p-6 z-50 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[100px] rounded-full" />

      <AnimatePresence mode="wait">
        {step === 'welcome' ? (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/20">
              <Heart className="text-white fill-current" size={40} />
            </div>
            <h1 className="text-4xl font-black text-white mb-4">Swit UI</h1>
            <p className="text-slate-400 mb-12">Temukan pasangan yang memiliki hobi yang sama denganmu secara instan.</p>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Continue with Google
                </>
              )}
            </button>
          </motion.div>
        ) : step === 'onboarding' ? (
          <motion.div 
            key="onboarding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md flex flex-col h-full max-h-[80vh]"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Ceritakan tentang dirimu</h2>
            <p className="text-slate-400 mb-8">Ini membantu kami mencarikan match yang pas.</p>

            <div className="space-y-6 overflow-y-auto pr-2 no-scrollbar">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nama Kamu</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="block text-sm font-medium text-slate-300">Pilih Hobi</label>
                  <span className={`text-xs ${selectedHobbies.length >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {selectedHobbies.length}/3 dipilih
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOBBIES_LIST.map(hobby => (
                    <button
                      key={hobby}
                      onClick={() => toggleHobby(hobby)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedHobbies.includes(hobby) 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {hobby}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <button 
                onClick={() => setStep('photos')}
                disabled={name.trim().length < 2 || selectedHobbies.length < 3}
                className="w-full py-4 bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Lanjut ke Foto <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        ) : step === 'photos' ? (
          <motion.div 
            key="photos"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md flex flex-col h-full max-h-[80vh]"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Upload Foto Profil</h2>
            <p className="text-slate-400 mb-8">Pilih minimal 2 foto terbaikmu untuk ditampilkan di slide.</p>

            <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 no-scrollbar">
              {profilePhotos.map((photo, index) => (
                <div key={index} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 group">
                  <img src={photo} className="w-full h-full object-cover" alt="Profile" />
                  <button 
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Utama</div>
                  )}
                </div>
              ))}
              
              {profilePhotos.length < 6 && (
                <button 
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-emerald-400"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                    <Plus size={24} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Tambah Foto</span>
                </button>
              )}
              <input 
                type="file" 
                ref={profilePhotoInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handlePhotoUpload(e, 'profile')} 
              />
            </div>

            <div className="mt-auto pt-8">
              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-xs text-slate-400 font-medium">Progress</span>
                <span className={`text-xs font-bold ${profilePhotos.length >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {profilePhotos.length}/2 Minimal
                </span>
              </div>
              <button 
                onClick={() => setStep('verification')}
                disabled={profilePhotos.length < 2}
                className="w-full py-4 bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Lanjut Verifikasi <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="verification"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md flex flex-col h-full max-h-[80vh]"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Verifikasi Foto</h2>
            <p className="text-slate-400 mb-8">Ambil foto selfie sambil memegang kertas bertuliskan "SWIT" untuk memverifikasi akunmu.</p>

            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              {verificationPhoto ? (
                <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-slate-800 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20">
                  <img src={verificationPhoto} className="w-full h-full object-cover" alt="Verification" />
                  <button 
                    onClick={() => setVerificationPhoto(null)}
                    className="absolute bottom-4 right-4 px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Ganti Foto
                  </button>
                  <div className="absolute top-4 left-4 p-3 bg-emerald-500 text-white rounded-2xl">
                    <ShieldCheck size={24} />
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-8">
                  <div className="w-full aspect-video rounded-3xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-4 bg-slate-800/50">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center text-slate-500">
                      <Camera size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-300">Ambil Foto Verifikasi</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Pastikan wajah terlihat jelas</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => verificationPhotoInputRef.current?.click()}
                    className="w-full py-4 bg-slate-800 border border-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-700 transition-all"
                  >
                    <Upload size={20} className="text-emerald-400" /> Upload Foto Selfie
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={verificationPhotoInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="user"
                onChange={(e) => handlePhotoUpload(e, 'verification')} 
              />
            </div>

            <div className="mt-auto pt-8">
              {error && (
                <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-medium leading-relaxed">
                  {error}
                </div>
              )}
              <button 
                onClick={handleComplete}
                disabled={loading || !verificationPhoto}
                className="w-full py-4 bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Selesaikan Profil <Sparkles size={18} /></>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
