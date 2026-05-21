import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, ToggleRight, ToggleLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import "../../pages/Watch/StyleWatch/VideoPlayerStyle.css";

interface Props {
  url: string;
  thumbnailUrl?: string;
}

const formatTime = (timeInSeconds: number): string => {
  if (!isFinite(timeInSeconds) || isNaN(timeInSeconds)) return "0:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export default function VideoPlayer({ url, thumbnailUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Главный контейнер

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.52);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [showSettings, setShowSettings] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showCenterIcon, setShowCenterIcon] = useState<"play" | "pause" | null>(null);
  const [centerIconKey, setCenterIconKey] = useState(0);
  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
  const [showSeekOverlay, setShowSeekOverlay] = useState<"forward" | "backward" | null>(null);
  const [seekSecondsCount, setSeekSecondsCount] = useState(0);

  const volumeTimeout = useRef<any>(null);
  const seekTimeout = useRef<any>(null);
  const centerTimeout = useRef<any>(null);
  const idleTimeout = useRef<any>(null);

  // --- ЕДИНАЯ ЛОГИКА ---

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.body.style.overflow = 'hidden'; // Блокируем скролл тела
      setIsFullscreen(true);
    } else {
      document.body.style.overflow = 'auto'; // Возвращаем скролл
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    clearTimeout(centerTimeout.current);
    if (videoRef.current.paused) {
      videoRef.current.play();
      setShowCenterIcon("play");
    } else {
      videoRef.current.pause();
      setShowCenterIcon("pause");
    }
    setCenterIconKey(prev => prev + 1);
    centerTimeout.current = setTimeout(() => setShowCenterIcon(null), 800);
  }, []);

  const handleVolumeChange = useCallback((val: number) => {
    if (!videoRef.current) return;
    const newVol = Math.max(0, Math.min(1, val));
    videoRef.current.volume = newVol;
    videoRef.current.muted = newVol === 0;
    
    setShowVolumeOverlay(true);
    clearTimeout(volumeTimeout.current);
    volumeTimeout.current = setTimeout(() => setShowVolumeOverlay(false), 1500);
  }, []);

  const seekBy = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
    
    const type = seconds > 0 ? "forward" : "backward";
    setShowSeekOverlay(type);
    setSeekSecondsCount(prev => prev + Math.abs(seconds));

    clearTimeout(seekTimeout.current);
    seekTimeout.current = setTimeout(() => {
      setShowSeekOverlay(null);
      setSeekSecondsCount(0);
    }, 1000);
  }, []);

  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(idleTimeout.current);
    if (isPlaying) {
      idleTimeout.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const currentDuration = video.duration;
      if (isFinite(currentDuration) && currentDuration > 0) {
        setDuration(currentDuration);
        setProgress((video.currentTime / currentDuration) * 100);
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", () => setIsPlaying(true));
    video.addEventListener("pause", () => setIsPlaying(false));
    video.addEventListener("volumechange", () => {
        setVolume(video.volume);
        setIsMuted(video.muted);
    });
    video.addEventListener("waiting", () => setIsBuffering(true));
    video.addEventListener("playing", () => setIsBuffering(false));
    video.addEventListener("canplay", () => setIsBuffering(false));

    const handleKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) return;
      resetIdleTimer();
      switch(e.key.toLowerCase()) {
        case " ": e.preventDefault(); togglePlay(); break;
        case "f": case "а": e.preventDefault(); toggleFullscreen(); break;
        case "arrowup": e.preventDefault(); handleVolumeChange(video.volume + 0.05); break;
        case "arrowdown": e.preventDefault(); handleVolumeChange(video.volume - 0.05); break;
        case "arrowright": e.preventDefault(); seekBy(5); break;
        case "arrowleft": e.preventDefault(); seekBy(-5); break;
        case "m": case "ь": setIsMuted(prev => !prev); video.muted = !video.muted; break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [togglePlay, toggleFullscreen, handleVolumeChange, seekBy, resetIdleTimer]);

  return (
    <div 
      className={`video-wrapper ${isFullscreen ? "fullscreen-mode" : ""} ${!controlsVisible ? "hide-controls" : ""}`} 
      ref={containerRef}
      onMouseMove={resetIdleTimer}
    >
      <video 
        autoPlay={autoplay} 
        ref={videoRef} 
        src={url}
        playsInline 
        poster={thumbnailUrl}
        preload="metadata"
        onClick={togglePlay} 
      />

      {isBuffering && (
        <div className="vibe-buffering-overlay">
          <Loader2 className="vibe-spinner" size={48} color="#ffffff" />
        </div>
      )}

      {showCenterIcon && !isBuffering && (
        <div key={centerIconKey} className="yt-overlay-center">
          {showCenterIcon === "play" ? <Play fill="white" size={32} /> : <Pause fill="white" size={32} />}
        </div>
      )}

      {/* Контролы и оверлеи тут оставляем как были, они теперь в контейнере */}
      <div className="yt-controls-wrapper">
         <input 
          type="range" 
          className="yt-scrubber" 
          min="0" 
          max="100" 
          step="0.1" 
          value={progress || 0} 
          onChange={(e) => {
            if (videoRef.current && isFinite(duration) && duration > 0) {
              videoRef.current.currentTime = (parseFloat(e.target.value) / 100) * duration;
            }
          }}
          style={{
            background: `linear-gradient(to right, #6365F1 ${progress || 0}%, rgba(255, 255, 255, 0.2) ${progress || 0}%)`
          }}
        />

        <div className="yt-controls-bottom">
          <div className="yt-controls-left">
            <button className="yt-control-pill" onClick={togglePlay}>
              {isPlaying ? <Pause size={20} fill="white"/> : <Play size={20} fill="white"/>}
            </button>

            <div className="yt-volume-block yt-control-pill">
              <button onClick={() => { videoRef.current!.muted = !isMuted; }}>
                {isMuted || volume === 0 ? <VolumeX size={20}/> : <Volume2 size={20}/>}
              </button>
              <input 
                type="range" className="yt-volume-slider" min="0" max="1" step="0.01" 
                value={isMuted ? 0 : volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #6365F1 ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) ${(isMuted ? 0 : volume) * 100}%)`
                }}
              />
            </div>

            <div className="yt-time-pill yt-control-pill">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="yt-controls-right">
            <button className="yt-control-pill" onClick={() => setAutoplay(!autoplay)}>
              {autoplay ? <ToggleRight color="#6365F1" /> : <ToggleLeft color="#888" />}
            </button>

            <div className="yt-settings-container">
              <button className="yt-control-pill" onClick={() => setShowSettings(!showSettings)}>
                <Settings size={20} className={showSettings ? "rotating" : ""} />
              </button>
              {showSettings && (
                <div className="yt-settings-menu">
                  <div className="settings-header">Скорость</div>
                  {[0.5, 1, 1.5, 2].map(s => (
                    <div 
                      key={s} 
                      className={`speed-item ${playbackSpeed === s ? "active" : ""}`} 
                      onClick={() => { videoRef.current!.playbackRate = s; setPlaybackSpeed(s); setShowSettings(false); }}
                    >
                      {s === 1 ? "Обычная" : `${s}x`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="yt-control-pill" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}