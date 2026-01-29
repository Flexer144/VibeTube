import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

import '../../styles/pageRegister.css';
import BgLogin from "../../assets/background/backgroundLogin.mp4";
import eye from "../../assets/icon/eye.png";
import eyeHide from "../../assets/icon/eyeHide.png";
import emailImg from "../../assets/icon/email.png";
import userImg from "../../assets/icon/userIcon.png";
import passwordImg from "../../assets/icon/passwordIcon.png";

export default function Register() {
  // --- Данные формы ---
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- Состояния UI ---
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Создайте свой аккаунт");
  const [errorStatus, setErrorStatus] = useState<boolean>(false);

  // --- Состояния "Touched" (пользователь трогал поле) ---
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  // --- Состояния проверок ---
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const navigate = useNavigate();

  // 1. Валидация Email
  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  // 2. Валидация Username (3-20, латиница, цифры, _)
  const validateUsername = (name: string) => {
    return String(name).match(/^[a-zA-Z0-9_]{6,20}$/);
  };

  // 3. Валидация Пароля (8-30 символов, обязательно наличие латинских букв)
  const validatePassword = (pass: string) => {
    // (?=.*[a-zA-Z]) — обязательное наличие хотя бы одной латинской буквы
    // [a-zA-Z0-9!@#$%^&*()_+=\-{}\[\]:;"'<>,.?\/|\\~`] — разрешенный набор символов (только латиница и спецсимволы)
    return String(pass).match(/^(?=.*[a-zA-Z])[a-zA-Z0-9!@#$%^&*()_+=\-{}\[\]:;"'<>,.?\/|\\~`]{8,30}$/);
  };

  // --- Memoized проверки ---
  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const isUsernameFormatValid = useMemo(() => validateUsername(username), [username]);
  const isPasswordValid = useMemo(() => validatePassword(password), [password]);
  const isPasswordsMatch = password === confirmPassword && password !== "";

  // Общая валидность формы
  const isFormValid = 
    isEmailValid && 
    isUsernameFormatValid && 
    !usernameTaken && 
    isPasswordValid &&
    isPasswordsMatch &&
    !isCheckingUsername;

  // --- Функция проверки имени в БД ---
  const checkUsernameAvailability = async () => {
    if (!username || !isUsernameFormatValid) return;

    setIsCheckingUsername(true);
    
    // Используем .select с ограничением, так как нам просто нужно знать, 
    // есть ли ХОТЯ БЫ ОДИН такой пользователь
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username); 

    setIsCheckingUsername(false);

    if (error) {
      console.error("Ошибка проверки:", error.message);
      return;
    }

    // Если массив data не пустой (длина > 0), значит имя занято
    if (data && data.length > 0) {
      setUsernameTaken(true);
    } else {
      setUsernameTaken(false);
    }
  };

  // Хендлеры
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setUsernameTaken(false);
  };

  const handleUsernameBlur = () => {
    setUsernameTouched(true);
    checkUsernameAvailability();
  };

  const submit = async () => {
    if (!isFormValid) return;

    // Регистрация Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage("Пользователь с такой почтой уже существует");
      setErrorStatus(true);
      return;
    }

    const user = data.user;
    if (!user) return;

    // Создание профиля
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username,
      });

    if (profileError) {
      // Ловим ошибку дубликата, если проверка onBlur пропустила (race condition)
      if (profileError.message.includes("duplicate key") || profileError.code === "23505") {
         setErrorMessage("Этот никнейм уже занят!");
         console.log(errorMessage)
         setUsernameTaken(true);
      } else {
         setErrorMessage("Ошибка создания профиля");
      }
      setErrorStatus(true);
      return;
    }

    // Авто-вход
    await supabase.auth.signInWithPassword({ email, password });
    
    navigate("/");
  };

  return (
    <div className="auth-page">
      <video className="auth-video" autoPlay muted loop playsInline>
        <source src={BgLogin} type="video/mp4" />
      </video>

      <div className="auth-overlay" />

      <div className="auth-card">
        <h1 className="auth-title">Регистрация</h1>
        <p className={`auth-subtitle ${!errorStatus ? '' : 'errorAuth'}`}>{errorMessage}</p>

        {/* --- USERNAME --- */}
        <div className="auth-field-container">
          <div className={`auth-field ${usernameTouched && (!isUsernameFormatValid || usernameTaken) ? "error" : ""}`}>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
            />
            <button disabled={true} type="button" className="user-toggle" style={{cursor:'default'}}>
               <img src={userImg} alt="user" className="toggle-icon" />
            </button>
          </div>
          {usernameTouched && !isUsernameFormatValid && (
            <span className="error-message-user">6-20 символов (a-z, 0-9, _)</span>
          )}
          {usernameTouched && isUsernameFormatValid && usernameTaken && (
            <span className="error-message-user">Это имя пользователя уже занято</span>
          )}
        </div>

        {/* --- EMAIL --- */}
        <div className="auth-field-container">
          <div className={`auth-field ${emailTouched && !isEmailValid ? "error" : ""}`}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
            />
            <button disabled={true} type="button" className="email-toggle">
              <img src={emailImg} alt="email" className="toggle-icon" />
            </button>
          </div>
          {emailTouched && !isEmailValid && (
            <span className="error-message">Введите корректный email</span>
          )}
        </div>

        {/* --- PASSWORD --- */}
        <div className="auth-field-container">
          <div className={`auth-field ${passwordTouched && !isPasswordValid ? "error" : ""}`}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <img src={showPassword ? eyeHide : eye} alt="toggle" className="toggle-icon" />
            </button>
          </div>
          {passwordTouched && !isPasswordValid && (
            <span className="error-message-password">
              8-30 символов (a-z, 0-9, _)
            </span>
          )}
        </div>

        {/* --- CONFIRM PASSWORD --- */}
        <div className="auth-field-container">
          <div className={`auth-field ${confirmPasswordTouched && !isPasswordsMatch ? "error" : ""}`}>
            <input type={showPassword ? "text" : "password"}
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
            />
            <button 
              type="button" 
              className="password-toggle"
            >
              <img src={passwordImg} alt="toggle" className="toggle-icon" />
            </button>
          </div>
          {confirmPasswordTouched && !isPasswordsMatch && (
            <span className="error-message-repassword">Пароли не совпадают</span>
          )}
        </div>

        <button 
          onClick={submit} 
          className="auth-button"
          disabled={!isFormValid}
        >
          Зарегистрироваться
        </button>

        <p className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}