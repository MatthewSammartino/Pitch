-- Create stub users for the 5 existing players (no google_id yet — claimed on first login)
INSERT INTO users (display_name, legacy_name) VALUES
  ('Matt',   'matt'),
  ('Seth',   'seth'),
  ('Mack',   'mack'),
  ('Arnav',  'arnav'),
  ('Henry',  'henry')
ON CONFLICT DO NOTHING;

-- Create the Sammartino Group
INSERT INTO friend_groups (name, slug, invite_token)
VALUES (
  'Sammartino Group',
  'sammartino-group',
  encode(gen_random_bytes(32), 'hex')
)
ON CONFLICT (slug) DO NOTHING;

-- Add all 5 stub users as members
INSERT INTO group_members (group_id, user_id, role)
SELECT fg.id, u.id, 'member'
FROM friend_groups fg
CROSS JOIN users u
WHERE fg.slug = 'sammartino-group'
  AND u.legacy_name IN ('matt','seth','mack','arnav','henry')
ON CONFLICT DO NOTHING;
