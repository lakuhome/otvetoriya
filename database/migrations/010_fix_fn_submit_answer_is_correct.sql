BEGIN;

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

    SELECT COALESCE(array_agg(ao.id ORDER BY ao.id), ARRAY[]::bigint[])
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

COMMIT;

