CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE family_members (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    browse_view_mode text DEFAULT 'stack' NOT NULL,
    cooking_view_mode text,
    preferred_language text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT family_members_browse_view_mode_check CHECK (browse_view_mode IN ('stack', 'list')),
    CONSTRAINT family_members_preferred_language_check CHECK (preferred_language IN ('en', 'fr')),
    CONSTRAINT family_members_cooking_view_mode_check CHECK (cooking_view_mode IS NULL OR cooking_view_mode IN ('step-by-step', 'all-steps'))
);

CREATE UNIQUE INDEX IF NOT EXISTS family_members_trimmed_lower_name_idx ON family_members (lower(trim(name)));

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
    rotation_human_off boolean NOT NULL DEFAULT false,
    rotation_source text NOT NULL DEFAULT 'Unknown',
    cooked_suppressed boolean NOT NULL DEFAULT false,
    supper_suitable boolean,
    category text,
    is_vegetarian boolean,
    raw_metadata jsonb,
    ingredients jsonb,
    cuisine_type text,
    meal_types text[],
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    last_cooked_date timestamptz,
    finished_dish_index integer DEFAULT -1 NOT NULL,
    deleted_at timestamptz DEFAULT NULL,
    deleted_by uuid DEFAULT NULL,
    delete_note text DEFAULT NULL,
    is_ready boolean DEFAULT false NOT NULL,
    CONSTRAINT recipes_rating_check CHECK (rating >= 0 AND rating <= 3)
);

COMMENT ON COLUMN recipes.is_vegetarian IS 'wfs-vegetarian-classification-nullable-v1';

