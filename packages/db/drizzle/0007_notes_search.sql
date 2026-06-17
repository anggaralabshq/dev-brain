-- Full-text search index on title + excerpt (HTML-stripped by app layer)
CREATE INDEX IF NOT EXISTS notes_fts_idx ON notes USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
);

-- GIN index on tags array for fast tag filtering/searching
CREATE INDEX IF NOT EXISTS notes_tags_gin_idx ON notes USING GIN (tags);
