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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faUsers, faPlus, faTrash, faUsersGear } from "@fortawesome/free-solid-svg-icons";

const AddGroup = () => {
  const { currentUser } = useUserStore();
  const [groupName, setGroupName] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchUsername.trim() === "") return;

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", searchUsername));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.id === currentUser.id || members.some((m) => m.id === userData.id)) {
          toast.error("Este michi ya está en la lista o eres tú 🐾");
          return;
        }
        setFoundUser(userData);
      } else {
        toast.error("Usuario no encontrado 🙀");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMember = () => {
    setMembers((prev) => [...prev, foundUser]);
    setFoundUser(null);
    setSearchUsername("");
  };

  const handleRemoveMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return toast.error("¡El grupo necesita un nombre! 🐱");
    if (members.length < 2) return toast.error("Agrega al menos a 2 amigos");

    setLoading(true);
    try {
      const groupDocRef = doc(collection(db, "groups"));
      const chatDocRef = doc(collection(db, "chats"));
      
      const allMemberIds = [currentUser.id, ...members.map((m) => m.id)];

      await setDoc(groupDocRef, {
        id: groupDocRef.id,
        name: groupName,
        createdAt: serverTimestamp(),
        members: allMemberIds,
        admin: currentUser.id
      });

      await setDoc(chatDocRef, {
        id: chatDocRef.id,
        groupId: groupDocRef.id,
        isGroup: true,
        messages: [],
        createdAt: serverTimestamp(),
      });

      await Promise.all(
        allMemberIds.map(async (userId) => {
          const userChatsRef = doc(db, "userchats", userId);
          await setDoc(userChatsRef, {
            chats: arrayUnion({
              chatId: chatDocRef.id,
              groupId: groupDocRef.id,
              isGroup: true,
              lastMessage: "¡Nuevo grupo creado! 🐾",
              updatedAt: Date.now(),
            }),
          }, { merge: true });
        })
      );

      toast.success("¡Manada creada con éxito! ✨");
      setGroupName("");
      setMembers([]);
    } catch (err) {
      toast.error("Error al crear el grupo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addGroup">
      <div className="header">
        <FontAwesomeIcon icon={faUsersGear} className="main-icon" />
        <h2>Nueva Manada</h2>
      </div>

      <input
        className="group-name-input"
        type="text"
        placeholder="Nombre del grupo..."
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />

      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Buscar amigos por username..."
          value={searchUsername}
          onChange={(e) => setSearchUsername(e.target.value)}
        />
        <button type="submit"><FontAwesomeIcon icon={faSearch} /></button>
      </form>

      {foundUser && (
        <div className="user-found animate-pop">
          <div className="detail">
            <img src={foundUser.avatar || "./avatar.png"} alt="" />
            <span>{foundUser.username}</span>
          </div>
          <button className="add-btn" onClick={handleAddMember}>
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      )}

      <div className="members-list">
        <h4>Miembros seleccionados ({members.length}):</h4>
        <div className="scroll-area">
          {members.map((m) => (
            <div key={m.id} className="member-item">
              <div className="detail">
                <img src={m.avatar || "./avatar.png"} alt="" />
                <span>{m.username}</span>
              </div>
              <FontAwesomeIcon 
                icon={faTrash} 
                className="delete-icon" 
                onClick={() => handleRemoveMember(m.id)} 
              />
            </div>
          ))}
        </div>
      </div>

      <button className="create-btn" onClick={handleCreateGroup} disabled={loading}>
        {loading ? "Creando..." : "Crear Grupo"}
      </button>
    </div>
  );
};

export default AddGroup;