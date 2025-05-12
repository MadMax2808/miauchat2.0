import "./addGroup.css";
import { db } from "../../../../lib/firebase";
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
import { toast } from "react-toastify";

const AddGroup = () => {
  const { currentUser } = useUserStore();
  const [groupName, setGroupName] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [members, setMembers] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchUsername.trim() === "") return;

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", searchUsername));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();

        if (
          userData.id === currentUser.id ||
          members.some((m) => m.id === userData.id)
        ) {
          toast.error("Este usuario ya está en el grupo o eres tú");
          return;
        }

        setFoundUser(userData);
      } else {
        toast.error("Usuario no encontrado");
        setFoundUser(null);
      }
    } catch (error) {
      console.error("Error buscando usuario:", error);
    }
  };

  const handleAddMember = () => {
    setMembers((prev) => [...prev, foundUser]);
    setFoundUser(null);
    setSearchUsername("");
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("El nombre del grupo es obligatorio");
      return;
    }

    if (members.length < 2) {
      toast.error("Debes agregar al menos 2 miembros además de ti");
      return;
    }

    const groupDocRef = doc(collection(db, "groups"));
    const groupId = groupDocRef.id;

    const chatDocRef = doc(collection(db, "chats"));
    const chatId = chatDocRef.id;

    const memberIds = members.map((m) => m.id);
    const allMemberIds = [currentUser.id, ...memberIds];

    try {
      // 1. Crear grupo
      await setDoc(groupDocRef, {
        id: groupId,
        name: groupName,
        createdAt: serverTimestamp(),
        members: allMemberIds,
      });

      // 2. Crear chat del grupo
      await setDoc(chatDocRef, {
        id: chatId,
        groupId,
        isGroup: true,
        messages: [],
        createdAt: serverTimestamp(),
      });

      // 3. Agregar el chat a los documentos de cada usuario
      await Promise.all(
        allMemberIds.map(async (userId) => {
          const userChatsRef = doc(db, "userchats", userId);
          const userDoc = await getDoc(userChatsRef);

          const chatData = {
            chatId,
            groupId,
            isGroup: true,
            lastMessage: "",
            updatedAt: Date.now(),
          };

          if (userDoc.exists()) {
            await updateDoc(userChatsRef, {
              chats: arrayUnion(chatData),
            });
          } else {
            await setDoc(userChatsRef, {
              chats: [chatData],
            });
          }
        })
      );

      toast.success("Grupo y chat creados exitosamente");
      setGroupName("");
      setMembers([]);
    } catch (err) {
      console.error("Error al crear grupo y chat:", err);
      toast.error("No se pudo crear el grupo");
    }
  };

  return (
    <div className="addGroup">
      <input
        type="text"
        placeholder="Nombre del grupo"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Username"
          value={searchUsername}
          onChange={(e) => setSearchUsername(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {foundUser && (
        <div className="user">
          <div className="detail">
            <img src={foundUser.avatar || "./avatar.png"} alt="" />
            <span>{foundUser.username}</span>
          </div>
          <button onClick={handleAddMember}>Agregar al grupo</button>
        </div>
      )}

      {members.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>Miembros del grupo:</h4>
          {members.map((m) => (
            <div key={m.id} className="user">
              <div className="detail">
                <img src={m.avatar || "./avatar.png"} alt="" />
                <span>{m.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleCreateGroup} style={{ marginTop: "20px" }}>
        Crear Grupo
      </button>
    </div>
  );
};

export default AddGroup;
