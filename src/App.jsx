import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Chat from "./components/chat/Chat";
import Detail from "./components/detail/Detail";
import List from "./components/list/List";
import Login from "./components/login/Login";
import Notification from "./components/notification/Notification";
import { auth, setUserActiveStatus } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore();
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let lastUid = null;
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
      if (user?.uid) {
        setUserActiveStatus(user.uid, true);
        lastUid = user.uid;
      } else if (lastUid) {
        setUserActiveStatus(lastUid, false);
        lastUid = null;
      }
    });

    return () => {
      if (lastUid) setUserActiveStatus(lastUid, false); // Inactivo al desmontar
      unSub();
    };
  }, [fetchUserInfo]);

  useEffect(() => {
    setShowDetail(false);
  }, [chatId]);

  if (isLoading) return <div className="loading">Cargando...</div>;

  return (
    <div className="container">
      {currentUser ? (
        <>
          <List />
          {chatId && (
            <Chat setShowDetail={setShowDetail} showDetail={showDetail} />
          )}
          {chatId && showDetail && <Detail />}
        </>
      ) : (
        <Login />
      )}
      <Notification />
    </div>
  );
};

export default App;
