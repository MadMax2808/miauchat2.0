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

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faUserPlus } from "@fortawesome/free-solid-svg-icons";

const AddUser = () => {
  const [user, setUser] = useState(null);
  const { currentUser } = useUserStore();
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    const formData = new FormData(e.target);
    const username = formData.get("username");

    if (!username) {
      toast.warn("Escribe un nombre para buscar 🐾");
      setSearching(false);
      return;
    }

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

     if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setUser({ ...userDoc.data(), id: userDoc.id });
      } else {
        toast.error("No se encontró a ese michi 🙀");
        setUser(null);
      }

    } catch (error) {

    console.log(error);
      toast.error("Hubo un error en la búsqueda");

    }finally {

        setSearching(false);

    }
  };

  const handleAdd = async () => {
    if (user.id === currentUser.id) {
      toast.error("No puedes agregarte a ti mismo, ¡quiérete un poco! 😹");
      return;
    }

    try {
      const userChatsDocRef = doc(db, "userchats", currentUser.id);
      const userChatsSnap = await getDoc(userChatsDocRef);

      if (userChatsSnap.exists()) {
        const chats = userChatsSnap.data().chats || [];
        if (chats.some((chat) => chat.receiverId === user.id)) {
          toast.info("Ya son amigos, ¡ve a chatear! 🐾");
          return;
        }
      }

      const chatRef = collection(db, "chats");
      const newChatRef = doc(chatRef);

      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

      // Actualizar receptor
      await setDoc(doc(db, "userchats", user.id), {
          chats: arrayUnion({
            chatId: newChatRef.id,
            lastMessage: "",
            receiverId: currentUser.id,
            updatedAt: Date.now(),
          }),
        }, { merge: true }
      );

      // Actualizar usuario actual
      await setDoc(doc(db, "userchats", currentUser.id), {
          chats: arrayUnion({
            chatId: newChatRef.id,
            lastMessage: "",
            receiverId: user.id,
            updatedAt: Date.now(),
          }),
        }, { merge: true }
      );

      toast.success(`${user.username} agregado a la manada ✨`);
      setUser(null);
    } catch (err) {
      console.log(err);
      toast.error("Error al agregar al usuario");
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
       <div className="search-input-wrapper">
            <input type="text" placeholder="Username" name="username" />
            <button disabled={searching}>
                <FontAwesomeIcon icon={faSearch} />
            </button>
        </div>

      </form>

      {user && (
        <div className="user-result">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAdd} className="add-btn">
            <FontAwesomeIcon icon={faUserPlus} style={{marginRight: "8px"}} />
            Agregar
          </button>
        </div>
      )}
    </div>
  );
};

export default AddUser;
