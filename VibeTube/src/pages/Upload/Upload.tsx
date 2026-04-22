import { useEffect, useState, useRef } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";
import '../../pages/Upload/Style/pageUpload.css';
import GenreSelector from "./ComponentsUpload/GenreSelector";
import Portal from "../../shared/ui/Portal"; 

import { 
  ChevronRight, 
  ChevronLeft, 
  UploadCloud, 
  Image as ImageIcon, 
  FileVideo, 
  Check, 
  Loader2,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mDisplay = m < 10 && h > 0 ? `0${m}` : m;
  const sDisplay = s < 10 ? `0${s}` : s;

  return h > 0 ? `${h}:${mDisplay}:${sDisplay}` : `${mDisplay}:${sDisplay}`;
};

// Типизация для улучшенных тостов
type ToastType = 'error' | 'success' | 'warning';
interface ToastInfo {
  id: number;
  message: string;
  type: ToastType;
  isLeaving?: boolean;
}

export default function Upload() {
  const navigate = useNavigate();

  // --- Состояния данных ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [videoDuration, setVideoDuration] = useState("");
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // --- Состояния UI ---
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false); // Новое состояние успеха

  // Состояние для уведомлений (toasts)
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Рефы для скрытых инпутов файлов
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Лимит размера видео (50 МБ)
  const MAX_VIDEO_SIZE_MB = 50;

  // --- Загрузка жанров ---
  useEffect(() => {
    const fetchGenres = async () => {
      const { data } = await supabase.from("genres").select("*");
      setGenres(data || []);
    };
    fetchGenres();
  }, []);

  const handleVideoChange = (file: File | null) => {
    if (!file) return;

    // ПРОВЕРКА ВЕСА ДО ЗАГРУЗКИ (50МБ)
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > MAX_VIDEO_SIZE_MB) {
      triggerToast(`Файл слишком большой (${fileSizeInMB.toFixed(1)} МБ). Лимит — ${MAX_VIDEO_SIZE_MB} МБ.`, 'error');
      // Сбрасываем инпут, чтобы можно было выбрать заново
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setVideoFile(file);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      setVideoDuration(formatDuration(video.duration));
    };
    video.src = URL.createObjectURL(file);
  };

  // --- Улучшенная функция для запуска уведомления ---
  const triggerToast = (message: string, type: ToastType = 'warning') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    // Запускаем анимацию ухода через 4 секунды
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isLeaving: true } : t));
    }, 4000);

    // Полностью удаляем из DOM через 4.5 секунды
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // --- Логика переключения шагов ---
  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim()) return triggerToast("Вы забыли ввести название видео", 'warning');
      if (!description.trim()) return triggerToast("Поле описания не заполнено", 'warning');
      if (selectedGenres.length === 0) return triggerToast("Выберите хотя бы один жанр", 'warning');
    }
    
    if (currentStep === 2) {
      if (!thumbnailFile) return triggerToast("Загрузите превью для вашего видео", 'warning');
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleUpload();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Функция для сброса формы и загрузки нового видео
  const handleResetUpload = () => {
    setTitle("");
    setDescription("");
    setSelectedGenres([]);
    setThumbnailFile(null);
    setVideoFile(null);
    setCurrentStep(1);
    setProgress(0);
    setUploadSuccess(false);
  };

// ================= ОСНОВНАЯ ЗАГРУЗКА =================
  const handleUpload = async () => {
    if (!videoFile || !thumbnailFile || !title) {
      return triggerToast("Заполни все поля", 'error');
    }

    setLoading(true);
    setProgress(10); 

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Нет пользователя");

      const videoExt = videoFile.name.split(".").pop();
      const thumbExt = thumbnailFile.name.split(".").pop();
      const videoPath = `${user.id}/${Date.now()}.${videoExt}`;
      const thumbnailPath = `${user.id}/${Date.now()}_thumb.${thumbExt}`;

      setProgress(20);
      const { error: thumbError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbnailPath, thumbnailFile);
      
      if (thumbError) throw thumbError;
      setProgress(52);
      
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 500);

      const { error: videoError } = await supabase.storage
        .from("videos")
        .upload(videoPath, videoFile);

      clearInterval(progressInterval);
      if (videoError) throw videoError;

      setProgress(95);

      const { data: videoUrl } = supabase.storage.from("videos").getPublicUrl(videoPath);
      const { data: thumbUrl } = supabase.storage.from("thumbnails").getPublicUrl(thumbnailPath);

      const { data: insertedVideo, error: insertError } = await supabase
      .from("videos")
      .insert({
        author_id: user.id,
        title,
        description,
        video_url: videoUrl.publicUrl,
        thumbnail_url: thumbUrl.publicUrl,
        duration: videoDuration,
      })
      .select()
      .single();

      if (insertError) throw insertError;

      if (selectedGenres.length > 0) {
        await supabase.from("video_genres").insert(
          selectedGenres.map((genreId) => ({
            video_id: insertedVideo.id,
            genre_id: genreId,
          }))
        );
      }

      setProgress(100);
      
      // Имитируем небольшую задержку перед показом экрана успеха, чтобы юзер увидел 100%
      setTimeout(() => {
        setUploadSuccess(true);
        triggerToast("Видео загружено успешно!", "success");
      }, 500);

    } catch (err: any) {
      console.error("FULL ERROR:", err);
      return triggerToast(`Ошибка: ${err.message || "400 Bad Request"}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div>
              <label className="pu-label">Название видео</label>
              <input
                type="text"
                className="pu-input"
                placeholder="Например: Мой первый влог"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="pu-label">Описание</label>
              <textarea
                className="pu-textarea"
                placeholder="О чем это видео..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="pu-label">Жанры</label>
              <GenreSelector
                genres={genres}
                selectedGenres={selectedGenres}
                onChange={setSelectedGenres}
              />
            </div>
          </>
        );
      case 2:
        return (
          <div>
            <label className="pu-label">Загрузка обложки (Thumbnail)</label>
            <div 
              className="dropzone"
              onClick={() => thumbInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*"
                hidden
                ref={thumbInputRef}
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              />
              {thumbnailFile ? (
                <div className="file-preview">
                  <ImageIcon size={48} className="text-indigo-500" />
                  <span className="file-name">{thumbnailFile.name}</span>
                  <p className="text-sm text-green-500 mt-2">Файл выбран</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={48} className="dropzone-icon" />
                  <p className="dropzone-text">
                    <strong>Нажмите для загрузки</strong> или перетащите изображение
                  </p>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG до 5MB</p>
                </>
              )}
            </div>
          </div>
        );
      case 3:
        // Экран успеха
        if (uploadSuccess) {
          return (
            <div className="success-container fade-in">
              <div className="success-icon-wrapper">
                <Check size={60} className="success-icon" strokeWidth={3} />
              </div>
              <h3 className="success-title">Видео опубликовано!</h3>
              <p className="success-text">Ваш ролик успешно загружен на платформу и готов к просмотру.</p>
              
              <div className="success-actions">
                <button className="btn btn-secondary" onClick={() => navigate("/")}>
                  На главную
                </button>
                <button className="btn btn-primary" onClick={handleResetUpload}>
                  Загрузить еще
                </button>
              </div>
            </div>
          );
        }

        return (
          <div>
             <label className="pu-label">Загрузка видео файла</label>
             {loading ? (
                <div className="progress-container">
                  <Loader2 className="vibe-spinner" size={48} color="#ffffff" />
                  <p className="progress-text">Загрузка видео на сервер... <span>{progress}%</span></p>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
             ) : (
              <div 
                className="dropzone"
                onClick={() => videoInputRef.current?.click()}
              >
              <input
                type="file"
                accept="video/*"
                hidden
                ref={videoInputRef}
                onChange={(e) => handleVideoChange(e.target.files?.[0] || null)}
              />
                 {videoFile ? (
                  <div className="file-preview">
                    <FileVideo size={48} className="text-indigo-500" />
                    <span className="file-name">{videoFile.name}</span>
                    <p className="text-sm text-green-500 mt-2">Видео готово к загрузке</p>
                  </div>
                ) : (
                  <>
                    <FileVideo size={48} className="dropzone-icon" />
                    <p className="dropzone-text">
                      <strong>Нажмите для выбора видео</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">MP4, WebM до 50MB</p>
                  </>
                )}
              </div>
             )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="upload-page-wrapper">
      <div className="glow-blob blob-1"></div>
      <div className="glow-blob blob-2"></div>
      <div className="glow-blob blob-3"></div>

      <div className="upload-card">
        <h2 className="upload-title">{uploadSuccess ? "Готово" : "Новое видео"}</h2>

        {!uploadSuccess && (
          <div className="stepper-wrapper">
            {[1, 2, 3].map((step) => (
              <div 
                key={step} 
                className={`step-item ${currentStep === step ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
              >
                <div className="step-circle">
                  {step < currentStep ? <Check size={18} /> : step}
                </div>
                <span className="step-label">
                  {step === 1 ? 'Детали' : step === 2 ? 'Обложка' : 'Видео'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="step-content">
          {renderStepContent()}
        </div>

        {!uploadSuccess && (
          <div className="step-actions">
            <button 
              className="btn btn-secondary"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ChevronLeft size={16} /> Назад
            </button>

            <button 
              className="btn btn-primary"
              onClick={handleNext}
              disabled={loading || (currentStep === 3 && !videoFile)}
            >
              {loading ? 'Загружаем...' : currentStep === 3 ? 'Опубликовать' : 'Далее'}
              {!loading && currentStep !== 3 && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>

      <Portal>
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.type} ${toast.isLeaving ? 'leaving' : ''}`}>
              {toast.type === 'success' ? (
                <CheckCircle2 className="toast-icon" size={20} />
              ) : (
                <AlertTriangle className="toast-icon" size={20} />
              )}
              <div className="toast-content">
                <h4 className="toast-title">
                  {toast.type === 'error' ? 'Ошибка' : toast.type === 'success' ? 'Успешно' : 'Внимание'}
                </h4>
                <p className="toast-message">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>
      </Portal>
    </div>
  );
}