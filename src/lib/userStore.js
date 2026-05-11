import { doc, onSnapshot } from "firebase/firestore";
import { create } from "zustand";
import { db } from "./firebase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,

  fetchUserInfo: (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const docRef = doc(db, "users", uid);

      // Usamos onSnapshot para escuchar cambios en tiempo real
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          set({
            currentUser: {
              blocked: [], // Fallback por si no existe el campo
              ...docSnap.data(),
              id: docSnap.id,
            },
            isLoading: false,
          });
        } else {
          set({ currentUser: null, isLoading: false });
        }
      });
    } catch (err) {
      console.log(err);
      set({ currentUser: null, isLoading: false });
    }
  },

  // Nueva función para contar amigos
  fetchFriendsCount: async (uid) => {
    if (!uid) return set({ friendsCount: 0 });
    try {
      const userChatsRef = doc(db, "userchats", uid);
      const userChatsSnap = await getDoc(userChatsRef);
      if (!userChatsSnap.exists()) return set({ friendsCount: 0 });
      const chats = userChatsSnap.data().chats || [];
      const count = chats.filter((chat) => !chat.isGroup).length;
      set({ friendsCount: count });
    } catch (err) {
      console.log(err);
      set({ friendsCount: 0 });
    }
  },
}));
