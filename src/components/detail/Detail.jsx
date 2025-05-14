import React, { useState, useEffect } from "react";
import "./detail.css";
import { auth } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { onSnapshot } from "firebase/firestore";

// Función para obtener la cantidad de amigos de un usuario
async function getFriendsCount(userId) {
  const userChatsRef = doc(db, "userchats", userId);
  const userChatsSnap = await getDoc(userChatsRef);
  if (!userChatsSnap.exists()) return 0;
  const chats = userChatsSnap.data().chats || [];
  return chats.filter((chat) => !chat.isGroup).length;
}

const Detail = () => {
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();
  const { currentUser } = useUserStore();

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [patiracha, setPatiracha] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const fetchChatData = async () => {
      if (chatId) {
        const chatDocRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
          setIsGroup(chatDoc.data().isGroup || false);
        }
      }
    };

    fetchChatData();
  }, [chatId]);

  // Obtener la patiracha del usuario (solo si no es grupo)
  useEffect(() => {
    if (user?.id && !user.isGroup) {
      // Solo si NO es grupo
      const userChatsRef = doc(db, "userchats", user.id);

      const unSub = onSnapshot(userChatsRef, (snapshot) => {
        if (snapshot.exists()) {
          const chats = snapshot.data().chats || [];
          const friendCount = chats.filter((chat) => !chat.isGroup).length;
          setPatiracha(Math.min(friendCount, 9)); // Limitar a un máximo de 9
        } else {
          setPatiracha(0); // Si no hay datos, no mostrar patiracha
        }
      });

      return () => {
        unSub(); // Limpiar el listener al desmontar
      };
    } else {
      setPatiracha(0); // No mostrar patiracha para grupos
    }
  }, [user]);

  // Escuchar el estado de actividad del usuario mostrado
  useEffect(() => {
    if (user?.id && !user.isGroup) {
      const userDocRef = doc(db, "users", user.id);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setIsActive(!!docSnap.data().isActive);
        } else {
          setIsActive(false);
        }
      });
      return () => unsubscribe();
    } else {
      setIsActive(false);
    }
  }, [user]);

  useEffect(() => {
    if (isGroup && chatId) {
      const chatDocRef = doc(db, "chats", chatId);

      const unsubscribe = onSnapshot(chatDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setTasks(docSnap.data().tasks || []);
        }
      });

      return () => unsubscribe();
    }
  }, [chatId, isGroup]);

  const addTask = async () => {
    if (newTask.trim() && isGroup) {
      const task = { text: newTask, completed: false };

      setTasks([...tasks, task]);
      setNewTask("");

      if (chatId) {
        const chatDocRef = doc(db, "chats", chatId);
        await updateDoc(chatDocRef, {
          tasks: arrayUnion(task),
        });
      }
    }
  };

  const completeTask = async (index) => {
    if (isGroup && chatId) {
      const taskToComplete = tasks[index];
      const updatedTask = { ...taskToComplete, completed: true };

      const updatedTasks = tasks.map((task, i) =>
        i === index ? updatedTask : task
      );
      setTasks(updatedTasks);

      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        const currentTasks = chatDoc.data().tasks || [];
        const newTasks = currentTasks.map((task) =>
          task.text === taskToComplete.text ? updatedTask : task
        );

        await updateDoc(chatDocRef, { tasks: newTasks });
      }
    }
  };

  const deleteTask = async (index) => {
    if (isGroup && chatId) {
      const taskToDelete = tasks[index];

      const updatedTasks = tasks.filter((_, i) => i !== index);
      setTasks(updatedTasks);

      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        const currentTasks = chatDoc.data().tasks || [];
        const newTasks = currentTasks.filter(
          (task) => task.text !== taskToDelete.text
        );

        await updateDoc(chatDocRef, { tasks: newTasks });
      }
    }
  };

  return (
    <div className="detail">
      <div className="user">
        <img src={user?.avatar || "./avatar.png"} alt="" />
        <h2>
          {user?.username}
          {/* Mostrar patiracha solo si NO es grupo y tiene amigos */}
          {!isGroup && patiracha > 0 && (
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
        {/* Mostrar estado en línea solo si NO es grupo */}
        {!isGroup && (
          <p style={{ color: isActive ? "green" : "Red" }}>
            {isActive ? "En línea" : "Desconectado"}
          </p>
        )}
      </div>

      <div className="info">
        <button className="logout" onClick={() => auth.signOut()}>
          Logout
        </button>

        {isGroup && (
          <div className="tasks-section">
            <h4>Tareas del Grupo</h4>
            <ul id="task-list">
              {tasks.map((task, index) => (
                <li
                  key={index}
                  className={task.completed ? "completed-task" : ""}
                >
                  <span className={task.completed ? "completed-text" : ""}>
                    {task.text}
                  </span>
                  {!task.completed && (
                    <button
                      className="complete-btn"
                      onClick={() => completeTask(index)}
                    >
                      Completar
                    </button>
                  )}
                  {task.completed && (
                    <button
                      className="delete-btn"
                      onClick={() => deleteTask(index)}
                    >
                      Eliminar
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="task-input">
              <input
                type="text"
                id="task-input"
                placeholder="Nueva tarea..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button id="add-task-btn" onClick={addTask}>
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Detail;
