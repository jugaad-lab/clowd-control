-- Sprint Closing Reports Table
-- For tracking sprint closure history and reports

CREATE TABLE IF NOT EXISTS sprint_closing_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  report_text TEXT NOT NULL,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_cancelled INTEGER NOT NULL DEFAULT 0,
  closed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by sprint
CREATE INDEX idx_sprint_closing_reports_sprint ON sprint_closing_reports(sprint_id);
CREATE INDEX idx_sprint_closing_reports_created ON sprint_closing_reports(created_at);

-- Add actual_end column to sprints table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sprints'
    AND column_name = 'actual_end'
  ) THEN
    ALTER TABLE sprints ADD COLUMN actual_end TIMESTAMPTZ;
  END IF;
END $$;

-- Enable RLS for sprint_closing_reports
ALTER TABLE sprint_closing_reports ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated (consistent with other tables for now)
CREATE POLICY "Allow all for authenticated" ON sprint_closing_reports FOR ALL USING (true);