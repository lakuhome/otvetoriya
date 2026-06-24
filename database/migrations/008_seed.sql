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
    v_general_category_id bigint;
    v_technology_category_id bigint;
    v_science_category_id bigint;
    v_quiz_id bigint;
    v_question_1_id bigint;
    v_question_2_id bigint;
    v_question_3_id bigint;
    v_question_4_id bigint;
    v_question_5_id bigint;
BEGIN
    SELECT id INTO v_organizer_id
    FROM users
    WHERE lower(email) = 'organizer@example.com';

    IF v_organizer_id IS NULL THEN
        INSERT INTO users (email, password_hash, display_name, role)
        VALUES (
            'organizer@example.com',
            crypt('password123', gen_salt('bf', 12)),
            'Организатор',
            'organizer'
        )
        RETURNING id INTO v_organizer_id;
    END IF;

    SELECT id INTO v_participant_1_id
    FROM users
    WHERE lower(email) = 'participant1@example.com';

    IF v_participant_1_id IS NULL THEN
        INSERT INTO users (email, password_hash, display_name, role)
        VALUES (
            'participant1@example.com',
            crypt('password123', gen_salt('bf', 12)),
            'Участник 1',
            'participant'
        )
        RETURNING id INTO v_participant_1_id;
    END IF;

    SELECT id INTO v_participant_2_id
    FROM users
    WHERE lower(email) = 'participant2@example.com';

    IF v_participant_2_id IS NULL THEN
        INSERT INTO users (email, password_hash, display_name, role)
        VALUES (
            'participant2@example.com',
            crypt('password123', gen_salt('bf', 12)),
            'Участник 2',
            'participant'
        )
        RETURNING id INTO v_participant_2_id;
    END IF;

    SELECT id INTO v_general_category_id
    FROM categories
    WHERE name = 'Общие знания';

    SELECT id INTO v_technology_category_id
    FROM categories
    WHERE name = 'Технологии';

    SELECT id INTO v_science_category_id
    FROM categories
    WHERE name = 'Наука';

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
            'Стартовый квиз для ручного тестирования MVP.',
            'Выберите ответ в отведенное время и отправьте его один раз.',
            20,
            'ready'
        )
        RETURNING id INTO v_quiz_id;

        INSERT INTO quiz_categories (quiz_id, category_id)
        VALUES
            (v_quiz_id, v_general_category_id),
            (v_quiz_id, v_technology_category_id),
            (v_quiz_id, v_science_category_id);

        INSERT INTO questions (
            quiz_id,
            category_id,
            text,
            image_url,
            type,
            position,
            points
        )
        VALUES (
            v_quiz_id,
            v_general_category_id,
            'Сколько континентов на Земле?',
            NULL,
            'single',
            1,
            100
        )
        RETURNING id INTO v_question_1_id;

        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_1_id, '5', false, 1),
            (v_question_1_id, '6', false, 2),
            (v_question_1_id, '7', true, 3),
            (v_question_1_id, '8', false, 4);

        INSERT INTO questions (
            quiz_id,
            category_id,
            text,
            image_url,
            type,
            position,
            points
        )
        VALUES (
            v_quiz_id,
            v_science_category_id,
            'Какие из перечисленных планет относятся к газовым гигантам?',
            NULL,
            'multiple',
            2,
            100
        )
        RETURNING id INTO v_question_2_id;

        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_2_id, 'Марс', false, 1),
            (v_question_2_id, 'Юпитер', true, 2),
            (v_question_2_id, 'Сатурн', true, 3),
            (v_question_2_id, 'Меркурий', false, 4);

        INSERT INTO questions (
            quiz_id,
            category_id,
            text,
            image_url,
            type,
            position,
            points
        )
        VALUES (
            v_quiz_id,
            v_science_category_id,
            'Что изображено на картинке?',
            'https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Blue_Marble_%28remastered%29.jpg',
            'single',
            3,
            100
        )
        RETURNING id INTO v_question_3_id;

        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_3_id, 'Луна', false, 1),
            (v_question_3_id, 'Земля', true, 2),
            (v_question_3_id, 'Марс', false, 3),
            (v_question_3_id, 'Венера', false, 4);

        INSERT INTO questions (
            quiz_id,
            category_id,
            text,
            image_url,
            type,
            position,
            points
        )
        VALUES (
            v_quiz_id,
            v_technology_category_id,
            'Какая технология используется для обмена событиями в реальном времени в этом проекте?',
            NULL,
            'single',
            4,
            100
        )
        RETURNING id INTO v_question_4_id;

        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_4_id, 'REST Polling', false, 1),
            (v_question_4_id, 'Socket.IO', true, 2),
            (v_question_4_id, 'FTP', false, 3),
            (v_question_4_id, 'SMTP', false, 4);

        INSERT INTO questions (
            quiz_id,
            category_id,
            text,
            image_url,
            type,
            position,
            points
        )
        VALUES (
            v_quiz_id,
            v_general_category_id,
            'Столица Франции?',
            NULL,
            'single',
            5,
            100
        )
        RETURNING id INTO v_question_5_id;

        INSERT INTO answer_options (question_id, text, is_correct, position)
        VALUES
            (v_question_5_id, 'Берлин', false, 1),
            (v_question_5_id, 'Париж', true, 2),
            (v_question_5_id, 'Рим', false, 3),
            (v_question_5_id, 'Мадрид', false, 4);
    END IF;
END;
$$;
