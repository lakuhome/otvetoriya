BEGIN;

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

    SELECT gp.id
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

COMMIT;

