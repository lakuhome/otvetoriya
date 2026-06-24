BEGIN;

CREATE OR REPLACE FUNCTION fn_register_user(
    p_email text,
    p_password text,
    p_display_name text,
    p_role text
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    v_email text;
    v_display_name text;
    v_user_id bigint;
BEGIN
    v_email := lower(trim(COALESCE(p_email, '')));
    v_display_name := trim(COALESCE(p_display_name, ''));

    IF v_email = '' THEN
        RAISE EXCEPTION 'Email is required';
    END IF;

    IF p_password IS NULL OR char_length(p_password) < 6 THEN
        RAISE EXCEPTION 'Password must contain at least 6 characters';
    END IF;

    IF char_length(v_display_name) < 2 OR char_length(v_display_name) > 100 THEN
        RAISE EXCEPTION 'Display name must contain from 2 to 100 characters';
    END IF;

    IF p_role NOT IN ('organizer', 'participant') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM users
        WHERE lower(email) = v_email
    ) THEN
        RAISE EXCEPTION 'Email already exists';
    END IF;

    INSERT INTO users (
        email,
        password_hash,
        display_name,
        role
    )
    VALUES (
        v_email,
        crypt(p_password, gen_salt('bf', 12)),
        v_display_name,
        p_role
    )
    RETURNING id INTO v_user_id;

    RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_authenticate_user(
    p_email text,
    p_password text
)
RETURNS TABLE (
    user_id bigint,
    display_name varchar,
    user_role varchar
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_email IS NULL OR p_password IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.display_name,
        u.role
    FROM users AS u
    WHERE lower(u.email) = lower(trim(p_email))
      AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$;

COMMIT;

