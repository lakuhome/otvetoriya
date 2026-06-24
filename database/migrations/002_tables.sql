BEGIN;

CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email varchar(255) NOT NULL,
    password_hash text NOT NULL,
    display_name varchar(100) NOT NULL,
    role varchar(20) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(100) NOT NULL
);

CREATE TABLE quizzes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id bigint NOT NULL,
    title varchar(200) NOT NULL,
    description text,
    rules text,
    time_per_question_seconds integer NOT NULL DEFAULT 20,
    status varchar(20) NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quiz_categories (
    quiz_id bigint NOT NULL,
    category_id bigint NOT NULL,
    PRIMARY KEY (quiz_id, category_id)
);

CREATE TABLE questions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id bigint NOT NULL,
    category_id bigint,
    text text,
    image_url text,
    type varchar(20) NOT NULL,
    position integer NOT NULL,
    points integer NOT NULL DEFAULT 100,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE answer_options (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id bigint NOT NULL,
    text varchar(500) NOT NULL,
    is_correct boolean NOT NULL DEFAULT false,
    position integer NOT NULL
);

CREATE TABLE game_sessions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id bigint NOT NULL,
    host_id bigint NOT NULL,
    room_code char(6) NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'lobby',
    current_question_id bigint,
    question_started_at timestamptz,
    question_ends_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);

CREATE TABLE game_participants (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id bigint NOT NULL,
    user_id bigint NOT NULL,
    nickname varchar(100) NOT NULL,
    score integer NOT NULL DEFAULT 0,
    total_response_time_ms bigint NOT NULL DEFAULT 0,
    joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id bigint NOT NULL,
    participant_id bigint NOT NULL,
    question_id bigint NOT NULL,
    is_correct boolean NOT NULL,
    awarded_points integer NOT NULL DEFAULT 0,
    response_time_ms integer NOT NULL,
    submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE submission_options (
    submission_id bigint NOT NULL,
    answer_option_id bigint NOT NULL,
    PRIMARY KEY (submission_id, answer_option_id)
);

COMMIT;

