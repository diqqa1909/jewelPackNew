-- Terminates any backend session currently holding Prisma Migrate's advisory lock.
-- Use when Prisma commands fail with advisory lock timeouts (P1002).

SELECT pg_terminate_backend(l.pid) AS terminated
FROM pg_locks l
WHERE l.locktype = 'advisory'
  AND l.classid = 0
  AND l.objid = 72707369
  AND l.pid <> pg_backend_pid();

