import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

const DUMMY_USERS = [
  {
    name: "Fajar",
    age: 26,
    bio: "Foodie yang hobi masak 🍳🥘",
    image: "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Gita",
    age: 20,
    bio: "Mahasiswa tingkat akhir yang butuh healing 🎓✨",
    image: "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Haikal",
    age: 27,
    bio: "Gym rat and health enthusiast 🏋️‍♂️🥗",
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=600",
  }
];

export async function seedUsers() {
  console.log("Starting seeding process...");
  const usersRef = collection(db, 'users');
  
  for (const user of DUMMY_USERS) {
    try {
      // Cek apakah user sudah ada berdasarkan nama (sederhana)
      const q = query(usersRef, where('name', '==', user.name));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await addDoc(usersRef, {
          ...user,
          createdAt: serverTimestamp()
        });
        console.log(`Added user: ${user.name}`);
      } else {
        console.log(`User ${user.name} already exists, skipping.`);
      }
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }
  console.log("Seeding complete!");
}
