import { useState, useMemo, useEffect, useRef } from "react";
import { loginUser } from "../../features/auth/login";
import { Link, useNavigate } from "react-router-dom";
import '../../styles/pageLogin.css';
import eye from "../../assets/icon/eye.png"
import eyeHide from "../../assets/icon/eyeHide.png"
import emailImg from "../../assets/icon/email.png"

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Войдите в свой аккаунт");
  const [errorStatus, setErrorStatus] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const navigate = useNavigate();


 useEffect(() => {
  let cursorApp: any = null;
  let isCancelled = false; // Флаг для отмены, если компонент размонтировался

  const initCursor = async () => {
    try {
      // @ts-ignore 
      const module = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js");
      
      // Если пока мы грузили модуль, пользователь уже ушел со страницы — выходим
      if (isCancelled) return;

      const TubesCursor = module.default;
      if (canvasRef.current) {
        cursorApp = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#6366f1", "#8b5cf6", "#3b82f6"],
            lights: {
              intensity: 200,
              colors: ["#a5b4fc", "#c4b5fd", "#93c5fd", "#ffffff"]
            }
          }
        });
      }
    } catch (error) {
      console.warn("WebGPU Cursor Error:", error);
    }
  };

  initCursor();

  return () => {
    isCancelled = true;
    if (cursorApp) {
      // Пытаемся полностью остановить рендер
      if (typeof cursorApp.destroy === 'function') {
        cursorApp.destroy();
      }
      cursorApp = null;
    }
    // Очищаем контекст canvas вручную, если библиотека этого не делает
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
      if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}, []);


  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const isFormValid = isEmailValid && password.length >= 8;
  
  const submit = async () => {
    if (!isFormValid) return;
    const { error } = await loginUser(email, password);

    setPassword("");
    setEmailTouched(false);
    setShowPassword(false); 

    if (error?.message === 'Invalid login credentials') {
      setErrorMessage("Неверная почта или пароль!");
      setErrorStatus(true);
      return;
    }
    
    setErrorMessage("Войдите в свой аккаунт");
    setErrorStatus(false);
    navigate("/");
  };

  return (
    <div className="auth-page">
      {/* --- CANVAS ДЛЯ КУРСОРОВ --- */}
      <canvas ref={canvasRef} className="cursor-canvas"></canvas>

      {/* АНИМИРОВАННЫЙ ФОН */}
      <div className="animated-background">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>
      </div>

      <div className="auth-overlay" />

      <div className="auth-card">
        <h1 className="auth-title">Вход</h1>
        <p className={`auth-subtitle ${!errorStatus ? '' : 'errorAuth'}`}>{errorMessage}</p>

        {/* Поле Email */}
        <div className="auth-field-container">
          <div className={`auth-field ${emailTouched && !isEmailValid ? "error" : ""}`}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
            />
            <button type="button" className="email-toggle">
              <img src={emailImg} alt="email icon" className="toggle-icon" />
            </button>
          </div>
          {emailTouched && !isEmailValid && (
            <span className="error-message-login">Введите корректный email</span>
          )}
        </div>

        {/* Поле Пароль */}
        <div className="auth-field-container">
          <div className="auth-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <img src={showPassword ? eyeHide : eye} alt="toggle password" className="toggle-icon" />
            </button>
          </div>
        </div>

        <button 
          onClick={submit} 
          className="auth-button"
          disabled={!isFormValid}
        >
          Войти
        </button>

        <p className="auth-footer">
          Нет аккаунта? <Link to="/register">Зарегистрируйся!</Link>
        </p>
      </div>
    </div>
  );
}