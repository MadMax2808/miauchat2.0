import React from "react";
import "./login.css";
import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });

  const handleChange = (e) => {
    if (e.target.files[0]) {
      setAvatar({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleLogin = (e) => {
    e.preventDefault()
    //toast.warn("Hello")
  }

  return (
    <div className="login">
      <div className="item">
        <img src="./Logo.png" alt="" />
        <h2>¡Bienvenido a MiauApp!</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button>Iniciar Sesión</button>
        </form>
      </div>
      <div className="separator"></div>
      <div className="item">
        <img src="./Logo.png" alt="" />
        <h2>Crea una cuenta</h2>
        <form>
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
          <button>Registrarse</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
