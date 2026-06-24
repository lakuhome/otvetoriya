BEGIN;

CREATE OR REPLACE FUNCTION fn_create_game_session(
    p_quiz_id bigint,
    p_host_id bigint
)
RETURNS TABLE (
    session_id bigint,
    room_code char(6)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_quiz quizzes%ROWTYPE;
    v_room_code char(6);
    v_session_id bigint;
BEGIN
    SELECT *
    INTO v_quiz
    FROM quizzes
    WHERE id = p_quiz_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quiz not found';
    END IF;

    IF v_quiz.owner_id <> p_host_id THEN
        RAISE EXCEPTION 'Only quiz owner can create a game session';
    END IF;

    IF v_quiz.status <> 'ready' THEN
        RAISE EXCEPTION 'Quiz must be in ready status';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM questions
        WHERE quiz_id = p_quiz_id
    ) THEN
        RAISE EXCEPTION 'Quiz must contain at least one question';
    END IF;

    LOOP
        v_room_code := lpad((floor(random() * 1000000))::text, 6, '0')::char(6);

        BEGIN
            INSERT INTO game_sessions (
                quiz_id,
                host_id,
                room_code,
                status
            )
            VALUES (
                p_quiz_id,
                p_host_id,
                v_room_code,
                'lobby'
            )
            RETURNING id INTO v_session_id;

            EXIT;
        EXCEPTION
            WHEN unique_violation THEN
                NULL;
        END;
    END LOOP;

    RETURN QUERY
    SELECT v_session_id, v_room_code;
END;
$$;

