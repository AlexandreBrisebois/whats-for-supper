CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE family_members (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE workflow_instances (
    id uuid PRIMARY KEY,
    workflow_id text NOT NULL,
    status smallint NOT NULL,
    parameters jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE recipes (
    id uuid PRIMARY KEY,
    rating smallint NOT NULL,
    added_by uuid REFERENCES family_members(id) ON DELETE SET NULL,
    notes text,
    description text,
    name text,
    total_time text,
    image_count integer DEFAULT 0 NOT NULL,
    is_synthesized boolean DEFAULT false NOT NULL,
    is_discoverable boolean NOT NULL,
    category text,
    difficulty text,
    is_vegetarian boolean NOT NULL,
    is_healthy_choice boolean NOT NULL,
    raw_metadata jsonb,
    ingredients jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    last_cooked_date timestamptz,
    CONSTRAINT recipes_rating_check CHECK (rating >= 0 AND rating <= 3)
);

CREATE TABLE IF NOT EXISTS weekly_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date date UNIQUE NOT NULL,
    status smallint NOT NULL DEFAULT 0, -- 0=Draft, 1=VotingOpen, 2=Locked
    notified_at timestamptz,
    grocery_state jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    date date NOT NULL,
    meal_slot smallint NOT NULL DEFAULT 0,
    status smallint NOT NULL,
    vote_count integer,
    candidate_ids uuid[],
    CONSTRAINT calendar_events_status_check CHECK (status >= 0 AND status <= 3),
    CONSTRAINT calendar_events_date_slot_unique UNIQUE (date, meal_slot)
);

CREATE TABLE recipe_votes (
    recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    vote smallint NOT NULL,
    voted_at timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (recipe_id, family_member_id),
    CONSTRAINT recipe_votes_vote_check CHECK (vote >= 1 AND vote <= 2)
);

CREATE TABLE workflow_tasks (
    task_id uuid PRIMARY KEY,
    instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    task_name text DEFAULT '' NOT NULL,
    processor_name text NOT NULL,
    payload jsonb,
    status smallint NOT NULL,
    depends_on text[] NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    scheduled_at timestamptz,
    error_message text,
    stack_trace text,
    result jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE family_settings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text UNIQUE NOT NULL,
    value       jsonb NOT NULL,
    updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_calendar_events_recipe_id ON calendar_events (recipe_id);
CREATE INDEX idx_workflow_tasks_instance_id ON workflow_tasks (instance_id);
CREATE INDEX idx_calendar_events_date ON calendar_events (date);
CREATE INDEX idx_recipe_votes_family_member_id ON recipe_votes (family_member_id);
CREATE INDEX idx_recipe_votes_recipe_id ON recipe_votes (recipe_id);
CREATE INDEX idx_recipes_added_by ON recipes (added_by) WHERE (added_by IS NOT NULL);
CREATE INDEX idx_recipes_created_at_desc ON recipes (created_at DESC);
CREATE INDEX idx_recipes_discovery_lookup ON recipes (category, id) WHERE (is_discoverable = true);

CREATE OR REPLACE VIEW vw_recipe_matches AS 
SELECT recipe_id, count(recipe_id) AS vote_count 
FROM recipe_votes 
WHERE vote = 1 
GROUP BY recipe_id;

CREATE OR REPLACE VIEW vw_discovery_recipes AS
SELECT r.id, r.name, r.category, r.description, r.ingredients, r.image_count, r.difficulty, r.total_time, r.is_vegetarian, r.is_healthy_choice, r.last_cooked_date, r.created_at,
COALESCE(v.vote_count, 0) AS vote_count
FROM recipes r
LEFT JOIN (SELECT recipe_id, count(recipe_id) AS vote_count FROM recipe_votes WHERE vote = 1 GROUP BY recipe_id) v ON r.id = v.recipe_id
WHERE r.is_discoverable = true;