CREATE TABLE IF NOT EXISTS recipe_import_reports (
    recipe_id uuid PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
    reasons text[] NOT NULL,
    note varchar(500),
    status text NOT NULL DEFAULT 'reported',
    reported_by uuid REFERENCES family_members(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES family_members(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    last_workflow_instance_id uuid,
    last_attempt_at timestamptz,
    reimported_at timestamptz,
    last_error varchar(2000),
    CONSTRAINT recipe_import_reports_reasons_check CHECK (
        cardinality(reasons) > 0
        AND reasons <@ ARRAY['ingredients', 'steps', 'duplicate']::text[]
        AND cardinality(array_positions(reasons, 'ingredients'::text)) <= 1
        AND cardinality(array_positions(reasons, 'steps'::text)) <= 1
        AND cardinality(array_positions(reasons, 'duplicate'::text)) <= 1
    ),
    CONSTRAINT recipe_import_reports_status_check CHECK (status IN ('reported', 'reimporting', 'reimport_failed', 'ready_to_review'))
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
    embedding_status text NOT NULL DEFAULT 'pending',
    embedding_fingerprint text,
    last_indexed_at timestamptz,
    source_fingerprint text,
    schema_version integer NOT NULL DEFAULT 2,
    CONSTRAINT "CK_recipe_search_documents_index_status" CHECK (index_status IN ('pending', 'indexing', 'ready', 'failed')),
    CONSTRAINT "CK_recipe_search_documents_embedding_status" CHECK (embedding_status IN ('pending', 'indexing', 'ready', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_recipe_search_documents_embedding 
    ON recipe_search_documents 
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_recipe_search_documents_document_trgm
    ON recipe_search_documents
    USING gin (document_text gin_trgm_ops)
    WHERE index_status = 'ready';

CREATE TABLE IF NOT EXISTS weekly_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date date UNIQUE NOT NULL,
    status smallint NOT NULL DEFAULT 0, -- 0=Draft, 1=VotingOpen, 2=Locked
    voting_round_id uuid,
    last_closed_round_id uuid,
    requires_round_identity boolean NOT NULL DEFAULT false,
    notified_at timestamptz,
    grocery_state jsonb NOT NULL DEFAULT '{}'::jsonb,
    grocery_items jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE grocery_extra_occurrences (
    id uuid PRIMARY KEY,
    lineage_id uuid NOT NULL,
    predecessor_id uuid REFERENCES grocery_extra_occurrences(id) ON DELETE RESTRICT,
    week_start_date date NOT NULL,
    name text NOT NULL,
    normalized_key text NOT NULL,
    grocery_section text NOT NULL DEFAULT 'Grocery',
    checked boolean NOT NULL DEFAULT false,
    removed_at timestamptz,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT grocery_extra_occurrences_lineage_week_unique UNIQUE (lineage_id, week_start_date),
    CONSTRAINT grocery_extra_occurrences_predecessor_unique UNIQUE (predecessor_id),
    CONSTRAINT grocery_extra_occurrences_monday CHECK (EXTRACT(ISODOW FROM week_start_date) = 1),
    CONSTRAINT grocery_extra_occurrences_name CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 200),
    CONSTRAINT grocery_extra_occurrences_version CHECK (version >= 1),
    CONSTRAINT grocery_extra_occurrences_section CHECK (grocery_section IN ('Produce','Meat','Seafood','Dairy & Eggs','Frozen','Bakery','Pantry','Beverages','Deli','Grocery'))
);

CREATE INDEX idx_grocery_extra_occurrences_week ON grocery_extra_occurrences (week_start_date);
CREATE INDEX idx_grocery_extra_occurrences_normalized ON grocery_extra_occurrences (normalized_key);

CREATE TABLE voting_round_state (
    id integer PRIMARY KEY CHECK (id = 1),
    round_id uuid NOT NULL,
    week_start_date date,
    history_generation uuid NOT NULL,
    requires_round_identity boolean NOT NULL DEFAULT false
);

CREATE TABLE weekly_household_interest (
    week_start_date date NOT NULL,
    recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    positive_count integer NOT NULL,
    selected boolean NOT NULL,
    captured_at timestamptz NOT NULL,
    close_id uuid NOT NULL,
    PRIMARY KEY (week_start_date, recipe_id),
    CONSTRAINT weekly_interest_positive CHECK (positive_count > 0),
    CONSTRAINT weekly_interest_monday CHECK (EXTRACT(ISODOW FROM week_start_date) = 1)
);

CREATE TABLE calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
    date date NOT NULL,
    meal_slot smallint NOT NULL DEFAULT 0,
    status smallint NOT NULL,
    vote_count integer,
    candidate_ids uuid[],
    non_cooking_kind text,
    non_cooking_label text,
    CONSTRAINT calendar_events_non_cooking_check CHECK ((non_cooking_kind IS NULL AND non_cooking_label IS NULL) OR (non_cooking_kind IS NOT NULL AND status = 3 AND recipe_id IS NULL AND ((non_cooking_kind IN ('order_in', 'eating_out') AND (non_cooking_label IS NULL OR (char_length(btrim(non_cooking_label)) >= 1 AND char_length(btrim(non_cooking_label)) <= 80))) OR (non_cooking_kind = 'mystery' AND non_cooking_label IS NULL) OR (non_cooking_kind = 'custom' AND non_cooking_label IS NOT NULL AND char_length(btrim(non_cooking_label)) >= 1 AND char_length(btrim(non_cooking_label)) <= 80)))),
    CONSTRAINT calendar_events_status_check CHECK (status >= 0 AND status <= 4),
    CONSTRAINT calendar_events_date_slot_unique UNIQUE (date, meal_slot)
);

COMMENT ON COLUMN calendar_events.non_cooking_label IS 'wfs-non-cooking-optional-notes-v1';

CREATE TABLE recipe_votes (
    recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    vote smallint NOT NULL,
    voted_at timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (recipe_id, family_member_id),
    CONSTRAINT recipe_votes_vote_check CHECK (vote >= 1 AND vote <= 2)
);

CREATE TABLE IF NOT EXISTS recipe_search_filter_state (
    id integer PRIMARY KEY CHECK (id = 1),
    generated_at timestamptz NOT NULL,
    cuisine_payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_search_affinity_facts (
    recipe_id uuid PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
    affinity integer NOT NULL,
    live_vote_contribution integer,
    last_cooked_on date,
    generated_at timestamptz NOT NULL
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

CREATE TABLE feature_flag_overrides (
    member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    flag_key text NOT NULL,
    enabled boolean NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (member_id, flag_key)
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
CREATE INDEX idx_recipe_search_affinity_facts_generated_at ON recipe_search_affinity_facts (generated_at);
CREATE INDEX idx_recipes_added_by ON recipes (added_by) WHERE (added_by IS NOT NULL);
CREATE INDEX idx_recipes_created_at_desc ON recipes (created_at DESC);
CREATE INDEX idx_recipes_discovery_lookup ON recipes (category, id) WHERE (is_discoverable = true);
CREATE INDEX idx_recipe_import_reports_status ON recipe_import_reports (status);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON recipes (cuisine_type) WHERE (cuisine_type IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_maintenance_commands_status_scheduled ON maintenance_commands (status, scheduled_for, created_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_commands_terminal_completed ON maintenance_commands (completed_at, id) WHERE status IN ('completed', 'skipped');

CREATE OR REPLACE VIEW vw_recipe_matches AS 
SELECT recipe_id, count(recipe_id) AS vote_count 
FROM recipe_votes 
WHERE vote = 1 
GROUP BY recipe_id;

CREATE OR REPLACE VIEW vw_discovery_recipes AS
SELECT r.id, r.name, r.category, r.cuisine_type, r.meal_types, r.description, r.ingredients, r.image_count, r.total_time, r.is_vegetarian, r.last_cooked_date, r.created_at, r.finished_dish_index,
COALESCE(v.vote_count, 0) AS vote_count, r.supper_suitable
FROM recipes r
LEFT JOIN (SELECT recipe_id, count(recipe_id) AS vote_count FROM recipe_votes WHERE vote = 1 GROUP BY recipe_id) v ON r.id = v.recipe_id
WHERE r.is_discoverable = true AND r.is_ready = true AND r.deleted_at IS NULL;

CREATE TABLE recovery_publication (
    id integer PRIMARY KEY CONSTRAINT recovery_publication_singleton CHECK (id = 1),
    operation_id uuid NOT NULL,
    snapshot_id uuid NOT NULL
);
