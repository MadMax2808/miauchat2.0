import { useState, useEffect } from "react";
import "./chatList.css";
import AddUser from "./addUser/addUser";
import { useUserStore } from "../../../lib/userStore";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";
import AddGroup from "./addGroup/addGroup";
import { FaUserPlus, FaUsers, FaTimes } from "react-icons/fa";

// Función para obtener la cantidad de amigos de un usuario
async function getFriendsCount(userId) {
  const userChatsRef = doc(db, "userchats", userId);
  const userChatsSnap = await getDoc(userChatsRef);
  if (!userChatsSnap.exists()) return 0;
  const chats = userChatsSnap.data().chats || [];
  return chats.filter((chat) => !chat.isGroup).length;
}

function ChatList() {
  const [addMode, setAddMode] = useState(false);
  const [chats, setChats] = useState([]);
  const [groupMode, setGroupMode] = useState(false);
  const [patirachaCounts, setPatirachaCounts] = useState({}); // Nuevo estado
  const [liveUsers, setLiveUsers] = useState({});

  const { currentUser, friendsCount, fetchFriendsCount } = useUserStore();
  const { chatId, changeChat } = useChatStore();

  useEffect(() => {
    if (currentUser?.id) {
      fetchFriendsCount(currentUser.id);
    }
  }, [currentUser, fetchFriendsCount]);

  useEffect(() => {
    if (currentUser?.id) {
      const unSub = onSnapshot(
        doc(db, "userchats", currentUser.id),
        async (res) => {
          const items = res.data().chats;

          const promises = items.map(async (item) => {
            if (item.isGroup) {
              const groupDoc = await getDoc(doc(db, "groups", item.groupId));
              const groupData = groupDoc.exists() ? groupDoc.data() : null;

              return {
                ...item,
                user: groupData
                  ? {
                      username: groupData.name,
                      avatar: "/group.png",
                    }
                  : {
                      username: "Grupo desconocido",
                      avatar: "/group.png",
                    },
              };
            } else {
              const userDoc = await getDoc(doc(db, "users", item.receiverId));
              const userData = userDoc.exists() ? userDoc.data() : null;

              return {
                ...item,
                user: userData
                  ? userData
                  : {
                      username: "Usuario eliminado",
                      avatar: "/avatar.png",
                    },
              };
            }
          });

          const chatData = await Promise.all(promises);

          setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));

          // Calcular patirachaCounts para cada usuario
          const newPatirachaCounts = {};
          for (const chat of chatData) {
            if (!chat.isGroup && chat.user && chat.user.id) {
              const userChatsRef = doc(db, "userchats", chat.user.id);
              const userChatsSnap = await getDoc(userChatsRef);
              if (userChatsSnap.exists()) {
                const userChats = userChatsSnap.data().chats || [];
                const friendCount = userChats.filter((c) => !c.isGroup).length;
                newPatirachaCounts[chat.user.id] = Math.min(friendCount, 9);
              }
            }
          }

          setPatirachaCounts(newPatirachaCounts);
        }
      );

      return () => {
        unSub();
      };
    }
  }, [currentUser.id]);
  useEffect(() => {
    const unsubscribes = [];

    // Nos aseguramos de que ya hay chats cargados
    if (chats.length > 0) {
      chats.forEach((chat) => {
        if (!chat.isGroup && chat.user?.id) {
          const unSub = onSnapshot(
            doc(db, "users", chat.user.id),
            (docSnap) => {
              if (docSnap.exists()) {
                const userData = docSnap.data();
                setLiveUsers((prev) => ({
                  ...prev,
                  [chat.user.id]: userData.isActive,
                }));
              }
            }
          );
          unsubscribes.push(unSub);
        }
      });
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [chats]);

  const handleSelect = async (chat) => {
    const userChats = chats.map((item) => {
      const { user, ...rest } = item;
      return rest;
    });

    const chatIndex = userChats.findIndex(
      (item) => item.chatId === chat.chatId
    );

    userChats[chatIndex].isSeen = true;

    const userChatsRef = doc(db, "userchats", currentUser.id);

    try {
      await updateDoc(userChatsRef, {
        chats: userChats,
      });
      changeChat(chat.chatId, chat.user);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="/search.png" />
          <input type="text" placeholder="Search" />
        </div>
        <div className="actions">
          <button
            className={`action-button ${groupMode ? "active" : ""}`}
            onClick={() => {
              setGroupMode((prev) => !prev);
              setAddMode(false);
            }}
            title={groupMode ? "Cerrar Grupo" : "Agregar Grupo"}
          >
            {groupMode ? <FaTimes /> : <FaUsers />}
          </button>

          <button
            className={`action-button ${addMode ? "active" : ""}`}
            onClick={() => {
              setAddMode((prev) => !prev);
              setGroupMode(false);
            }}
            title={addMode ? "Cerrar Usuario" : "Agregar Usuario"}
          >
            {addMode ? <FaTimes /> : <FaUserPlus />}
          </button>
        </div>
      </div>

      <div
        style={{
          color: "#fff",
          fontWeight: "bold",
          textAlign: "center",
          margin: "10px 0",
        }}
      >
        Amigos agregados: {friendsCount}
      </div>

      {chats.map((chat) => {
        let patirachaImg = null;
        if (!chat.isGroup && chat.user && chat.user.id) {
          const count = patirachaCounts[chat.user.id] || 0;
          const imgNum = Math.min(count, 9); // Máximo 9
          if (imgNum > 0) {
            patirachaImg = (
              <img
                src={`/PatiRacha/72px (${imgNum}).png`}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  marginLeft: 8,
                  verticalAlign: "middle",
                }}
              />
            );
          }
        }

        return (
          <div
            className="item"
            key={chat.chatId}
            onClick={() => handleSelect(chat)}
            style={{
              backgroundColor: chat?.isSeen ? "transparent" : "#353F34",
            }}
          >
            <img
              src={chat.user.avatar || "./avatar.png"}
              alt=""
              className={
                !chat.isGroup
                  ? liveUsers[chat.user.id]
                    ? "active-border"
                    : "inactive-border"
                  : ""
              }
            />
            <div className="texts">
              <span>
                {chat.user.username}
                {patirachaImg}
              </span>
              <p>{chat.lastMessage}</p>
            </div>
          </div>
        );
      })}

      {addMode && <AddUser />}
      {groupMode && <AddGroup />}
    </div>
  );
}

export default ChatList;
