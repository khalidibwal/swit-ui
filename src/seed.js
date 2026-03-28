import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp, getDocs, query, where, GeoPoint, doc, getDoc } from 'firebase/firestore';

const NAMES = ["Aura", "Bima", "Citra", "Dedi", "Eka", "Fani", "Gani", "Hana", "Indra", "Jihan", "Kiki", "Lulu", "Miko", "Nana", "Oki", "Putri", "Qori", "Raka", "Sita", "Toni", "Uli", "Vino", "Wati", "Xena", "Yogi", "Zaza", "Bella", "Candra", "Dina", "Eris"];
const BIOS = [
  "Suka petualangan baru! 🌍", "Pecinta kopi dan buku ☕📚", "Musik adalah hidupku 🎶", 
  "Mari berteman dan berbagi cerita ✨", "Hobi olahraga dan hidup sehat �‍♂️�",
  "Suka nonton film maraton 🎬", "Pecinta kucing garis keras 🐱", "Selalu mencari inspirasi 💡"
];
const IMAGES = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600"
];

// Helper: Hitung koordinat baru berdasarkan jarak (KM) dari titik asal
const getOffsetLocation = (lat, lon, km) => {
  const earthRadius = 6371; // km
  const randomAngle = Math.random() * 2 * Math.PI;
  const newLat = lat + (km / earthRadius) * (180 / Math.PI) * Math.cos(randomAngle);
  const newLon = lon + (km / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180) * Math.sin(randomAngle);
  return new GeoPoint(newLat, newLon);
};

export async function seedUsers(currentUserId) {
  if (!currentUserId) {
    console.log("No current user ID provided for seeding reference location.");
    return;
  }

  console.log("Starting seeding process for 30 users at 1km...");
  const usersRef = collection(db, 'users');
  
  try {
    // Ambil lokasi user saat ini sebagai titik pusat
    const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
    if (!currentUserDoc.exists() || !currentUserDoc.data().lastKnownLocation) {
      console.log("Current user has no location data. Using default Jakarta.");
    }
    
    const centerLat = currentUserDoc.exists() && currentUserDoc.data().lastKnownLocation 
      ? currentUserDoc.data().lastKnownLocation.latitude 
      : -6.200000;
    const centerLon = currentUserDoc.exists() && currentUserDoc.data().lastKnownLocation 
      ? currentUserDoc.data().lastKnownLocation.longitude 
      : 106.816666;

    for (let i = 0; i < 30; i++) {
      const name = NAMES[i % NAMES.length] + " (Seed)";
      const q = query(usersRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        const location = getOffsetLocation(centerLat, centerLon, 1); // Fixed 1 KM
        
        // Buat array images dengan 2-3 foto random
        const userImages = [
          IMAGES[i % IMAGES.length],
          IMAGES[(i + 1) % IMAGES.length],
          IMAGES[(i + 2) % IMAGES.length]
        ];

        await addDoc(usersRef, {
          name: name,
          age: 20 + Math.floor(Math.random() * 10),
          bio: BIOS[Math.floor(Math.random() * BIOS.length)],
          image: userImages[0], // Tetap simpan image utama untuk fallback
          images: userImages, // Simpan array images
          lastKnownLocation: location,
          isVerified: Math.random() > 0.5,
          createdAt: serverTimestamp()
        });
        console.log(`Added user: ${name}`);
      }
    }
    console.log("Seeding complete!");
  } catch (e) {
    console.error("Error seeding users: ", e);
  }
}
