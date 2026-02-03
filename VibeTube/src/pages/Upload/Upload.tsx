import { useEffect, useState, useRef } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";
import '../../styles/pageUpload.css';
import GenreSelector from "./ComponentsUpload/GenreSelector";
import { 
  ChevronRight, 
  ChevronLeft, 
  UploadCloud, 
  Image as ImageIcon, 
  FileVideo, 
  Check, 
  Loader2 
} from "lucide-react";

export default function Upload() {
  const navigate = useNavigate();

  // --- Состояния данных ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // --- Состояния UI ---
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Рефы для скрытых инпутов файлов
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // --- Загрузка жанров ---
  useEffect(() => {
    const fetchGenres = async () => {
      const { data } = await supabase.from("genres").select("*");
      setGenres(data || []);
    };
    fetchGenres();
  }, []);

  // --- Логика переключения шагов ---
  const handleNext = () => {
    // Валидация шага 1
    if (currentStep === 1) {
      if (!title.trim()) return alert("Введите название видео");
      if (!description.trim()) return alert("Введите описание");
      if (selectedGenres.length === 0) return alert("Выберите хотя бы один жанр");
    }
    
    // Валидация шага 2
    if (currentStep === 2) {
      if (!thumbnailFile) return alert("Загрузите превью");
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleUpload(); // Если это 3-й шаг - загружаем
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // ================= ЗАГРУЗКА С ПРОГРЕССОМ (Исправлено) =================
const uploadWithProgress = (file: File, path: string, bucket: string) => {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Ошибка: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Сетевая ошибка"));

    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

    xhr.open("POST", url);

    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    );

    // Возвращаем FormData, как было в твоем рабочем коде
    const formData = new FormData();
    formData.append("file", file);

    xhr.send(formData);
  });
};

// ================= ОСНОВНАЯ ЗАГРУЗКА =================
  const handleUpload = async () => {
    if (!videoFile || !thumbnailFile || !title) {
      alert("Заполни все поля");
      return;
    }

    setLoading(true);
    setProgress(10); // Начинаем прогресс

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Нет пользователя");

      const videoExt = videoFile.name.split(".").pop();
      const thumbExt = thumbnailFile.name.split(".").pop();
      const videoPath = `${user.id}/${Date.now()}.${videoExt}`;
      const thumbnailPath = `${user.id}/${Date.now()}_thumb.${thumbExt}`;

      // 1. Загрузка превью
      setProgress(20);
      const { error: thumbError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbnailPath, thumbnailFile);
      
      if (thumbError) throw thumbError;

      // 2. Загрузка видео 
      // (Имитируем движение прогресса, пока идет тяжелая загрузка)
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 500);

      const { error: videoError } = await supabase.storage
        .from("videos")
        .upload(videoPath, videoFile);

      clearInterval(progressInterval);
      if (videoError) throw videoError;

      setProgress(95);

      // 3. Получаем ссылки
      const { data: videoUrl } = supabase.storage.from("videos").getPublicUrl(videoPath);
      const { data: thumbUrl } = supabase.storage.from("thumbnails").getPublicUrl(thumbnailPath);

      // 4. Создаём запись в БД
      const { data: insertedVideo, error: insertError } = await supabase
        .from("videos")
        .insert({
          author_id: user.id,
          title,
          description,
          video_url: videoUrl.publicUrl,
          thumbnail_url: thumbUrl.publicUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 5. Сохраняем жанры
      if (selectedGenres.length > 0) {
        await supabase.from("video_genres").insert(
          selectedGenres.map((genreId) => ({
            video_id: insertedVideo.id,
            genre_id: genreId,
          }))
        );
      }

      setProgress(100);
      alert("Видео загружено успешно!");
      navigate("/");

    } catch (err: any) {
      console.error("FULL ERROR:", err);
      // Если ошибка 400, выводим детали
      alert(`Ошибка: ${err.message || "400 Bad Request"}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Рендер контента по шагам ---
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
                  <ImageIcon size={48} className="text-blue-500" />
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
        return (
          <div>
             <label className="pu-label">Загрузка видео файла</label>
             {loading ? (
                <div className="progress-container">
                  <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={40}/>
                  <p>Загрузка видео на сервер... {progress}%</p>
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
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
                 {videoFile ? (
                  <div className="file-preview">
                    <FileVideo size={48} className="text-blue-500" />
                    <span className="file-name">{videoFile.name}</span>
                    <p className="text-sm text-green-500 mt-2">Видео готово к загрузке</p>
                  </div>
                ) : (
                  <>
                    <FileVideo size={48} className="dropzone-icon" />
                    <p className="dropzone-text">
                      <strong>Нажмите для выбора видео</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">MP4, WebM</p>
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
    <div className="upload-container">
      <h2 className="upload-title">Новое видео</h2>

      {/* --- Stepper Header --- */}
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

      {/* --- Main Content --- */}
      <div className="step-content">
        {renderStepContent()}
      </div>

      {/* --- Footer Actions --- */}
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
    </div>
  );
}