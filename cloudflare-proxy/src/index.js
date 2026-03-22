export default {
  async fetch(request, env, ctx) {
    // 1. Обработка CORS preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Разрешаем только POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 3. Целевой URL вашего сервера
    const TARGET_URL = 'http://stranagruzov.ru:5050';

    try {
      // 4. Копируем тело запроса
      const body = await request.arrayBuffer();

      // 5. Формируем новый запрос на ваш HTTP сервер
      const newRequest = new Request(TARGET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });

      // 6. Отправляем запрос
      const response = await fetch(newRequest);

      // 7. Возвращаем ответ сервера, добавляя CORS заголовки
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      
      return newResponse;

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Forwarding failed', 
        details: error.message 
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },
};
