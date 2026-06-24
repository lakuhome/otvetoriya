# Ответория

Веб-приложение для проведения квизов в реальном времени.

## Стек

- Frontend: Vue 3, Vite, Vue Router, Tailwind CSS
- Backend: Node.js, Express, Socket.IO
- Database: PostgreSQL
- Контейнеризация: Docker, Docker Compose, Nginx

## Структура проекта

```text
Project/
├── client/       # frontend
├── server/       # backend
├── database/     # SQL-миграции и seed-данные
└── compose.yaml  # запуск проекта через Docker
```

## Требования для локального запуска

- Node.js 18+
- PostgreSQL 14+
- Docker Desktop

## Переменные окружения

### Backend

Файл: `server/.env`

Пример:

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

Файл: `client/.env`

Пример:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## База данных

Имя базы по умолчанию: `quiz_room`

Миграции лежат в `database/migrations` и применяются по порядку:

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
011_add_other_category.sql
```

Дополнительные тестовые данные:

```text
database/seeds/extended_demo_seed.sql
```

## Локальный запуск без Docker

### 1. Подготовить базу

Создать базу `quiz_room`, затем применить SQL-файлы из `database/migrations` по порядку.

### 2. Запустить backend

```bash
cd server
npm install
npm run dev
```

Backend будет доступен на `http://localhost:3000`.

### 3. Запустить frontend

```bash
cd client
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:5173`.

## Запуск через Docker

Проект можно поднять полностью через Docker.

### Сборка и запуск

```bash
docker compose up --build
```

После запуска:

- сайт: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

### Что поднимается

- `db` — PostgreSQL
- `server` — Node.js / Express
- `client` — Nginx + собранный frontend

### Остановка

```bash
docker compose down
```

### Полный сброс

```bash
docker compose down -v
```


## Тестовые учетные записи

Основные учетные записи из seed-данных:

- `organizer@example.com` / `password123`
- `participant1@example.com` / `password123`
- `participant2@example.com` / `password123`


## Примечания

- ORM в проекте не используется
- SQL-запросы выполняются через пакет `pg`
- пароли хешируются на стороне PostgreSQL через `pgcrypto`
