import "./addUser.css";
import { db } from "../../../../lib/firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useState } from "react";
import { useUserStore } from "../../../../lib/userStore";

const AddUser = () => {
  const [user, setUser] = useState(null);
  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username");

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setUser({ ...userDoc.data(), id: userDoc.id });
      }
    } catch (error) {
      console.log("No se encontro al usuario:", error);
    }
  };

  const handleAdd = async () => {
    if (user.id === currentUser.id) {
      toast.error("No puedes agregar a ti mismo");
      return;
    }

    const userChatsDocRef = doc(db, "userchats", currentUser.id);
    const userChatsSnap = await getDoc(userChatsDocRef);

    if (userChatsSnap.exists()) {
      const chats = userChatsSnap.data().chats || [];
      const alreadyAdded = chats.some((chat) => chat.receiverId === user.id);

      if (alreadyAdded) {
        toast.error("Ya tienes un chat con este usuario");
        return;
      }
    }

    try {
      const chatRef = collection(db, "chats");
      const newChatRef = doc(chatRef);

      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

      await setDoc(
        doc(db, "userchats", user.id),
        {
          chats: arrayUnion({
            chatId: newChatRef.id,
            lastMessage: "",
            receiverId: currentUser.id,
            updatedAt: Date.now(),
          }),
        },
        { merge: true },
      );

      await setDoc(
        doc(db, "userchats", currentUser.id),
        {
          chats: arrayUnion({
            chatId: newChatRef.id,
            lastMessage: "",
            receiverId: user.id,
            updatedAt: Date.now(),
          }),
        },
        { merge: true },
      );

      alert("Usuario agregado exitosamente");
      setUser(null);
    } catch (err) {
      console.log(err);
      alert("Error al agregar usuario");
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Username" name="username" />
        <button>Buscar</button>
      </form>

      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAdd}>Agregar Usuario</button>
        </div>
      )}
    </div>
  );
};

export default AddUser;
