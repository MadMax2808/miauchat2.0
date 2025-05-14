import React, { useEffect, useState } from "react";
import "./userinfo.css";
import { useUserStore } from "../../../lib/userStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

// Función para obtener la cantidad de amigos de un usuario
async function getFriendsCount(userId) {
  const userChatsRef = doc(db, "userchats", userId);
  const userChatsSnap = await getDoc(userChatsRef);
  if (!userChatsSnap.exists()) return 0;
  const chats = userChatsSnap.data().chats || [];
  return chats.filter(chat => !chat.isGroup).length;
}

const Userinfo = () => {
  const { currentUser } = useUserStore();
  const [patiracha, setPatiracha] = useState(0);

  useEffect(() => {
    const fetchPatiracha = async () => {
      if (currentUser?.id) {
        const count = await getFriendsCount(currentUser.id);
        setPatiracha(Math.min(count, 9));
      }
    };
    fetchPatiracha();
  }, [currentUser]);

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
              style={{ width: 32, height: 32, marginLeft: 8, verticalAlign: "middle" }}
            />
          )}
        </h2>
      </div>
      <div className="icons">
        <img src="./more.png" alt="" />
        <img src="./video.png" alt="" />
        <img src="./edit.png" alt="" />
      </div>
    </div>
  );
};

export default Userinfo;
