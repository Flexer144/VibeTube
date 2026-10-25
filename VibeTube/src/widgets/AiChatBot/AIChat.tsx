// deno-lint-ignore-file
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../shared/lib/supabase.ts'; 
import { Bot, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

// Внутренние ссылки (/video/ID) открываем через роутер — без перезагрузки страницы,
// внешние — в новой вкладке
const markdownComponents: Components = {
  a: ({ href = '', children }) =>
    href.startsWith('/') ? (
      <Link to={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
};
import './AIChatStyle.css';

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>(() => {
    const saved = sessionStorage.getItem('vibetube_chat_history');
    return saved ? JSON.parse(saved) : [
      { role: 'bot', text: 'Привет! Я ИИ-ассистент VibeTube. Подсказать, что посмотреть?' }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Реф для контейнера с жидким металлом
  const liquidMetalRef = useRef<HTMLDivElement>(null);

  // Сохраняем историю
  useEffect(() => {
    sessionStorage.setItem('vibetube_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Инициализация шейдера для кнопки "Жидкий металл"
  useEffect(() => {
    let shaderInstance: { dispose: () => void } | undefined;
    // Если чат открыли до того, как модуль шейдеров загрузился, — не создаём лишний WebGL-контекст
    let isCancelled = false;

    const initShader = async () => {
      try {
        // Динамический импорт: шейдеры попадают в отдельный чанк и не тормозят первую загрузку
        const { liquidMetalFragmentShader, ShaderMount } = await import('@paper-design/shaders');

        if (liquidMetalRef.current && !isCancelled) {
          shaderInstance = new ShaderMount(
            liquidMetalRef.current,
            liquidMetalFragmentShader,
            {
              u_repetition: 1.5,
              u_softness: 0.5,
              u_shiftRed: 0.3,
              u_shiftBlue: 0.3,
              u_distortion: 0,
              u_contour: 0,
              u_angle: 100,
              u_scale: 1.5,
              u_shape: 1,
              u_offsetX: 0.1,
              u_offsetY: -0.1
            },
            undefined,
            0.6
          );
        }
      } catch (e) {
        console.error("Ошибка при загрузке шейдера кнопки:", e);
      }
    };

    if (!isOpen) {
        initShader();
    }

    return () => {
      isCancelled = true;
      // У ShaderMount метод называется dispose (destroy не существует) —
      // раньше WebGL-контекст не освобождался при каждом открытии чата
      shaderInstance?.dispose();
    };
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    // История для контекста: последние сообщения без приветствия бота
    const history = messages.slice(1).slice(-10).map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('vibetube-ai', {
        body: { prompt: userMessage, history }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
    } catch (error) {
      console.error('Ошибка ИИ:', error);
      // Функция возвращает понятный текст ошибки (лимит, авторизация) в теле ответа
      let text = 'Упс, связь с нейросетью прервалась. Попробуй еще раз!';
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        if (typeof body?.error === 'string') text = body.error;
      }
      setMessages(prev => [...prev, { role: 'bot', text }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat-wrapper">
      
      <div 
        className={`ai-chat-toggle-container ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <div id="liquid-metal" ref={liquidMetalRef}>
          <div className="outline">
            <Bot size={28} className="ai-bot-icon" />
          </div>
        </div>
      </div>

      <div className={`ai-chat-window ${isOpen ? 'open' : ''}`}>
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <Bot size={20} />
            <span>VibeTube AI</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="ai-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="ai-chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`ai-message ${msg.role}`}>
              {msg.role === 'bot' ? (
                <div className="markdown-content">
                  <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          ))}
          {isLoading && (
            <div className="ai-message bot loading">
              <Loader2 size={16} className="spinner" />
              <span>Думаю...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Спроси меня о видео..."
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}