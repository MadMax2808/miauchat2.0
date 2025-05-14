import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "./video.css";

const Videollamada = ({ chatId, onEndCall }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [peerConnection, setPeerConnection] = useState(null);
  const socketRef = useRef(null);
  const [hasSentOffer, setHasSentOffer] = useState(false);
  const [hasSentAnswer, setHasSentAnswer] = useState(false);
  const [hasSetRemoteDescription, setHasSetRemoteDescription] = useState(false);

  useEffect(() => {
    socketRef.current = io("https://luck-vintage-lion.glitch.me"); // Durante desarrollo
    console.log("Chat ID recibido:", chatId);
    const setupWebRTC = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            url: "turn:numb.viagenie.ca",
            credential: "muazkh",
            username: "webrtc@live.com",
          },
        ],
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            chatId,
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      setPeerConnection(pc);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Enviar oferta solo si no se ha enviado antes
      if (!hasSentOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(new RTCSessionDescription(offer));
        socketRef.current.emit("offer", { offer, chatId });
        setHasSentOffer(true); // Marca que la oferta ya fue enviada
      }
    };

    setupWebRTC();

    return () => {
      if (peerConnection) {
        peerConnection.close();
      }
      socketRef.current.disconnect();
    };
  }, [chatId]);

  useEffect(() => {
    const setupSocketListeners = () => {
      if (!socketRef.current) return;

      socketRef.current.on("offer", async ({ offer }) => {
        if (hasSetRemoteDescription) return;
        setHasSetRemoteDescription(true);

        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socketRef.current.emit("answer", { answer, chatId });
        } catch (error) {
          console.error("Error al manejar la oferta:", error);
        }
      });

      socketRef.current.on("answer", async ({ answer }) => {
        if (peerConnection.signalingState !== "have-local-offer") {
          console.warn(
            "PeerConnection no está en estado 'have-local-offer', ignorando respuesta."
          );
          return;
        }

        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        } catch (error) {
          console.error("Error al manejar la respuesta:", error);
        }
      });

      socketRef.current.on("ice-candidate", async ({ candidate }) => {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error al agregar ICE Candidate:", error);
        }
      });
    };

    setupSocketListeners();

    return () => {
      if (socketRef.current) {
        socketRef.current.off("offer");
        socketRef.current.off("answer");
        socketRef.current.off("ice-candidate");
      }
    };
  }, [peerConnection, chatId]);

  const handleToggleMute = () => {
    const localStream = localVideoRef.current.srcObject;
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const handleToggleVideo = () => {
    const localStream = localVideoRef.current.srcObject;
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  };

  const handleGoBack = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    const localStream = localVideoRef.current.srcObject;
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Llama a la función onEndCall si está definida
    if (onEndCall) {
      onEndCall();
    }

    console.log("Llamada finalizada");
  };

  return (
    <div className="videollamada-container">
      <div className="video-wrapper">
        <video ref={localVideoRef} autoPlay muted className="local-video" />
        <video ref={remoteVideoRef} autoPlay className="remote-video" />
      </div>
      <div className="controls">
        <button onClick={handleGoBack} className="control-button end-call">
          Finalizar Llamada
        </button>
        <button onClick={handleToggleMute} className="control-button">
          {isMuted ? "Activar Audio" : "Mutear"}
        </button>
        <button onClick={handleToggleVideo} className="control-button">
          {isVideoOff ? "Activar Video" : "Desactivar Video"}
        </button>
      </div>
    </div>
  );
};

export default Videollamada;
