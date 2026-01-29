import { useState, useMemo } from "react";
import { loginUser } from "../../features/auth/login";
import { Link, useNavigate } from "react-router-dom";
import '../../styles/pageLogin.css';
import BgLogin from "../../assets/background/backgroundLogin.mp4";
import eye from "../../assets/icon/eye.png"
import eyeHide from "../../assets/icon/eyeHide.png"
import emailImg from "../../assets/icon/email.png"

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Войдите в свой аккаунт")
  const [errorStatus, setErrorStatus] = useState<boolean>(false)
  
  const navigate = useNavigate();

  // Регулярное выражение для проверки Email
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

    // Сброс всех состояний
    setPassword("");
    setEmailTouched(false);
    setShowPassword(false); // Добавляем сброс показа пароля

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
      <video className="auth-video" autoPlay muted loop playsInline>
        <source src={BgLogin} type="video/mp4" />
      </video>

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
              onBlur={() => setEmailTouched(true)} // Помечаем, что пользователь выходил из поля
            />
            <button 
              type="button" 
              className="email-toggle"
            >
              <img 
                src={emailImg} 
                alt="toggle password" 
                className="toggle-icon" 
              />
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
              <img 
                src={showPassword ? eyeHide : eye} 
                alt="toggle password" 
                className="toggle-icon" 
              />
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