CREATE TABLE race_results (
  id bigserial PRIMARY KEY,
  player_id uuid NOT NULL,
  course_id text NOT NULL,
  vehicle text NOT NULL,
  player_name varchar(24) NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 24),
  time_s double precision NOT NULL CHECK (time_s > 0 AND time_s <= 1800),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, course_id, vehicle)
);
CREATE INDEX race_results_board ON race_results (course_id, time_s, vehicle);
