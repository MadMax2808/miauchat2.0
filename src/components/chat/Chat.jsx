import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import "./chat.css";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import CryptoJS from "crypto-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faVideo,
  faInfoCircle,
  faImage,
  faSmile,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import Videollamada from "../videollamada";

async function getFriendsCount(userId) {
  const userChatsRef = doc(db, "userchats", userId);
  const userChatsSnap = await getDoc(userChatsRef);
  if (!userChatsSnap.exists()) return 0;
  const chats = userChatsSnap.data().chats || [];
  return chats.filter((chat) => !chat.isGroup).length;
}

const Chat = ({ setShowDetail, showDetail }) => {
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);

  const [chat, setChat] = useState();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [img, setImg] = useState({
    file: null,
    url: "",
  });
  const [patiracha, setPatiracha] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const { currentUser } = useUserStore();
  const { chatId, user } = useChatStore();

  const endRef = useRef(null);

  //DESENCRYPTAR MENSAJES
  const secretKey = "PatiRacha";

  const encryptText = (text) => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
  };

  const decryptText = (cipherText) => {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };
  const [otraPatiracha, setOtraPatiracha] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      const userDocRef = doc(db, "users", currentUser.id);

      const unSub = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          // Ejemplo: Calcular otra patiracha basada en un campo personalizado
          const customValue = userData.customField || 0; // Reemplaza "customField" con el campo deseado
          setOtraPatiracha(Math.min(customValue, 9)); // Limitar el valor máximo a 9
        } else {
          setOtraPatiracha(0);
        }
      });

      return () => {
        unSub();
      };
    } else {
      setOtraPatiracha(0);
    }
  }, [currentUser]);

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
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  useEffect(() => {
    const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
      setChat(res.data());
    });

    return () => {
      unSub();
    };
  }, [chatId]);

  useEffect(() => {
    if (user?.id && !user.isGroup) {
      // Solo si NO es grupo
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

      return () => {
        unSub();
      };
    } else {
      setPatiracha(0);
    }
  }, [user]);

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
    if (chatId && chat?.messages) {
      const unseenMessages = chat.messages.filter(
        (message) => message.senderId !== currentUser.id && !message.isSeen,
      );

      if (unseenMessages.length > 0) {
        const updatedMessages = chat.messages.map((message) =>
          message.senderId !== currentUser.id
            ? { ...message, isSeen: true }
            : message,
        );

        updateDoc(doc(db, "chats", chatId), {
          messages: updatedMessages,
        }).catch((err) => console.log(err));
      }
    }
  }, [chatId, chat?.messages, currentUser.id]);

  const handleStartVideoCall = () => {
    setIsVideoCallActive(true);
  };
  const handleEndVideoCall = () => {
    setIsVideoCallActive(false);
  };

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleSend = async () => {
    if (text === "") return;

    let imgUrl = null;

    try {
      if (img.file) {
        imgUrl = await upload(img.file);
      }

      const encryptedText = encryptionEnabled ? encryptText(text) : text;

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          senderAvatar: currentUser.avatar,
          text: encryptedText,
          encrypted: encryptionEnabled,
          createdAt: new Date(),
          isSeen: false, // Agregar el campo isSeen
          ...(imgUrl && { img: imgUrl }),
        }),
      });

      const userIDs = [currentUser.id, user.id];
      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();

          const chatIndex = userChatsData.chats.findIndex(
            (c) => c.chatId === chatId,
          );

          // Actualizamos el último mensaje, si está visto, y la hora
          userChatsData.chats[chatIndex].lastMessage = text;
          userChatsData.chats[chatIndex].isSeen =
            id === currentUser.id ? true : false;
          userChatsData.chats[chatIndex].updatedAt = Date.now();

          await updateDoc(userChatsRef, {
            chats: userChatsData.chats,
          });
        }
      });
    } catch (err) {
      console.log(err);
    } finally {
      setImg({ file: null, url: "" });
      setText("");
    }
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no es soportada por tu navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        try {
          await updateDoc(doc(db, "chats", chatId), {
            messages: arrayUnion({
              senderId: currentUser.id,
              senderAvatar: currentUser.avatar,
              text: mapsUrl,
              isLocation: true,
              encrypted: false,
              createdAt: new Date(),
              isSeen: false,
            }),
          });
        } catch (err) {
          alert("No se pudo enviar la ubicación.");
        }
      },
      () => {
        alert("No se pudo obtener tu ubicación.");
      },
    );
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp?.seconds * 1000 || Date.now());
    const now = new Date();

    if (Math.abs(now - date) < 60000) {
      return "ahora";
    }

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="chat"
      style={{ borderRadius: showDetail ? "0" : "0 20px 20px 0" }}
    >
      <div className="top">
        <div className="user">
          <img src={user.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span>
              {user.username}

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
            </span>
            {!isGroup && (
              <p style={{ color: isActive ? "#83c781" : "rgb(184, 93, 93)" }}>
                {isActive ? "En línea" : "Desconectado"}
              </p>
            )}
          </div>
        </div>
        <div className="icons">
          <button
            className={`encryption-button ${
              !encryptionEnabled ? "disabled" : ""
            }`}
            onClick={() => setEncryptionEnabled((prev) => !prev)}
          >
            {encryptionEnabled ? "🔒 Encriptado" : "🔓 Cifrado"}
          </button>
          <FontAwesomeIcon
            icon={faVideo}
            onClick={handleStartVideoCall}
            style={{
              width: "22px",
              height: "22px",
              cursor: "pointer",
              color: "#f97077",
            }}
            title="Iniciar videollamada"
          />
          <FontAwesomeIcon
            icon={faInfoCircle}
            onClick={() => setShowDetail((prev) => !prev)}
            style={{
              width: "22px",
              height: "22px",
              cursor: "pointer",
              color: "#f97077",
            }}
            title="Detalles"
          />
        </div>
      </div>

      <div className="center">
        {chat?.messages?.map((message, index) => (
          <div
            className={
              message.senderId === currentUser?.id ? "message own" : "message"
            }
            key={index}
          >
            <img
              src={message.senderAvatar || "./avatar.png"}
              alt="Avatar"
              className="message-avatar"
            />
            <div className="texts">
              {message.img && <img src={message.img} alt="" />}
              <p>
                {message.isLocation ? (
                  <a
                    href={message.text}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "rgba(43, 58, 74, 0.5)",
                      textDecoration: "underline",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      style={{ color: "rgba(43, 58, 74, 0.5)" }}
                    />
                    Ver ubicación en Google Maps
                  </a>
                ) : message.encrypted ? (
                  decryptText(message.text)
                ) : (
                  message.text
                )}
              </p>

              <span className="message-date">
                {formatDate(message.createdAt)}
                {message.senderId === currentUser?.id && (
                  <span
                    className={`check-marks ${
                      message.isSeen ? "seen" : "not-seen"
                    }`}
                  >
                    ✔✔
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}

        {img.url && (
          <div className="message own">
            <div className="texts">
              <img src={img.url} alt="" />
            </div>
          </div>
        )}

        <div ref={endRef}></div>
      </div>

      <div
        className="bottom"
        style={{ borderRadius: showDetail ? "0" : "0 0 20px 0" }}
      >
        <div className="chat-input-capsule">
          {/* Botón de adjuntar */}
          <label htmlFor="file" className="action-icon-btn">
            <FontAwesomeIcon icon={faImage} title="Adjuntar imagen" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />

          {/* Botón de ubicación */}
          <button
            className="action-icon-btn"
            title="Enviar ubicación"
            onClick={handleSendLocation}
          >
            <FontAwesomeIcon icon={faLocationDot} />
          </button>

          {/* Input de texto */}
          <input
            type="text"
            className="chat-input-text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Emoji Picker */}
          <div className="emoji-container">
            {otraPatiracha === 9 && (
              <>
                <FontAwesomeIcon
                  icon={faSmile}
                  className="action-icon-btn emoji-icon"
                  onClick={() => setOpen((prev) => !prev)}
                />
                <div className="picker">
                  <EmojiPicker open={open} onEmojiClick={handleEmoji} />
                </div>
              </>
            )}
          </div>

          {/* Botón de Enviar */}
          <button className="send-btn" onClick={handleSend}>
            <FontAwesomeIcon icon={faPaperPlane} className="send-icon" />
          </button>
        </div>
      </div>

      {isVideoCallActive && (
        <Videollamada
          chatId={chatId}
          onEndCall={() => setIsVideoCallActive(false)}
        />
      )}
    </div>
  );
};

export default Chat;
