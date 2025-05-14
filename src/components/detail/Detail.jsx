import React, { useState, useEffect } from "react";
import "./detail.css";
import { auth } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../lib/firebase";

const Detail = () => {
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();
  const { currentUser } = useUserStore();

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isGroup, setIsGroup] = useState(false);

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

  useEffect(() => {
    const fetchTasks = async () => {
      if (isGroup && chatId) {
        const chatDocRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
          setTasks(chatDoc.data().tasks || []);
        } else {
          // Si no existe el documento, inicializa las tareas
          await setDoc(chatDocRef, { tasks: [] });
          setTasks([]);
        }
      }
    };

    fetchTasks();
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

  return (
    <div className="detail">
      <div className="user">
        <img src={user?.avatar || "./avatar.png"} alt="" />
        <h2>{user?.username}</h2>
        <p>En linea?</p>
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