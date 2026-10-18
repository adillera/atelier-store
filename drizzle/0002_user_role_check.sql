-- Better Auth's generator can't emit CHECK constraints, and src/db/schema.ts is
-- overwritten by `npm run auth:generate`, so the role invariant lives here.
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("role" IN ('customer', 'admin'));
