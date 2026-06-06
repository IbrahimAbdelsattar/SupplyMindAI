# Self-Hosted Application Services

SupplyMind uses the primary SQLAlchemy database for users, knowledge documents,
embeddings, copilot conversations, and agent memory. SQLite works for local
development and PostgreSQL is supported through `DATABASE_URL`.

Authentication uses application-issued access and refresh JWTs:

```env
JWT_SECRET=replace-with-a-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
```

Uploaded files are isolated by bucket and user under `STORAGE_PATH`:

```env
STORAGE_PATH=./data/storage
```

Knowledge ingestion generates embeddings with the configured
`EMBEDDING_MODEL`, persists them in the application database, and performs
cosine similarity search in the backend. Tables are created automatically at
API startup by `backend.db.create_tables()`.
