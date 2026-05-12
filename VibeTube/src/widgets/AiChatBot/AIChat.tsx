// deno-lint-ignore-file
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../shared/lib/supabase.ts'; 
import { Bot, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
    let shaderInstance: any;

    const initShader = async () => {
      try {
        const { liquidMetalFragmentShader, ShaderMount } = await import('https://esm.sh/@paper-design/shaders');
        
        if (liquidMetalRef.current && !isOpen) {
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
      if (shaderInstance && typeof shaderInstance.destroy === 'function') {
        shaderInstance.destroy();
      }
    };
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('vibetube-ai', {
        body: { prompt: userMessage }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
    } catch (error) {
      console.error('Ошибка ИИ:', error);
      setMessages(prev => [...prev, { role: 'bot', text: 'Упс, связь с нейросетью прервалась. Попробуй еще раз!' }]);
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
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
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