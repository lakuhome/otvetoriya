BEGIN;

CREATE UNIQUE INDEX users_email_lower_unique
    ON users (lower(email));

CREATE INDEX quizzes_owner_id_index
    ON quizzes (owner_id);

CREATE INDEX questions_quiz_id_index
    ON questions (quiz_id);

CREATE INDEX answer_options_question_id_index
    ON answer_options (question_id);

CREATE UNIQUE INDEX game_sessions_room_code_unique
    ON game_sessions (room_code);

CREATE INDEX game_sessions_quiz_id_index
    ON game_sessions (quiz_id);

CREATE INDEX game_sessions_host_id_index
    ON game_sessions (host_id);

CREATE INDEX game_participants_session_id_index
    ON game_participants (session_id);

CREATE INDEX submissions_session_id_index
    ON submissions (session_id);

CREATE INDEX submissions_participant_id_index
    ON submissions (participant_id);

CREATE INDEX submissions_question_id_index
    ON submissions (question_id);

COMMIT;

