-- SupplyMind AI Intelligence Layer (Supabase)
-- Operational DB remains source of truth; this schema is for vectors, RAG, memory only.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- documents: forecast summaries, reports, insights, executive summaries, mlops
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'forecast', 'inventory', 'insight', 'report', 'mlops', 'incident', 'recommendation', 'general'
    )),
    source_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_source_type ON public.documents (source_type);
CREATE INDEX IF NOT EXISTS idx_documents_source_id ON public.documents (source_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON public.documents USING gin (metadata);

-- ---------------------------------------------------------------------------
-- embeddings: vectors linked to documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON public.embeddings (document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON public.embeddings
    USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- conversations: copilot chat history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_session ON public.conversations (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- memory: long-term agent memory (optional vector for semantic recall)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    agent_type TEXT NOT NULL CHECK (agent_type IN (
        'forecast', 'inventory', 'insights', 'mlops', 'copilot', 'general'
    )),
    memory_key TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, agent_type, memory_key)
);

CREATE INDEX IF NOT EXISTS idx_memory_agent ON public.memory (agent_type, user_id);
CREATE INDEX IF NOT EXISTS idx_memory_hnsw ON public.memory
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Semantic search RPC (documents + embeddings join)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_documents(
    query_embedding vector(384),
    match_count INT DEFAULT 8,
    match_threshold FLOAT DEFAULT 0.5,
    filter_source_type TEXT DEFAULT NULL,
    filter_product_id TEXT DEFAULT NULL,
    filter_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    document_id UUID,
    source_type TEXT,
    source_id TEXT,
    title TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        d.id AS document_id,
        d.source_type,
        d.source_id,
        d.title,
        d.content,
        d.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.embeddings e
    INNER JOIN public.documents d ON d.id = e.document_id
    WHERE
        (filter_source_type IS NULL OR d.source_type = filter_source_type)
        AND (filter_user_id IS NULL OR d.user_id = filter_user_id OR d.user_id IS NULL)
        AND (
            filter_product_id IS NULL
            OR d.metadata->>'product_id' = filter_product_id
            OR d.source_id = filter_product_id
        )
        AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_memory(
    query_embedding vector(384),
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.5,
    filter_agent_type TEXT DEFAULT NULL,
    filter_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    memory_id UUID,
    agent_type TEXT,
    memory_key TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        m.id AS memory_id,
        m.agent_type,
        m.memory_key,
        m.content,
        m.metadata,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM public.memory m
    WHERE
        m.embedding IS NOT NULL
        AND (filter_agent_type IS NULL OR m.agent_type = filter_agent_type)
        AND (filter_user_id IS NULL OR m.user_id = filter_user_id OR m.user_id IS NULL)
        AND (1 - (m.embedding <=> query_embedding)) >= match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (backend uses service_role; block direct anon access)
-- ---------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. Authenticated users may read own conversations only
-- when using Supabase Auth in future; for now deny anon/authenticated direct API.

CREATE POLICY documents_service_all ON public.documents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY embeddings_service_all ON public.embeddings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY conversations_service_all ON public.conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY memory_service_all ON public.memory
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY documents_deny_public ON public.documents
    FOR ALL TO anon, authenticated USING (false);

CREATE POLICY embeddings_deny_public ON public.embeddings
    FOR ALL TO anon, authenticated USING (false);

CREATE POLICY conversations_deny_public ON public.conversations
    FOR ALL TO anon, authenticated USING (false);

CREATE POLICY memory_deny_public ON public.memory
    FOR ALL TO anon, authenticated USING (false);
