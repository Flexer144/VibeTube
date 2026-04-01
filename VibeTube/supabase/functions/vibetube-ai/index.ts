import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: videos, error: dbError } = await supabaseClient
      .from('videos')
      .select(`
        id,
        title,
        description,
        video_genres (
          genres (
            name
          )
        )
      `)

    if (dbError) throw dbError;

    const videoContext = videos?.map(v => {
      const genreNames = v.video_genres
        ?.map((vg: any) => vg.genres?.name)
        .filter(Boolean)
        .join(', ') || 'Не указан';

      return `- ID: ${v.id} | Название: "${v.title}" | Жанры: ${genreNames} | Описание: ${v.description}`;
    }).join('\n') || "Видео пока нет."

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    const API_URL = `https://openrouter.ai/api/v1/chat/completions`
    
    const systemInstruction = `Системная инструкция: Ты крутой и дружелюбный ИИ-ассистент видеоплатформы VibeTube. Твоя цель — помогать пользователям находить классный контент. Отвечай лаконично, структурированно и по делу.

    ПРАВИЛА ПОВЕДЕНИЯ И ОФОРМЛЕНИЯ:
    1. Всегда используй маркированные списки (-) для перечисления видео.
    2. Выделяй **жирным** шрифтом названия жанров и важные детали (например, имена авторов или суть видео).
    3. Названия видео ОБЯЗАТЕЛЬНО делай кликабельными ссылками в формате Markdown. Используй относительный путь: [Название видео](/video/ID).
    4. Все ссылки на видео должны быть строго в формате /video/UUID. Никогда не подставляй домены вроде vibetube.com или localhost.
    5. НИКОГДА не выводи описание видео полностью. Максимум 1-2 коротких предложения. Сразу после этого ОБЯЗАТЕЛЬНО ставь кликабельную ссылку в формате Markdown: [...ещё](/video/ID). Пример правильного вывода: "Крутое видео про путешествия в горы [...ещё](/video/123-abc)". Не пиши ссылку обычным текстом!
    6. ПРАВИЛО ПРИВЕТСТВИЙ: НЕ здоровайся в каждом сообщении. Здоровайся только в том случае, если пользователь сам написал "Привет", "Здравствуйте" и т.д. В остальных случаях сразу выдавай ответ на вопрос.
    7. Используй 1-2 подходящих эмодзи в сообщении, чтобы задать приятный вайб, но не перегружай ими текст.
    8. Советуй ТОЛЬКО те видео, которые есть в списке ниже. Если пользователь просит то, чего нет на платформе, вежливо скажи, что такого контента пока нет, и предложи что-то из доступных жанров.

    Вот актуальный список видео и их жанров на VibeTube:
    ${videoContext}

    Вопрос пользователя: ${prompt}`

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [
          {
            role: "user",
            content: systemInstruction
          }
        ]
      })
    })

    const result = await response.json()

    if (result.error) {
      return new Response(
        JSON.stringify({ text: `Ошибка API: ${result.error.message}` }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiMessage = result.choices?.[0]?.message?.content || "Пустой ответ.";

    return new Response(
      JSON.stringify({ text: aiMessage }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ text: "Ошибка: " + error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})