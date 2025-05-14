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
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import Videollamada from "../videollamada";

async function getFriendsCount(userId) {
  const userChatsRef = doc(db, "userchats", userId);
  const userChatsSnap = await getDoc(userChatsRef);
  if (!userChatsSnap.exists()) return 0;
  const chats = userChatsSnap.data().chats || [];
  return chats.filter((chat) => !chat.isGroup).length;
}

const Chat = () => {
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
  const [patiracha, setPatiracha] = useState(0); // Estado para la patiracha

  const { currentUser } = useUserStore();
  const { chatId, user } = useChatStore();

  const endRef = useRef(null);

  //DESENCRYPTAR MENSAJES
  const secretKey = "PatiRacha"; // Idealmente deberías guardarla más segura

  const encryptText = (text) => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
  };

  const decryptText = (cipherText) => {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  useEffect(() => {
    // Obtener si el chat es un grupo desde Firestore
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

  // Obtener la patiracha del usuario con el que chateas
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

  // Escuchar el estado de actividad del usuario con el que chateas
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
        (message) => message.senderId !== currentUser.id && !message.isSeen
      );

      if (unseenMessages.length > 0) {
        const updatedMessages = chat.messages.map((message) =>
          message.senderId !== currentUser.id
            ? { ...message, isSeen: true }
            : message
        );

        updateDoc(doc(db, "chats", chatId), {
          messages: updatedMessages,
        }).catch((err) => console.log(err));
      }
    }
  }, [chatId, chat?.messages, currentUser.id]);

  const handleStartVideoCall = () => {
    setIsVideoCallActive(true); // Activa la videollamada
  };

  const handleEndVideoCall = () => {
    setIsVideoCallActive(false); // Finaliza la videollamada
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
      }
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

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={user.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span>
              {user.username}
              {/* Solo mostrar patiracha si NO es grupo */}
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
            {encryptionEnabled ? "🔒 Encriptado" : "🔓 Normal"}
          </button>

          <img
            src="./video.png"
            alt="Iniciar videollamada"
            onClick={handleStartVideoCall}
            style={{ cursor: "pointer" }}
          />
          <img src="./info.png" alt="" />
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
                      color: "#83c781",
                      textDecoration: "underline",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      style={{ color: "#83c781" }}
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

      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          {/* Botón para enviar ubicación */}
          <button
            className="locationButton"
            title="Enviar ubicación"
            onClick={handleSendLocation}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <FontAwesomeIcon
              icon={faLocationDot}
              style={{ color: "#FFFFFF" }}
            />
          </button>
        </div>
        <input
          type="text"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="emoji">
          {patiracha === 9 && ( // Mostrar solo si patiracha está al máximo
            <>
              <img
                src="./emoji.png"
                alt=""
                onClick={() => setOpen((prev) => !prev)}
              />
              <div className="picker">
                <EmojiPicker open={open} onEmojiClick={handleEmoji} />
              </div>
            </>
          )}
        </div>
        <button className="sendButton" onClick={handleSend}>
          Enviar
        </button>
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
