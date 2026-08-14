// Telegram-бот салона «Айгерим» — учебный пример курса «AI / Vibe Coding».
// Кнопки отвечают заготовками, любой другой вопрос уходит в модель Gemini.
// Секреты берутся только из переменных окружения: BOT_TOKEN и GEMINI_KEY.

// [ПРОВЕРИТЬ ПЕРЕД ЗАНЯТИЕМ] Имена моделей меняются. Актуальные — в AI Studio.
const MODEL = 'gemini-2.5-flash';

const MENU = {
  keyboard: [
    [{ text: 'Услуги' }, { text: 'Цены' }],
    [{ text: 'Контакты' }],
  ],
  resize_keyboard: true,
};

const ANSWERS = {
  '/start':
    'Здравствуйте! Это бот салона «Айгерим» в Костанае.\n' +
    'Подскажу услуги, цены и как нас найти. Можно просто написать вопрос своими словами.',
  'Услуги':
    'Маникюр, педикюр, гель-покрытие и снятие чужого покрытия.\n' +
    'Выезжаем на дом по центру города — запись за день.',
  'Цены':
    'Маникюр без покрытия — 4 000 ₸ (40 минут)\n' +
    'Маникюр с гель-покрытием — 7 500 ₸ (1 ч 30 мин)\n' +
    'Педикюр — 9 000 ₸ (1 ч 30 мин)\n' +
    'Снятие чужого покрытия — 1 500 ₸ (20 минут)\n' +
    'Выезд на дом — +3 000 ₸ к услуге',
  'Контакты':
    'Костанай, центр.\n' +
    'Ежедневно с 10:00 до 20:00.\n' +
    'Телефон: +7 700 000-00-00\n' +
    'Оплата: наличные, Kaspi.',
};

// Должностная инструкция модели: кто она, правила и данные салона.
const SYSTEM_PROMPT = `Ты — ассистент салона красоты «Айгерим» в Костанае. Отвечай кратко, дружелюбно, на русском (если клиент пишет на казахском — отвечай на казахском).

Правила:
- отвечай ТОЛЬКО по данным ниже; если ответа в данных нет — скажи: «Уточню у администратора и вернусь к вам. Оставьте, пожалуйста, номер» — и ничего не придумывай;
- не называй цен и услуг, которых нет в прайсе, ни при каких условиях;
- скидки, переносы и отмены не подтверждай — это решает администратор;
- на вопросы не о салоне вежливо отвечай, что помогаешь только по услугам салона;
- не проси и не пересказывай личные данные других клиентов.

ДАННЫЕ САЛОНА
Прайс:
- Маникюр без покрытия — 4 000 ₸, 40 минут
- Маникюр с гель-покрытием — 7 500 ₸, 1 час 30 минут
- Педикюр — 9 000 ₸, 1 час 30 минут
- Снятие чужого покрытия — 1 500 ₸, 20 минут
- Выезд на дом — +3 000 ₸ к стоимости услуги, только район центра, запись за день

График: ежедневно с 10:00 до 20:00, без выходных.
Адрес: Костанай, центр. Телефон: +7 700 000-00-00.
Оплата: наличные и Kaspi. При выезде на дом предоплата 50%.

Частые вопросы:
- Запись: по телефону, в WhatsApp или через форму на сайте; в выходные лучше записываться за 2–3 дня.
- Опоздание: держим место 15 минут, дальше время может уйти следующему клиенту.
- Отмена: предупредить хотя бы за 2 часа.
- Свои материалы: можно прийти со своим покрытием, стоимость услуги не меняется.
- Дети: с детьми принимаем, но отдельной детской зоны нет.
- Подарочные сертификаты: есть, оформляются на любую сумму от 5 000 ₸.`;

async function callGemini(question) {
  // Ключ передаём заголовком: ключи нового формата (начинаются с «AQ.»)
  // в адресе запроса не принимаются.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Gemini error', res.status, body);
    return { status: res.status, text: null };
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return { status: 200, text: text.trim() };
}

async function askModel(question) {
  let r = await callGemini(question);

  // 503 — у модели пик нагрузки на стороне Google, это лечится повтором.
  // 429 — исчерпан наш бесплатный лимит, повтор не поможет.
  if (r.status === 503) {
    await new Promise((wait) => setTimeout(wait, 1500));
    r = await callGemini(question);
  }

  if (r.status === 429) return 'Сейчас много обращений, попробуйте через минуту 🙏';
  if (r.status === 503) return 'Модель сейчас перегружена. Напишите, пожалуйста, через минуту.';
  if (!r.text) return 'Не получилось ответить прямо сейчас. Напишите, пожалуйста, чуть позже.';
  return r.text;
}

export default async function handler(req, res) {
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN не задан в переменных окружения проекта');
  }

  try {
    const msg = req.body && req.body.message;
    if (msg && msg.chat) {
      const text = (msg.text || '').trim();

      let answer;
      if (ANSWERS[text]) {
        answer = ANSWERS[text];
      } else if (!process.env.GEMINI_KEY) {
        answer = 'Нажмите одну из кнопок меню 👇';
      } else {
        answer = await askModel(text);
      }

      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: msg.chat.id, text: answer, reply_markup: MENU }),
      });
    }
  } catch (e) {
    console.error('bot error:', e);
  }
  res.status(200).json({ ok: true });
}
