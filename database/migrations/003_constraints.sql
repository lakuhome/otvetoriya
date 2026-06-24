BEGIN;

ALTER TABLE users
    ADD CONSTRAINT users_role_check
        CHECK (role IN ('organizer', 'participant')),
    ADD CONSTRAINT users_display_name_length_check
        CHECK (char_length(display_name) BETWEEN 2 AND 100);

ALTER TABLE categories
    ADD CONSTRAINT categories_name_unique UNIQUE (name);

ALTER TABLE quizzes
    ADD CONSTRAINT quizzes_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES users(id),
    ADD CONSTRAINT quizzes_time_per_question_seconds_check
        CHECK (time_per_question_seconds BETWEEN 5 AND 300),
    ADD CONSTRAINT quizzes_status_check
        CHECK (status IN ('draft', 'ready', 'archived'));

ALTER TABLE quiz_categories
    ADD CONSTRAINT quiz_categories_quiz_id_fkey
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    ADD CONSTRAINT quiz_categories_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES categories(id);

ALTER TABLE questions
    ADD CONSTRAINT questions_quiz_id_fkey
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    ADD CONSTRAINT questions_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES categories(id),
    ADD CONSTRAINT questions_type_check
        CHECK (type IN ('single', 'multiple')),
    ADD CONSTRAINT questions_points_check
        CHECK (points BETWEEN 1 AND 10000),
    ADD CONSTRAINT questions_position_check
        CHECK (position > 0),
    ADD CONSTRAINT questions_content_check
        CHECK (text IS NOT NULL OR image_url IS NOT NULL),
    ADD CONSTRAINT questions_quiz_id_position_unique
        UNIQUE (quiz_id, position);

ALTER TABLE answer_options
    ADD CONSTRAINT answer_options_question_id_fkey
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    ADD CONSTRAINT answer_options_position_check
        CHECK (position > 0),
    ADD CONSTRAINT answer_options_question_id_position_unique
        UNIQUE (question_id, position);

ALTER TABLE game_sessions
    ADD CONSTRAINT game_sessions_quiz_id_fkey
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    ADD CONSTRAINT game_sessions_host_id_fkey
        FOREIGN KEY (host_id) REFERENCES users(id),
    ADD CONSTRAINT game_sessions_current_question_id_fkey
        FOREIGN KEY (current_question_id) REFERENCES questions(id),
    ADD CONSTRAINT game_sessions_status_check
        CHECK (status IN ('lobby', 'question_open', 'question_closed', 'finished')),
    ADD CONSTRAINT game_sessions_room_code_format_check
        CHECK (room_code ~ '^[0-9]{6}$');

ALTER TABLE game_participants
    ADD CONSTRAINT game_participants_session_id_fkey
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    ADD CONSTRAINT game_participants_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id),
    ADD CONSTRAINT game_participants_session_id_user_id_unique
        UNIQUE (session_id, user_id);

ALTER TABLE submissions
    ADD CONSTRAINT submissions_session_id_fkey
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    ADD CONSTRAINT submissions_participant_id_fkey
        FOREIGN KEY (participant_id) REFERENCES game_participants(id) ON DELETE CASCADE,
    ADD CONSTRAINT submissions_question_id_fkey
        FOREIGN KEY (question_id) REFERENCES questions(id),
    ADD CONSTRAINT submissions_participant_id_question_id_unique
        UNIQUE (participant_id, question_id);

ALTER TABLE submission_options
    ADD CONSTRAINT submission_options_submission_id_fkey
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    ADD CONSTRAINT submission_options_answer_option_id_fkey
        FOREIGN KEY (answer_option_id) REFERENCES answer_options(id);

COMMIT;

