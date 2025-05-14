import { doc, getDoc } from "firebase/firestore";
import { create } from "zustand";
import { db } from "./firebase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,
  friendsCount: 0, // Nuevo estado

  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        set({ currentUser: docSnap.data(), isLoading: false });
      } else {
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.log(err);
      return set({ currentUser: null, isLoading: false });
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
      const count = chats.filter(chat => !chat.isGroup).length;
      set({ friendsCount: count });
    } catch (err) {
      console.log(err);
      set({ friendsCount: 0 });
    }
  },
}));