CREATE OR REPLACE FUNCTION fn_join_game_session(
    p_room_code char(6),
    p_user_id bigint
)
RETURNS TABLE (
    session_id bigint,
    participant_id bigint,
    session_status varchar
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_session game_sessions%ROWTYPE;
    v_user users%ROWTYPE;
    v_participant_id bigint;
BEGIN
    SELECT *
    INTO v_session
    FROM game_sessions
    WHERE room_code = trim(p_room_code)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;

    IF v_session.status = 'finished' THEN
        RAISE EXCEPTION 'Game session is already finished';
    END IF;

    SELECT *
    INTO v_user
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_user.role <> 'participant' THEN
        RAISE EXCEPTION 'Only participants can join a game session';
    END IF;

    SELECT id
    INTO v_participant_id
    FROM game_participants AS gp
    WHERE gp.session_id = v_session.id
      AND gp.user_id = p_user_id;

    IF v_participant_id IS NULL THEN
        INSERT INTO game_participants (
            session_id,
            user_id,
            nickname
        )
        VALUES (
            v_session.id,
            p_user_id,
            v_user.display_name
        )
        RETURNING id INTO v_participant_id;
    END IF;

    RETURN QUERY
    SELECT
        v_session.id,
        v_participant_id,
        v_session.status::varchar;
END;
$$;

CREATE OR REPLACE FUNCTION fn_open_question(
    p_session_id bigint,
    p_host_id bigint,
    p_question_id bigint
)
RETURNS TABLE (
    question_started_at timestamptz,
    question_ends_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_session game_sessions%ROWTYPE;
    v_question questions%ROWTYPE;
    v_quiz quizzes%ROWTYPE;
    v_started_at timestamptz;
    v_ends_at timestamptz;
BEGIN
    SELECT *
    INTO v_session
    FROM game_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;

    IF v_session.host_id <> p_host_id THEN
        RAISE EXCEPTION 'Only host can open a question';
    END IF;

    IF v_session.status NOT IN ('lobby', 'question_closed') THEN
        RAISE EXCEPTION 'Question can only be opened from lobby or question_closed status';
    END IF;

    SELECT *
    INTO v_question
    FROM questions
    WHERE id = p_question_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    SELECT *
    INTO v_quiz
    FROM quizzes
    WHERE id = v_session.quiz_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quiz not found';
    END IF;

    IF v_question.quiz_id <> v_session.quiz_id THEN
        RAISE EXCEPTION 'Question does not belong to session quiz';
    END IF;

    v_started_at := now();
    v_ends_at := v_started_at + make_interval(secs => v_quiz.time_per_question_seconds);

    UPDATE game_sessions
    SET current_question_id = p_question_id,
        question_started_at = v_started_at,
        question_ends_at = v_ends_at,
        status = 'question_open'
    WHERE id = p_session_id;

    RETURN QUERY
    SELECT v_started_at, v_ends_at;
END;
$$;

CREATE OR REPLACE FUNCTION fn_submit_answer(
    p_session_id bigint,
    p_user_id bigint,
    p_question_id bigint,
    p_option_ids bigint[]
)
RETURNS TABLE (
    is_correct boolean,
    awarded_points integer,
    response_time_ms integer,
    new_score integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_session game_sessions%ROWTYPE;
    v_participant game_participants%ROWTYPE;
    v_question questions%ROWTYPE;
    v_response_time_ms integer;
    v_awarded_points integer;
    v_is_correct boolean;
    v_new_score integer;
    v_submission_id bigint;
    v_selected_option_ids bigint[];
    v_correct_option_ids bigint[];
    v_invalid_option_count integer;
BEGIN
    SELECT *
    INTO v_session
    FROM game_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;

    IF v_session.status <> 'question_open' THEN
        RAISE EXCEPTION 'Answers are accepted only when question is open';
    END IF;

    IF v_session.current_question_id <> p_question_id THEN
        RAISE EXCEPTION 'Question does not match current session question';
    END IF;

    IF v_session.question_ends_at IS NULL OR now() > v_session.question_ends_at THEN
        RAISE EXCEPTION 'Answer deadline has passed';
    END IF;

    SELECT *
    INTO v_participant
    FROM game_participants
    WHERE session_id = p_session_id
      AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Participant is not part of this session';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM submissions
        WHERE participant_id = v_participant.id
          AND question_id = p_question_id
    ) THEN
        RAISE EXCEPTION 'Participant already answered this question';
    END IF;

    SELECT *
    INTO v_question
    FROM questions
    WHERE id = p_question_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    SELECT COALESCE(array_agg(option_id ORDER BY option_id), ARRAY[]::bigint[])
    INTO v_selected_option_ids
    FROM (
        SELECT DISTINCT option_id
        FROM unnest(COALESCE(p_option_ids, ARRAY[]::bigint[])) AS option_id
    ) AS selected_options;

    IF array_length(v_selected_option_ids, 1) IS DISTINCT FROM array_length(COALESCE(p_option_ids, ARRAY[]::bigint[]), 1) THEN
        RAISE EXCEPTION 'Duplicate answer options are not allowed';
    END IF;

    SELECT count(*)
    INTO v_invalid_option_count
    FROM unnest(v_selected_option_ids) AS selected_option_id
    LEFT JOIN answer_options AS ao
        ON ao.id = selected_option_id
       AND ao.question_id = p_question_id
    WHERE ao.id IS NULL;

    IF v_invalid_option_count > 0 THEN
        RAISE EXCEPTION 'Some answer options do not belong to the current question';
    END IF;

    SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::bigint[])
    INTO v_correct_option_ids
    FROM answer_options AS ao
    WHERE ao.question_id = p_question_id
      AND ao.is_correct = true;

    v_is_correct := v_selected_option_ids = v_correct_option_ids;
    v_response_time_ms := GREATEST(
        0,
        floor(extract(epoch FROM (now() - v_session.question_started_at)) * 1000)::integer
    );
    v_awarded_points := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;

    INSERT INTO submissions (
        session_id,
        participant_id,
        question_id,
        is_correct,
        awarded_points,
        response_time_ms
    )
    VALUES (
        p_session_id,
        v_participant.id,
        p_question_id,
        v_is_correct,
        v_awarded_points,
        v_response_time_ms
    )
    RETURNING id INTO v_submission_id;

    INSERT INTO submission_options (
        submission_id,
        answer_option_id
    )
    SELECT
        v_submission_id,
        option_id
    FROM unnest(v_selected_option_ids) AS option_id;

    UPDATE game_participants
    SET score = score + v_awarded_points,
        total_response_time_ms = total_response_time_ms + v_response_time_ms
    WHERE id = v_participant.id
    RETURNING score INTO v_new_score;

    RETURN QUERY
    SELECT
        v_is_correct,
        v_awarded_points,
        v_response_time_ms,
        v_new_score;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_leaderboard(
    p_session_id bigint
)
RETURNS TABLE (
    place bigint,
    participant_id bigint,
    nickname varchar,
    score integer,
    correct_answers bigint,
    total_response_time_ms bigint
)
LANGUAGE sql
AS $$
    SELECT
        dense_rank() OVER (
            ORDER BY gp.score DESC, gp.total_response_time_ms ASC, gp.joined_at ASC
        ) AS place,
        gp.id AS participant_id,
        gp.nickname,
        gp.score,
        COALESCE(stats.correct_answers, 0) AS correct_answers,
        gp.total_response_time_ms
    FROM game_participants AS gp
    LEFT JOIN (
        SELECT
            s.participant_id,
            count(*) FILTER (WHERE s.is_correct) AS correct_answers
        FROM submissions AS s
        WHERE s.session_id = p_session_id
        GROUP BY s.participant_id
    ) AS stats
        ON stats.participant_id = gp.id
    WHERE gp.session_id = p_session_id
    ORDER BY place, gp.nickname;
$$;

CREATE OR REPLACE PROCEDURE sp_finish_game_session(
    p_session_id bigint,
    p_host_id bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_session game_sessions%ROWTYPE;
BEGIN
    SELECT *
    INTO v_session
    FROM game_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;

    IF v_session.host_id <> p_host_id THEN
        RAISE EXCEPTION 'Only host can finish a game session';
    END IF;

    IF v_session.status = 'finished' THEN
        RAISE EXCEPTION 'Game session is already finished';
    END IF;

    UPDATE game_sessions
    SET status = 'finished',
        current_question_id = NULL,
        question_started_at = NULL,
        question_ends_at = NULL,
        finished_at = now()
    WHERE id = p_session_id;
END;
$$;

COMMIT;
