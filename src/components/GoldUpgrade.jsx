import { Crown, Check, Shield, Star, Zap, CreditCard, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function GoldUpgrade({ currentUser, setCurrentUser, onBack }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState('plans'); // plans, checkout, success
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = [
    { id: 'weekly', name: '1 Minggu', price: 'Rp 49.000', per: 'minggu', popular: false },
    { id: 'monthly', name: '1 Bulan', price: 'Rp 149.000', per: 'bulan', popular: true },
    { id: 'yearly', name: '12 Bulan', price: 'Rp 899.000', per: 'tahun', popular: false },
  ];

  const benefits = [
    { icon: Zap, text: 'Suka Tanpa Batas', desc: 'Swipe kanan sepuasnya tanpa limit harian' },
    { icon: Star, text: 'Lihat Siapa yang Menyukai Anda', desc: 'Lihat siapa yang sudah swipe kanan pada Anda' },
    { icon: Shield, text: 'Mode Privasi Lanjutan', desc: 'Kontrol penuh siapa yang bisa melihat profil Anda' },
    { icon: Sparkles, text: '5 Super Likes Gratis', desc: 'Berikan kesan pertama yang luar biasa' },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    // Simulasi delay pembayaran
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Update Firestore
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        isGold: true,
        goldExpiry: serverTimestamp(), // Idealnya tambah durasi sesuai plan
        updatedAt: serverTimestamp()
      });

      // Update Local State
      setCurrentUser(prev => ({ ...prev, isGold: true }));
      setPaymentStep('success');
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Gagal memproses pembayaran. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStep === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0f172a] px-8 text-center animate-in fade-in zoom-in duration-500">
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
      <div className="flex flex-col h-full bg-[#0f172a] animate-in slide-in-from-right duration-300">
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
            {['Kartu Kredit', 'GoPay / OVO', 'Virtual Account'].map((method, i) => (
              <div key={method} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${i === 0 ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  <CreditCard size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{method}</p>
                  {i === 0 && <p className="text-[10px] text-emerald-400 font-bold">Terpilih</p>}
                </div>
                {i === 0 && <Check size={18} className="text-emerald-500" />}
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 mb-10">
            <Shield size={24} className="text-amber-500 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Pembayaran Anda aman dan terenkripsi. Langganan akan diperbarui secara otomatis kecuali dibatalkan 24 jam sebelum masa berlaku habis.
            </p>
          </div>
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
        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 ml-1">Pilih Paket</h3>
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
      </div>

      <div className="px-6 mb-8">
        <button 
          onClick={() => setPaymentStep('checkout')}
          className="w-full py-5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-[24px] font-black uppercase tracking-[0.1em] text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Lanjutkan Upgrade
        </button>
        <p className="text-[9px] text-center text-slate-500 mt-4 px-6 uppercase tracking-widest leading-relaxed">
          Dengan melanjutkan, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi SwitUI.
        </p>
      </div>
    </div>
  );
}
