import { useState, useMemo, useRef } from "react";
import { loginUser } from "../../features/auth/login";
import { Link, useNavigate } from "react-router-dom";
import { useTubesCursor } from "../../shared/lib/useTubesCursor";
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


  useTubesCursor(canvasRef);


  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const isFormValid = isEmailValid && password.length >= 8;
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    const { error } = await loginUser(email, password);
    setIsSubmitting(false);

    if (error) {
      setPassword("");
      setShowPassword(false);
      setErrorStatus(true);

      if (error.message === "Invalid login credentials") {
        setErrorMessage("Неверная почта или пароль!");
      } else if (error.message === "Email not confirmed") {
        setErrorMessage("Подтвердите почту — мы отправили вам письмо");
      } else {
        setErrorMessage("Не удалось войти. Проверьте соединение и попробуйте ещё раз");
      }
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

      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="auth-title">Вход</h1>
        <p className={`auth-subtitle ${!errorStatus ? '' : 'errorAuth'}`}>{errorMessage}</p>

        {/* Поле Email */}
        <div className="auth-field-container">
          <div className={`auth-field ${emailTouched && !isEmailValid ? "error" : ""}`}>
            <input
              type="email"
              autoComplete="email"
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
              autoComplete="current-password"
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
          type="submit"
          className="auth-button"
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? "Входим..." : "Войти"}
        </button>

        <p className="auth-footer">
          Нет аккаунта? <Link to="/register">Зарегистрируйся!</Link>
        </p>
      </form>
    </div>
  );
}