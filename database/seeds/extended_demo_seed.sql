BEGIN;

INSERT INTO categories (name)
VALUES
    ('Общие знания'),
    ('История'),
    ('Наука'),
    ('Технологии'),
    ('Кино'),
    ('Музыка'),
    ('Спорт'),
    (U&'\0414\0440\0443\0433\043E\0435')
ON CONFLICT (name) DO NOTHING;

COMMIT;

DO $$
DECLARE
    v_organizer_id bigint;
    v_participant_1_id bigint;
    v_participant_2_id bigint;
    v_participant_3_id bigint;
    v_participant_4_id bigint;
    v_participant_5_id bigint;
    v_general_category_id bigint;
    v_history_category_id bigint;
    v_science_category_id bigint;
    v_technology_category_id bigint;
    v_cinema_category_id bigint;
    v_music_category_id bigint;
    v_quiz_id bigint;
    v_question_id bigint;
BEGIN
    INSERT INTO users (email, password_hash, display_name, role)
    VALUES
        ('organizer@example.com', crypt('password123', gen_salt('bf', 12)), 'Организатор', 'organizer'),
        ('participant1@example.com', crypt('password123', gen_salt('bf', 12)), 'Участник 1', 'participant'),
        ('participant2@example.com', crypt('password123', gen_salt('bf', 12)), 'Участник 2', 'participant'),
        ('participant3@example.com', crypt('password123', gen_salt('bf', 12)), 'Участник 3', 'participant'),
        ('participant4@example.com', crypt('password123', gen_salt('bf', 12)), 'Участник 4', 'participant'),
        ('participant5@example.com', crypt('password123', gen_salt('bf', 12)), 'Участник 5', 'participant')
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_organizer_id FROM users WHERE lower(email) = 'organizer@example.com';
    SELECT id INTO v_participant_1_id FROM users WHERE lower(email) = 'participant1@example.com';
    SELECT id INTO v_participant_2_id FROM users WHERE lower(email) = 'participant2@example.com';
    SELECT id INTO v_participant_3_id FROM users WHERE lower(email) = 'participant3@example.com';
    SELECT id INTO v_participant_4_id FROM users WHERE lower(email) = 'participant4@example.com';
    SELECT id INTO v_participant_5_id FROM users WHERE lower(email) = 'participant5@example.com';

    SELECT id INTO v_general_category_id FROM categories WHERE name = 'Общие знания';
    SELECT id INTO v_history_category_id FROM categories WHERE name = 'История';
    SELECT id INTO v_science_category_id FROM categories WHERE name = 'Наука';
    SELECT id INTO v_technology_category_id FROM categories WHERE name = 'Технологии';
    SELECT id INTO v_cinema_category_id FROM categories WHERE name = 'Кино';
    SELECT id INTO v_music_category_id FROM categories WHERE name = 'Музыка';

    SELECT id INTO v_quiz_id
    FROM quizzes
    WHERE owner_id = v_organizer_id
      AND title = 'Демо-квиз Ответория';

    IF v_quiz_id IS NULL THEN
        INSERT INTO quizzes (
            owner_id,
            title,
            description,
            rules,
            time_per_question_seconds,
            status
        )
        VALUES (
            v_organizer_id,
            'Демо-квиз Ответория',
            'Базовый квиз для smoke-тестов авторизации, комнаты и ответов.',
            'Отвечай один раз в отведенное время.',
            20,
            'ready'
        )
        RETURNING id INTO v_quiz_id;

        INSERT INTO quiz_categories (quiz_id, category_id)
        VALUES
            (v_quiz_id, v_general_category_id),
            (v_quiz_id, v_science_category_id),
            (v_quiz_id, v_technology_category_id)
        ON CONFLICT DO NOTHING;

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_general_category_id, 'Сколько континентов на Земле?', NULL, 'single', 1, 100)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, '5', false, 1),
            (v_question_id, '6', false, 2),
            (v_question_id, '7', true, 3),
            (v_question_id, '8', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_science_category_id, 'Какие планеты относятся к газовым гигантам?', NULL, 'multiple', 2, 120)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Марс', false, 1),
            (v_question_id, 'Юпитер', true, 2),
            (v_question_id, 'Сатурн', true, 3),
            (v_question_id, 'Меркурий', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_science_category_id, 'Что изображено на картинке?', 'https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Blue_Marble_%28remastered%29.jpg', 'single', 3, 100)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Луна', false, 1),
            (v_question_id, 'Земля', true, 2),
            (v_question_id, 'Марс', false, 3),
            (v_question_id, 'Венера', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_technology_category_id, 'Какая технология используется для realtime в этом проекте?', NULL, 'single', 4, 150)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'REST Polling', false, 1),
            (v_question_id, 'Socket.IO', true, 2),
            (v_question_id, 'FTP', false, 3),
            (v_question_id, 'SMTP', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_general_category_id, 'Столица Франции?', NULL, 'single', 5, 100)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Берлин', false, 1),
            (v_question_id, 'Париж', true, 2),
            (v_question_id, 'Рим', false, 3),
            (v_question_id, 'Мадрид', false, 4);
    END IF;

    SELECT id INTO v_quiz_id
    FROM quizzes
    WHERE owner_id = v_organizer_id
      AND title = 'Исторический блиц';

    IF v_quiz_id IS NULL THEN
        INSERT INTO quizzes (
            owner_id,
            title,
            description,
            rules,
            time_per_question_seconds,
            status
        )
        VALUES (
            v_organizer_id,
            'Исторический блиц',
            'Короткий набор вопросов по истории.',
            'Один ответ на вопрос, быстрое прохождение.',
            15,
            'ready'
        )
        RETURNING id INTO v_quiz_id;

        INSERT INTO quiz_categories (quiz_id, category_id)
        VALUES
            (v_quiz_id, v_history_category_id),
            (v_quiz_id, v_general_category_id)
        ON CONFLICT DO NOTHING;

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_history_category_id, 'В каком году началась Вторая мировая война?', NULL, 'single', 1, 100)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, '1937', false, 1),
            (v_question_id, '1939', true, 2),
            (v_question_id, '1941', false, 3),
            (v_question_id, '1945', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_history_category_id, 'Какие из этих цивилизаций существовали в Месоамерике?', NULL, 'multiple', 2, 130)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Майя', true, 1),
            (v_question_id, 'Ацтеки', true, 2),
            (v_question_id, 'Викинги', false, 3),
            (v_question_id, 'Ольмеки', true, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_history_category_id, 'Кто был первым императором Рима?', NULL, 'single', 3, 110)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Цезарь', false, 1),
            (v_question_id, 'Август', true, 2),
            (v_question_id, 'Нерон', false, 3),
            (v_question_id, 'Траян', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_history_category_id, 'Какое событие символически считается падением Византии?', NULL, 'single', 4, 120)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Битва при Акциуме', false, 1),
            (v_question_id, 'Падение Константинополя в 1453 году', true, 2),
            (v_question_id, 'Карловицкий мир', false, 3),
            (v_question_id, 'Взятие Рима готами', false, 4);
    END IF;

    SELECT id INTO v_quiz_id
    FROM quizzes
    WHERE owner_id = v_organizer_id
      AND title = 'Технологический разгон';

    IF v_quiz_id IS NULL THEN
        INSERT INTO quizzes (
            owner_id,
            title,
            description,
            rules,
            time_per_question_seconds,
            status
        )
        VALUES (
            v_organizer_id,
            'Технологический разгон',
            'Вопросы про web, JavaScript и компьютерные основы.',
            'Отвечай внимательно: есть и single, и multiple.',
            25,
            'ready'
        )
        RETURNING id INTO v_quiz_id;

        INSERT INTO quiz_categories (quiz_id, category_id)
        VALUES
            (v_quiz_id, v_technology_category_id),
            (v_quiz_id, v_science_category_id)
        ON CONFLICT DO NOTHING;

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_technology_category_id, 'Что из этого является JavaScript runtime для сервера?', NULL, 'single', 1, 100)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Node.js', true, 1),
            (v_question_id, 'PostgreSQL', false, 2),
            (v_question_id, 'Tailwind CSS', false, 3),
            (v_question_id, 'VitePress', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_technology_category_id, 'Какие протоколы обычно работают поверх TCP?', NULL, 'multiple', 2, 130)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'HTTP', true, 1),
            (v_question_id, 'HTTPS', true, 2),
            (v_question_id, 'UDP', false, 3),
            (v_question_id, 'WebSocket', true, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_technology_category_id, 'Какой пакет в нашем backend отвечает за подключение к PostgreSQL?', NULL, 'single', 3, 90)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'pg', true, 1),
            (v_question_id, 'prisma', false, 2),
            (v_question_id, 'sequelize', false, 3),
            (v_question_id, 'typeorm', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_technology_category_id, 'Для чего используется JWT в этом проекте?', NULL, 'single', 4, 110)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Для хранения изображений', false, 1),
            (v_question_id, 'Для авторизации и передачи userId/role', true, 2),
            (v_question_id, 'Для миграций базы', false, 3),
            (v_question_id, 'Для стилизации интерфейса', false, 4);
    END IF;

    SELECT id INTO v_quiz_id
    FROM quizzes
    WHERE owner_id = v_organizer_id
      AND title = 'Кино и музыка';

    IF v_quiz_id IS NULL THEN
        INSERT INTO quizzes (
            owner_id,
            title,
            description,
            rules,
            time_per_question_seconds,
            status
        )
        VALUES (
            v_organizer_id,
            'Кино и музыка',
            'Легкий развлекательный набор для ручных демонстраций.',
            'Часть вопросов на один выбор, часть на множественный.',
            18,
            'ready'
        )
        RETURNING id INTO v_quiz_id;

        INSERT INTO quiz_categories (quiz_id, category_id)
        VALUES
            (v_quiz_id, v_cinema_category_id),
            (v_quiz_id, v_music_category_id)
        ON CONFLICT DO NOTHING;

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_cinema_category_id, 'Кто снял фильм "Интерстеллар"?', NULL, 'single', 1, 100)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Кристофер Нолан', true, 1),
            (v_question_id, 'Дени Вильнёв', false, 2),
            (v_question_id, 'Стивен Спилберг', false, 3),
            (v_question_id, 'Ридли Скотт', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_music_category_id, 'Какие из этих инструментов относятся к струнным?', NULL, 'multiple', 2, 120)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Скрипка', true, 1),
            (v_question_id, 'Виолончель', true, 2),
            (v_question_id, 'Флейта', false, 3),
            (v_question_id, 'Арфа', true, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_cinema_category_id, 'Как называется премия американской киноакадемии?', NULL, 'single', 3, 90)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Золотой глобус', false, 1),
            (v_question_id, 'Оскар', true, 2),
            (v_question_id, 'Сезар', false, 3),
            (v_question_id, 'BAFTA', false, 4);

        INSERT INTO questions (quiz_id, category_id, text, image_url, type, position, points)
        VALUES (v_quiz_id, v_music_category_id, 'Какой жанр чаще всего связан с импровизацией?', NULL, 'single', 4, 100)
        RETURNING id INTO v_question_id;
        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_id, 'Джаз', true, 1),
            (v_question_id, 'Марш', false, 2),
            (v_question_id, 'Гимн', false, 3),
            (v_question_id, 'Колыбельная', false, 4);
    END IF;
END;
$$;
