import React, { useEffect, useState } from "react";
import "./userInfo.css";
import { useUserStore } from "../../../lib/userStore";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { onSnapshot } from "firebase/firestore";

// Función para obtener la cantidad de amigos de un usuario
async function getFriendsCount(userId) {
  const userChatsRef = doc(db, "userchats", userId);
  const userChatsSnap = await getDoc(userChatsRef);
  if (!userChatsSnap.exists()) return 0;
  const chats = userChatsSnap.data().chats || [];
  return chats.filter((chat) => !chat.isGroup).length;
}

const Userinfo = () => {
  const { currentUser } = useUserStore();
  const [patiracha, setPatiracha] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      const userChatsRef = doc(db, "userchats", currentUser.id);

      const unsubscribe = onSnapshot(userChatsRef, (snapshot) => {
        if (snapshot.exists()) {
          const chats = snapshot.data().chats || [];
          const friendCount = chats.filter((chat) => !chat.isGroup).length;
          setPatiracha(Math.min(friendCount, 9)); // Limitar a un máximo de 9
        } else {
          setPatiracha(0);
        }
      });

      return () => unsubscribe(); // Limpiar el listener al desmontar
    }
  }, [currentUser]);

  console.log("Datos del usuario actual:", currentUser);
  return (
    <div className="userInfo">
      <div className="user">
        <img src={currentUser.avatar || "./avatar.png"} alt="" />
        <h2>
          {currentUser.username}
          {patiracha > 0 && (
            <img
              src={`./PatiRacha/72px (${patiracha}).png`}
              alt={`Patiracha ${patiracha}`}
              style={{
                width: 32,
                height: 32,
                marginLeft: 8,
                verticalAlign: "middle",
              }}
            />
          )}
        </h2>
      </div>
      <div className="icons">
        {/* Contenedor relativo para el menú */}
        <div className="more-container">
          <img
            src="./more.png"
            alt="más"
            onClick={() => setOpen((prev) => !prev)}
          />
          {open && (
            <div className="dropdown-menu">
              <button onClick={() => auth.signOut()} className="logout-btn">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Userinfo;
