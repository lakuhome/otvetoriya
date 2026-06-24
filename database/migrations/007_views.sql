BEGIN;

CREATE OR REPLACE VIEW v_participant_history AS
WITH ranked_participants AS (
    SELECT
        gp.user_id,
        gp.session_id,
        gp.score,
        gp.total_response_time_ms,
        gp.joined_at,
        dense_rank() OVER (
            PARTITION BY gp.session_id
            ORDER BY gp.score DESC, gp.total_response_time_ms ASC, gp.joined_at ASC
        ) AS place,
        count(*) OVER (PARTITION BY gp.session_id) AS participants_count
    FROM game_participants AS gp
)
SELECT
    rp.user_id,
    rp.session_id,
    q.title AS quiz_title,
    gs.created_at AS session_date,
    rp.score,
    rp.place,
    rp.participants_count
FROM ranked_participants AS rp
JOIN game_sessions AS gs
    ON gs.id = rp.session_id
JOIN quizzes AS q
    ON q.id = gs.quiz_id;

CREATE OR REPLACE VIEW v_hosted_sessions AS
WITH participant_counts AS (
    SELECT
        session_id,
        count(*) AS participants_count
    FROM game_participants
    GROUP BY session_id
),
ranked_participants AS (
    SELECT
        gs.id AS session_id,
        gp.nickname,
        gp.score,
        row_number() OVER (
            PARTITION BY gs.id
            ORDER BY gp.score DESC, gp.total_response_time_ms ASC, gp.joined_at ASC
        ) AS winner_rank
    FROM game_sessions AS gs
    LEFT JOIN game_participants AS gp
        ON gp.session_id = gs.id
),
winners AS (
    SELECT
        session_id,
        nickname AS winner_name,
        score AS winner_score
    FROM ranked_participants
    WHERE winner_rank = 1
)
SELECT
    gs.host_id,
    gs.id AS session_id,
    gs.quiz_id,
    q.title AS quiz_title,
    gs.created_at,
    gs.finished_at,
    gs.status,
    COALESCE(pc.participants_count, 0) AS participants_count,
    w.winner_name,
    w.winner_score
FROM game_sessions AS gs
JOIN quizzes AS q
    ON q.id = gs.quiz_id
LEFT JOIN participant_counts AS pc
    ON pc.session_id = gs.id
LEFT JOIN winners AS w
    ON w.session_id = gs.id;

COMMIT;
