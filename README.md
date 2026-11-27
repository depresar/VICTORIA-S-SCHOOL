# Victoria's School

Сайт онлайн-школы английского языка Виктории Сафроновой — перенос с Tilda на чистый HTML/CSS/JS с обновлённым дизайном.

## Структура

```
index.html          — главная (одностраничный лендинг)
policy.html         — политика конфиденциальности
assets/css/style.css
assets/js/main.js   — меню, поп-апы, прелоадер, лайтбокс документов
assets/img/         — оптимизированные изображения (WebP)
assets/fonts/       — шрифты (Masvol, Cormorant Garamond, Tilda Sans)
```

Блоки: Hero → О школе → Обучение → Самостоятельное обучение → Для преподавателей → Документы → FAQ → Контакты.

## Настройки (assets/js/main.js → CONFIG)

- `trialDelay` — через сколько секунд показать поп-ап «бесплатный урок»
- `formEndpoint` — адрес для приёма заявок из формы (Formspree, Make и т. п.). Пока пусто — форма открывает Telegram Виктории.

## Локальный просмотр

```bash
python3 -m http.server 8080
```

Затем открыть http://localhost:8080
