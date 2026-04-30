# Security Spec

1. Data Invariants:
- A notice or event must have a title, content/description, date, and createdAt timestamp.
- Only an administrator (authenticated user with email matching the predefined admin email) can create, update, or delete notices and events.
- Anyone can read notices and events.

2. The "Dirty Dozen" Payloads:
- Unauthenticated write to notices.
- Authenticated write by non-admin to notices.
- Admin write without required fields.
- Admin write with invalid type for date.
- Admin write with out-of-bounds string sizes.
- Missing title.
- Type mismatch.
- ID Poisoning (invalid ID character).
- Read by unauthenticated users (Allowed).
- Read by unauthenticated users (Allowed).
- Delete by non-admin.

3. The Test Runner:
- (Skipped in real for now, but conceptualized).
