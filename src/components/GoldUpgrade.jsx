import { Crown, Check, Shield, Star, Zap, CreditCard, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function GoldUpgrade({ currentUser, setCurrentUser, onBack }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStep, setPaymentStep] = useState('plans'); // plans, checkout, success
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [selectedMethod, setSelectedMethod] = useState('qris');

  const plans = [
    { id: 'weekly', name: '1 Minggu', price: 'Rp 100', per: 'minggu', popular: false },
    { id: 'monthly', name: '1 Bulan', price: 'Rp 100', per: 'bulan', popular: true },
    { id: 'yearly', name: '12 Bulan', price: 'Rp 100', per: 'tahun', popular: false },
  ];

  const paymentMethods = [
    { id: 'qris', name: 'QRIS (Gopay/OVO/Dana)', icon: Zap, color: 'text-purple-400' },
    { id: 'va', name: 'Virtual Account (BCA/BNI)', icon: CreditCard, color: 'text-blue-400' },
    { id: 'cc', name: 'Kartu Kredit', icon: Shield, color: 'text-emerald-400' },
  ];

  const benefits = [
    { icon: Zap, text: 'Suka Tanpa Batas', desc: 'Swipe kanan sepuasnya tanpa limit harian' },
    { icon: Star, text: 'Lihat Siapa yang Menyukai Anda', desc: 'Lihat siapa yang sudah swipe kanan pada Anda' },
    { icon: Shield, text: 'Mode Privasi Lanjutan', desc: 'Kontrol penuh siapa yang bisa melihat profil Anda' },
    { icon: Sparkles, text: '5 Super Likes Gratis', desc: 'Berikan kesan pertama yang luar biasa' },
  ];

  // Cek apakah Gold masih aktif
  const isGoldActive = currentUser.isGold && currentUser.goldExpiry && (
    currentUser.goldExpiry?.toDate ? currentUser.goldExpiry.toDate() > new Date() : new Date(currentUser.goldExpiry) > new Date()
  );

  const handlePayment = async () => {
    if (isGoldActive) {
      alert("Anda sudah menjadi member Gold aktif!");
      return;
    }
    setIsProcessing(true);
    setError(null);
    
    const plan = plans.find(p => p.id === selectedPlan);
    const amountStr = plan.price.replace(/[^0-9]/g, '');
    const amount = parseInt(amountStr);

    try {
      // 1. Panggil Netlify Function (Bisa berjalan di Local & Netlify Production)
      console.log("Meminta Snap Token dari Netlify Function...");
      
      // Dev: gunakan proxy Vite ke server.cjs (menghindari CORS)
      // Prod (Netlify): gunakan Netlify Function
      const apiUrl = window.location.hostname === 'localhost' 
        ? '/api/payment' 
        : '/.netlify/functions/midtrans-payment';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `ORDER-${currentUser.id}-${Date.now()}`,
          amount: amount,
          customerDetails: {
            first_name: currentUser.name,
            email: currentUser.email || 'test@example.com'
          }
        })
      });

      const ct = response.headers.get('content-type') || '';
      const rawBody = await response.text();
      let data = null;
      try { data = ct.includes('application/json') ? JSON.parse(rawBody) : JSON.parse(rawBody); } catch (_) {}

      if (!response.ok) {
        const msg = (data && (data.error || data.message)) || rawBody || "Gagal menghubungi server pembayaran.";
        throw new Error(msg);
      }

      const token = data && data.token;
      if (!token) throw new Error("Token pembayaran tidak ditemukan dari server.");
      console.log("Snap Token berhasil didapat:", token);
      
      if (window.snap) {
        // Tambahkan class ke body untuk mencegah scroll & bantu positioning
        document.body.classList.add('modal-open');

        window.snap.pay(token, {
          onSuccess: async (result) => {
            console.log('Payment Success:', result);
            document.body.classList.remove('modal-open');
            await finalizeGoldStatus();
          },
          onPending: (result) => {
            console.log('Payment Pending:', result);
            document.body.classList.remove('modal-open');
            alert("Selesaikan pembayaran Anda di jendela Midtrans.");
            setIsProcessing(false);
          },
          onError: (result) => {
            console.error('Payment Error:', result);
            document.body.classList.remove('modal-open');
            setError("Pembayaran ditolak atau terjadi kesalahan.");
            setIsProcessing(false);
          },
          onClose: () => {
            console.log('Payment Popup Closed');
            document.body.classList.remove('modal-open');
            setIsProcessing(false);
          }
        });
      } else {
        throw new Error("Midtrans SDK (snap.js) belum dimuat. Periksa koneksi internet Anda.");
      }

    } catch (err) {
      console.error("Payment Process Error:", err);
      const message = typeof err?.message === 'string' ? err.message : '';
      if (err instanceof TypeError && message.toLowerCase().includes('failed to fetch')) {
        setError("Gagal menghubungi server pembayaran. Pastikan 'node server.cjs' berjalan di port 3001, lalu jalankan ulang 'npm run dev'.");
      } else {
        setError(message || "Gagal memproses pembayaran. Pastikan server pembayaran sudah berjalan.");
      }
      setIsProcessing(false);
    }
  };

  const finalizeGoldStatus = async () => {
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      const now = new Date();
      let expiryDate = new Date();
      
      if (plan.id === 'weekly') expiryDate.setDate(now.getDate() + 7);
      else if (plan.id === 'monthly') expiryDate.setMonth(now.getMonth() + 1);
      else if (plan.id === 'yearly') expiryDate.setFullYear(now.getFullYear() + 1);

      const userRef = doc(db, 'users', currentUser.id);
      const updateData = {
        isGold: true,
        goldExpiry: expiryDate, 
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(userRef, updateData);

      setCurrentUser(prev => ({ ...prev, ...updateData }));
      setPaymentStep('success');
    } catch (error) {
      console.error("Firestore Update Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStep === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0f172a] px-8 pb-24 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/20 ring-4 ring-amber-500/20 animate-bounce">
          <Crown size={48} className="text-white" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Selamat Datang di Gold!</h1>
        <p className="text-slate-400 mb-10 leading-relaxed">
          Akun Anda telah ditingkatkan ke <span className="text-amber-400 font-bold">SwitUI Gold</span>. Nikmati semua fitur eksklusif sekarang!
        </p>
        <button 
          onClick={onBack}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Mulai Menjelajah
        </button>
      </div>
    );
  }

  if (paymentStep === 'checkout') {
    const plan = plans.find(p => p.id === selectedPlan);
    return (
      <div className="flex flex-col h-full bg-[#0f172a] pb-24 animate-in slide-in-from-right duration-300">
        <div className="p-6 flex items-center gap-4">
          <button onClick={() => setPaymentStep('plans')} className="p-2 bg-slate-800 rounded-xl text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Pembayaran</h2>
        </div>

        <div className="flex-1 px-6 overflow-y-auto no-scrollbar">
          <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400 text-sm">Paket Dipilih</span>
              <span className="text-white font-bold">{plan.name}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <span className="text-white font-black">Total Bayar</span>
              <span className="text-amber-400 font-black text-xl">{plan.price}</span>
            </div>
          </div>

          <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 ml-1">Metode Pembayaran</h3>
          <div className="space-y-3 mb-8">
            {paymentMethods.map((method) => (
              <button 
                key={method.id} 
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left ${selectedMethod === method.id ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMethod === method.id ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  <method.icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{method.name}</p>
                  {selectedMethod === method.id && <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Metode Terpilih</p>}
                </div>
                {selectedMethod === method.id && <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-in zoom-in"><Check size={14} className="text-white" /></div>}
              </button>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 mb-6">
            <Shield size={24} className="text-amber-500 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Pembayaran Anda aman dan terenkripsi. Langganan akan diperbarui secara otomatis kecuali dibatalkan 24 jam sebelum masa berlaku habis.
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6 animate-in fade-in slide-in-from-top-2">
              <p className="text-xs text-rose-500 font-medium leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all"
          >
            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f172a] pb-24 overflow-y-auto no-scrollbar">
      {/* Header Premium */}
      <div className="bg-[#1e293b] px-6 pt-12 pb-10 flex flex-col items-center border-b border-slate-700 rounded-b-[48px] shadow-2xl relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full -ml-16 -mb-16" />

        <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20 relative z-10">
          <Crown size={40} className="text-white" fill="currentColor" />
        </div>
        
        <h1 className="text-3xl font-black text-white tracking-tight relative z-10">SwitUI <span className="text-amber-400">Gold</span></h1>
        <p className="text-slate-400 text-sm mt-2 font-medium relative z-10 text-center px-4">
          Upgrade pengalaman mencari pasangan Anda dengan fitur premium terbaik.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="px-6 mt-10 space-y-4">
        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 ml-1">Keuntungan Eksklusif</h3>
        <div className="grid grid-cols-1 gap-3">
          {benefits.map((benefit, i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex gap-4 hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                <benefit.icon size={20} className="text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{benefit.text}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="px-6 mt-12 mb-8">
        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 ml-1">
          {isGoldActive ? 'Status Member Anda' : 'Pilih Paket'}
        </h3>
        
        {isGoldActive ? (
          <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border-2 border-amber-500/50 rounded-[32px] p-8 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all duration-700" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30">
                <Crown size={32} className="text-white" fill="currentColor" />
              </div>
              <h4 className="text-xl font-black text-white mb-2 tracking-tight">SwitUI Gold Aktif</h4>
              <p className="text-slate-400 text-xs mb-6 px-4">
                Berlaku hingga: <span className="text-amber-400 font-bold">
                  {currentUser.goldExpiry?.toDate ? currentUser.goldExpiry.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(currentUser.goldExpiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </p>
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  <Check size={14} strokeWidth={4} /> Semua Fitur Terbuka
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <button 
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full p-5 rounded-3xl border-2 flex items-center justify-between transition-all duration-300 relative overflow-hidden ${selectedPlan === plan.id ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-[8px] font-black text-white px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                    Terpopuler
                  </div>
                )}
                <div className="text-left">
                  <p className={`text-sm font-black uppercase tracking-wider ${selectedPlan === plan.id ? 'text-amber-400' : 'text-slate-400'}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-white">{plan.price}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">/ {plan.per}</span>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedPlan === plan.id ? 'border-amber-500 bg-amber-500' : 'border-slate-600'}`}>
                  {selectedPlan === plan.id && <Check size={14} className="text-white" strokeWidth={4} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 mb-8">
        {!isGoldActive ? (
          <button 
            onClick={() => setPaymentStep('checkout')}
            className="w-full py-5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-[24px] font-black uppercase tracking-[0.1em] text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Lanjutkan Upgrade
          </button>
        ) : (
          <button 
            onClick={onBack}
            className="w-full py-5 bg-slate-800 text-slate-400 rounded-[24px] font-black uppercase tracking-[0.1em] text-sm border border-slate-700 hover:bg-slate-700 transition-all"
          >
            Kembali
          </button>
        )}
        <p className="text-[9px] text-center text-slate-500 mt-4 px-6 uppercase tracking-widest leading-relaxed">
          {isGoldActive ? 'Anda sedang menikmati layanan premium SwitUI Gold.' : 'Dengan melanjutkan, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi SwitUI.'}
        </p>
      </div>
    </div>
  );
}
