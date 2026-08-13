// Telegram-бот салона «Айгерим» — учебный пример курса «AI / Vibe Coding».
// Токен берётся только из переменной окружения BOT_TOKEN, в коде его нет.

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
    'Подскажу услуги, цены и как нас найти. Выберите, что вас интересует:',
  'Услуги':
    'Маникюр, педикюр, гель-покрытие и снятие чужого покрытия.\n' +
    'Выезжаем на дом по центру города — запись за день.\n' +
    'Цены — кнопка «Цены».',
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

export default async function handler(req, res) {
  // Падаем громко и понятно, если секрет не задан: молчащий бот отлаживать труднее,
  // чем упавший. Эта же строка — учебный пример для занятия 6.
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN не задан в переменных окружения проекта');
  }

  try {
    const msg = req.body && req.body.message;
    if (msg && msg.chat) {
      const text = (msg.text || '').trim();
      const answer = ANSWERS[text] || 'Нажмите одну из кнопок меню 👇';

      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: msg.chat.id,
          text: answer,
          reply_markup: MENU,
        }),
      });
    }
  } catch (e) {
    // Telegram всё равно отвечаем 200, иначе он будет слать одно и то же сообщение снова
    console.error('bot error:', e);
  }
  res.status(200).json({ ok: true });
}
