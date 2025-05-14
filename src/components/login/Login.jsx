import React from "react";
import "./login.css";
import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import upload from "../../lib/upload";

const Login = () => {
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    if (e.target.files[0]) {
      setAvatar({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };
  const validatePassword = (password) => {
    // Requisitos básicos: al menos 6 caracteres
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    return true;
  };
  const validateUsername = (username) => {
    // Validar que el nombre de usuario no esté vacío y tenga al menos 3 caracteres
    if (!username || username.trim().length < 3) {
      toast.error("El nombre de usuario debe tener al menos 3 caracteres");
      return false;
    }
    return true;
  };
  const validateEmail = (email) => {
    // Expresión regular para validar correos electrónicos
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      toast.error("Por favor, ingresa un correo electrónico válido");
      return false;
    }
    return true;
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { username, email, password } = Object.fromEntries(formData);

    // Validar nombre de usuario
    if (!validateUsername(username)) {
      setLoading(false);
      return;
    }

    // Validar correo electrónico
    if (!validateEmail(email)) {
      setLoading(false);
      return;
    }

    // Validar contraseña
    if (!validatePassword(password)) {
      setLoading(false);
      return;
    }

    // Validar si se subió una foto de perfil
    if (!avatar.file) {
      toast.error("Por favor, sube una foto de perfil");
      setLoading(false);
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const imgUrl = await upload(avatar.file);
      console.log("URL de imagen:", imgUrl);

      await setDoc(doc(db, "users", res.user.uid), {
        username,
        email,
        avatar: imgUrl,
        id: res.user.uid,
        blocked: [],
      });

      await setDoc(doc(db, "userchats", res.user.uid), {
        chats: [],
      });

      toast.success("Usuario creado con éxito");
    } catch (err) {
      console.log(err);
      toast.error("Error al registrarse");
    } finally {
      setLoading(false);
    }

    //toast.warn("Hello")
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Inicio de sesión exitoso");
    } catch (err) {
      console.log(err);
      toast.error("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="item">
        <img src="./Logo.png" alt="" />
        <h2>¡Bienvenido a MiauApp!</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>
            {loading ? "Cargando" : "Iniciar Sesión"}
          </button>
        </form>
      </div>
      <div className="separator"></div>
      <div className="item">
        <img src="./Logo.png" alt="" />
        <h2>Crea una cuenta</h2>
        <form onSubmit={handleRegister}>
          <label htmlFor="file">
            <img src={avatar.url || "./avatar.png"} alt="" />
            Subir foto de perfil
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleChange}
          />

          <input type="text" placeholder="Username" name="username" />
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>
            {loading ? "Cargando" : "Registrarse"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
