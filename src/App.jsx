import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Chat from "./components/chat/Chat";
import Detail from "./components/detail/Detail";
import List from "./components/list/List";
import Login from "./components/login/Login";
import Notification from "./components/notification/Notification";
import { auth, setUserActiveStatus } from "./lib/firebase"; // Importa la función aquí
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore();

  useEffect(() => {
    let lastUid = null;
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
      if (user?.uid) {
        setUserActiveStatus(user.uid, true); // Activo al iniciar sesión
        lastUid = user.uid;
      } else if (lastUid) {
        setUserActiveStatus(lastUid, false); // Inactivo al cerrar sesión
        lastUid = null;
      }
    });

    return () => {
      if (lastUid) setUserActiveStatus(lastUid, false); // Inactivo al desmontar
      unSub();
    };
  }, [fetchUserInfo]);

  if (isLoading) return <div className="loading">Cargando...</div>;

  return (
    <div className="container">
      {currentUser ? (
        <>
          <List />
          {chatId && <Chat />}
          {chatId && <Detail />}
        </>
      ) : (
        <Login />
      )}
      <Notification />
    </div>
  );
};

export default App;
