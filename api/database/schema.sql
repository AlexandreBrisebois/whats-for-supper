CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE family_members (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    browse_view_mode text DEFAULT 'stack' NOT NULL,
    preferred_language text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT family_members_browse_view_mode_check CHECK (browse_view_mode IN ('stack', 'list')),
    CONSTRAINT family_members_preferred_language_check CHECK (preferred_language IN ('en', 'fr'))
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
    source_url text,
    image_count integer DEFAULT 0 NOT NULL,
    is_synthesized boolean DEFAULT false NOT NULL,
    is_discoverable boolean NOT NULL,
    category text,
    is_vegetarian boolean NOT NULL,
    is_healthy_choice boolean NOT NULL,
    raw_metadata jsonb,
    ingredients jsonb,
    dietary_profile jsonb DEFAULT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    last_cooked_date timestamptz,
    finished_dish_index integer DEFAULT -1 NOT NULL,
    deleted_at timestamptz null,
    deleted_by uuid null,
    delete_note text null,
    CONSTRAINT recipes_rating_check CHECK (rating >= 0 AND rating <= 3)
);

CREATE TABLE IF NOT EXISTS recipe_search_documents (
    recipe_id uuid PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
    document_text text NOT NULL,
    search_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    embedding_json text,
    embedding vector(1536) GENERATED ALWAYS AS (
        CASE 
            WHEN embedding_json IS NOT NULL AND embedding_json != 'null' 
            THEN (embedding_json)::vector 
            ELSE NULL 
        END
    ) STORED,
    embedding_model text NOT NULL,
    embedding_version text,
    index_status text NOT NULL DEFAULT 'pending',
    last_indexed_at timestamptz,
    source_fingerprint text,
    schema_version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_recipe_search_documents_embedding 
    ON recipe_search_documents 
    USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS weekly_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date date UNIQUE NOT NULL,
    status smallint NOT NULL DEFAULT 0, -- 0=Draft, 1=VotingOpen, 2=Locked
    notified_at timestamptz,
    grocery_state jsonb NOT NULL DEFAULT '{}'::jsonb,
    grocery_items jsonb NOT NULL DEFAULT '[]'::jsonb,
    balance_summary jsonb DEFAULT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
    date date NOT NULL,
    meal_slot smallint NOT NULL DEFAULT 0,
    status smallint NOT NULL,
    vote_count integer,
    candidate_ids uuid[],
    CONSTRAINT calendar_events_status_check CHECK (status >= 0 AND status <= 4),
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

CREATE TABLE IF NOT EXISTS maintenance_commands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    command_type text NOT NULL,
    status text NOT NULL,
    payload jsonb NOT NULL,
    result jsonb,
    attempts integer DEFAULT 0 NOT NULL,
    requested_by uuid REFERENCES family_members(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    scheduled_for timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    last_error text,
    CONSTRAINT maintenance_commands_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

CREATE TABLE ingredient_categories (
    normalized_key text PRIMARY KEY,
    grocery_section text NOT NULL,
    confidence float NOT NULL DEFAULT 1.0,
    -- source values: 'llm' | 'manual' | 'keyword'
    source text NOT NULL DEFAULT 'llm',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ingredient_categories_source_check CHECK (source IN ('llm', 'manual', 'keyword'))
);

CREATE INDEX idx_calendar_events_recipe_id ON calendar_events (recipe_id);
CREATE INDEX idx_workflow_tasks_instance_id ON workflow_tasks (instance_id);
CREATE INDEX idx_calendar_events_date ON calendar_events (date);
CREATE INDEX idx_recipe_votes_family_member_id ON recipe_votes (family_member_id);
CREATE INDEX idx_recipe_votes_recipe_id ON recipe_votes (recipe_id);
CREATE INDEX idx_recipes_added_by ON recipes (added_by) WHERE (added_by IS NOT NULL);
CREATE INDEX idx_recipes_created_at_desc ON recipes (created_at DESC);
CREATE INDEX idx_recipes_discovery_lookup ON recipes (category, id) WHERE (is_discoverable = true);
CREATE INDEX IF NOT EXISTS idx_maintenance_commands_status_scheduled ON maintenance_commands (status, scheduled_for, created_at);

CREATE OR REPLACE VIEW vw_recipe_matches AS 
SELECT recipe_id, count(recipe_id) AS vote_count 
FROM recipe_votes 
WHERE vote = 1 
GROUP BY recipe_id;

CREATE VIEW vw_discovery_recipes AS
SELECT r.id, r.name, r.category, r.description, r.ingredients, r.image_count, r.total_time, r.is_vegetarian, r.is_healthy_choice, r.last_cooked_date, r.created_at, r.dietary_profile, r.finished_dish_index,
COALESCE(v.vote_count, 0) AS vote_count
FROM recipes r
LEFT JOIN (SELECT recipe_id, count(recipe_id) AS vote_count FROM recipe_votes WHERE vote = 1 GROUP BY recipe_id) v ON r.id = v.recipe_id
WHERE r.is_discoverable = true;
