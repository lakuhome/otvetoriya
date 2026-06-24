# Ответория

Ответория - веб-приложение для создания и проведения квизов в реальном времени. Проект реализован по требованиям из `C:/Users/user/Desktop/Otvetoriya.docx` и состоит из трех частей: PostgreSQL, backend на Node.js/Express и frontend на Vue 3.

## Что умеет приложение

- регистрация и вход для организаторов и участников
- создание и редактирование квизов
- вопросы с одним или несколькими правильными ответами
- поддержка текстовых вопросов и вопросов с `image_url`
- запуск игровой комнаты по шестизначному коду
- подключение участников по коду
- проведение игры в реальном времени через Socket.IO
- подсчет очков и итоговая таблица лидеров
- история участия и история проведенных игр

## Стек

- Frontend: Vue 3, Vite, Vue Router, Tailwind CSS, `fetch`, `socket.io-client`
- Backend: Node.js, Express, Socket.IO, `pg`, `jsonwebtoken`, `cors`, `dotenv`
- Database: PostgreSQL, `pgcrypto`, SQL-функции, процедуры, представления, индексы, ограничения целостности

## Структура проекта

```text
Project/
├── client/
├── server/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── reset.sql
└── README.md
```

## Требования

- Node.js 18+ или новее
- PostgreSQL 14+ или новее
- DBeaver или `psql` для применения SQL-файлов

## Настройка базы данных

1. Создайте базу данных `quiz_room`.
2. Примените миграции по порядку:

```text
001_extensions.sql
002_tables.sql
003_constraints.sql
004_indexes.sql
005_auth_functions.sql
006_game_functions.sql
007_views.sql
008_seed.sql
009_fix_fn_join_game_session.sql
010_fix_fn_submit_answer_is_correct.sql
```

3. При необходимости загрузите расширенные тестовые данные:

```sql
\i database/seeds/extended_demo_seed.sql
```

Подробный порядок применения можно смотреть в `database/README.md`.

## Переменные окружения

### Backend

Создайте файл `server/.env` по примеру `server/.env.example`.

```env
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace_with_long_random_string
JWT_EXPIRES_IN=8h
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quiz_room
DB_USER=postgres
DB_PASSWORD=postgres
```

### Frontend

Создайте файл `client/.env` по примеру `client/.env.example`.

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Запуск backend

```bash
cd server
npm install
npm run dev
```

## Запуск frontend

```bash
cd client
npm install
npm run dev
```

Frontend по умолчанию поднимается на `http://localhost:5173`, backend - на `http://localhost:3000`.

## Тестовые аккаунты

Основные учетные записи из seed-данных:

- Организатор: `organizer@example.com` / `password123`
- Участник 1: `participant1@example.com` / `password123`
- Участник 2: `participant2@example.com` / `password123`

В расширенном сид-файле также добавлены дополнительные участники и несколько готовых квизов для демонстрации.

## Основные сценарии

### Организатор

1. Войти под организатором
2. Создать или открыть готовый квиз
3. Добавить вопросы
4. Запустить комнату
5. Открывать вопросы по очереди
6. Завершить игру и посмотреть результаты

### Участник

1. Войти под участником
2. Ввести код комнаты
3. Подключиться к игре
4. Отвечать на вопросы до окончания таймера
5. Смотреть итоговую таблицу и историю игр

## Полезные файлы

- SQL-схема и функции: `database/migrations`
- Расширенные тестовые данные: `database/seeds/extended_demo_seed.sql`
- Backend API и Socket.IO: `server/src`
- Frontend интерфейс: `client/src`

## Примечания

- Пароли хешируются на стороне PostgreSQL через `pgcrypto`
- ORM не используется, все запросы выполняются через пакет `pg`
- Критичное игровое состояние хранится в PostgreSQL, а Socket.IO только синхронизирует клиентов
