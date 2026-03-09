-- ============================================
-- Post-migration validation queries
-- Run in Supabase SQL Editor after data import
-- ============================================

-- 1. Row counts per table
SELECT 'team' AS tbl, COUNT(*) AS cnt FROM team
UNION ALL SELECT 'startups', COUNT(*) FROM startups
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'investors', COUNT(*) FROM investors
UNION ALL SELECT 'project_investors', COUNT(*) FROM project_investors
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'project_notes', COUNT(*) FROM project_notes
UNION ALL SELECT 'config', COUNT(*) FROM config
ORDER BY tbl;

-- 2. Orphaned projects (startup_id not in startups)
SELECT p.project_id, p.startup_id, p.project_name
FROM projects p
LEFT JOIN startups s ON s.startup_id = p.startup_id
WHERE s.startup_id IS NULL;

-- 3. Orphaned project_investors (invalid project or investor references)
SELECT pi.link_id, pi.project_id, pi.investor_id
FROM project_investors pi
LEFT JOIN projects p ON p.project_id = pi.project_id
LEFT JOIN investors i ON i.investor_id = pi.investor_id
WHERE p.project_id IS NULL OR i.investor_id IS NULL;

-- 4. Duplicate project_investors (same project + investor pair)
SELECT project_id, investor_id, COUNT(*) AS cnt
FROM project_investors
GROUP BY project_id, investor_id
HAVING COUNT(*) > 1;

-- 5. Invalid funnel stages
SELECT link_id, project_id, stage
FROM project_investors
WHERE stage NOT IN ('Pipeline', 'On Hold', 'Trying to reach', 'Active', 'Advanced', 'Declined');

-- 6. Invalid task statuses
SELECT task_id, title, status
FROM tasks
WHERE status NOT IN ('todo', 'doing', 'done');

-- 7. Invalid task priorities
SELECT task_id, title, priority
FROM tasks
WHERE priority NOT IN ('low', 'medium', 'high');

-- 8. Tags converted to arrays correctly (sample)
SELECT investor_id, investor_name, tags, array_length(tags, 1) AS tag_count
FROM investors
WHERE array_length(tags, 1) > 0
LIMIT 10;

-- 9. Pipeline stages config exists
SELECT * FROM config WHERE key = 'pipeline_stages';

-- 10. Tasks with calendar sync preserved
SELECT task_id, title, calendar_event_id, sync_status
FROM tasks
WHERE sync_status != 'none'
ORDER BY sync_status;

-- 11. Orphaned project_notes (project_id not in projects)
SELECT n.note_id, n.project_id
FROM project_notes n
LEFT JOIN projects p ON p.project_id = n.project_id
WHERE p.project_id IS NULL;

-- 12. Summary report
SELECT
  (SELECT COUNT(*) FROM team) AS team_count,
  (SELECT COUNT(*) FROM startups) AS startup_count,
  (SELECT COUNT(*) FROM projects) AS project_count,
  (SELECT COUNT(*) FROM investors) AS investor_count,
  (SELECT COUNT(*) FROM project_investors) AS funnel_count,
  (SELECT COUNT(*) FROM tasks) AS task_count,
  (SELECT COUNT(*) FROM project_notes) AS note_count;
