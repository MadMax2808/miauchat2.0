import React, { useState, useEffect } from "react";
import "./detail.css";
import { auth } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import emailjs from "emailjs-com";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSignOutAlt,
  faEnvelope,
  faTasks,
  faPlus,
  faCheck,
  faTrash,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";

const Detail = () => {
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked} =
    useChatStore();
  const { currentUser } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [patiracha, setPatiracha] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Lógica de Fetching (Mantenemos tu lógica intacta)
  useEffect(() => {
    const fetchChatData = async () => {
      if (chatId) {
        const chatDocRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatDocRef);
        if (chatDoc.exists()) setIsGroup(chatDoc.data().isGroup || false);
      }
    };
    fetchChatData();
  }, [chatId]);

  useEffect(() => {
    if (user?.id && !user.isGroup) {
      const userChatsRef = doc(db, "userchats", user.id);
      const unSub = onSnapshot(userChatsRef, (snapshot) => {
        if (snapshot.exists()) {
          const chats = snapshot.data().chats || [];
          const friendCount = chats.filter((chat) => !chat.isGroup).length;
          setPatiracha(Math.min(friendCount, 9));
        } else {
          setPatiracha(0);
        }
      });
      return () => unSub();
    }
  }, [user]);

  useEffect(() => {
    if (user?.id && !user.isGroup) {
      const userDocRef = doc(db, "users", user.id);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) setIsActive(!!docSnap.data().isActive);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (isGroup && chatId) {
      const unsubscribe = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
        if (docSnap.exists()) setTasks(docSnap.data().tasks || []);
      });
      return () => unsubscribe();
    }
  }, [chatId, isGroup]);

  // Funciones de Tareas e Email (Mantenemos tu lógica funcional)
  const addTask = async () => {
    if (newTask.trim() && isGroup && chatId) {
      const task = { text: newTask, completed: false };
      await updateDoc(doc(db, "chats", chatId), { tasks: arrayUnion(task) });
      setNewTask("");
    }
  };

  const completeTask = async (index) => {
    if (isGroup && chatId) {
      const updatedTasks = tasks.map((t, i) =>
        i === index ? { ...t, completed: true } : t,
      );
      await updateDoc(doc(db, "chats", chatId), { tasks: updatedTasks });
    }
  };

  const deleteTask = async (index) => {
    if (isGroup && chatId) {
      const updatedTasks = tasks.filter((_, i) => i !== index);
      await updateDoc(doc(db, "chats", chatId), { tasks: updatedTasks });
    }
  };

  const handleSendEmail = () => {
    if (!emailBody.trim()) return alert("El mensaje está vacío");
    emailjs
      .send(
        "service_xh8mftu",
        "template_brlynnu",
        {
          to_email: user.email,
          name: currentUser.username,
          message: emailBody,
        },
        "5T3n0KY39W0MVgBrl",
      )
      .then(() => {
        alert("Correo enviado 🐾");
        setEmailBody("");
        setShowModal(false);
      });
  };

  return (
    <div className="detail">
      <div className="user">
        <div className="avatar-wrapper">
          <img src={user?.avatar || "./avatar.png"} alt="" />
          {!isGroup && (
            <FontAwesomeIcon
              icon={faCircle}
              className={`status-dot ${isActive ? "online" : "offline"}`}
            />
          )}
        </div>
        <h2>
          {user?.username}
          {!isGroup && patiracha > 0 && (
            <img
              src={`./PatiRacha/72px (${patiracha}).png`}
              alt="Patiracha"
              className="pati-badge"
            />
          )}
        </h2>
        {!isGroup && (
          <p className="status-text">
            {isActive ? "En línea" : "Desconectado"}
          </p>
        )}
      </div>

      <div className="info-scroll">
        {isGroup ? (
          <div className="tasks-section glass-panel">
            <h4>
              <FontAwesomeIcon icon={faTasks} /> Tareas de la Manada
            </h4>
            <div className="task-input">
              <input
                type="text"
                placeholder="Nueva misión..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button onClick={addTask}>
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
            <ul className="task-list">
              {tasks.map((task, index) => (
                <li
                  key={index}
                  className={task.completed ? "task-item done" : "task-item"}
                >
                  <span>{task.text}</span>
                  <div className="task-actions">
                    {!task.completed ? (
                      <button
                        className="complete-btn"
                        onClick={() => completeTask(index)}
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                    ) : (
                      <button
                        className="delete-btn"
                        onClick={() => deleteTask(index)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          user?.email && (
            <button
              className="action-btn email"
              onClick={() => setShowModal(true)}
            >
              <FontAwesomeIcon icon={faEnvelope} /> Enviar Correo
            </button>
          )
        )}

     
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3>Enviar correo a {user.username}</h3>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Escribe tu mensaje gatuno..."
            />
            <div className="modal-actions">
              <button className="confirm-btn" onClick={handleSendEmail}>
                Enviar
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detail;
