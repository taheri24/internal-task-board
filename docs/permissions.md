# Permissions matrix

Enforced in NestJS. `todo-access.policy.ts` is the single source for task rules, and the controllers add role guards.

| Capability | Owner | Manager | Member |
|---|:-:|:-:|:-:|
| Sign in / sign out | ✅ | ✅ | ✅ |
| View tasks | All | All | Created by or assigned to them |
| Create task | ✅ | ✅ | ✅ (always assigned to self) |
| Edit title, description, priority, due date | ✅ | ✅ | ✅ on own or assigned tasks |
| Change status | ✅ | ✅ | ✅ only on tasks assigned to them |
| Change assignee | ✅ | ✅ | ❌ read-only (API returns 403 for a different value) |
| Delete (soft) | ✅ | ✅ | ✅ only tasks they created |
| Restore from trash | ✅ | ✅ | ❌ |
| View trash | ✅ | ✅ | ❌ |
| List users (`GET /users`) | ✅ | ❌ | ❌ |
| Create / edit users, roles, disable | ✅ | ❌ | ❌ |
| Assignee directory (`GET /users/directory`, names only) | ✅ | ✅ | ✅ |

## Rules that always hold

- Authorization is checked in the API, never only in the UI.
- A missing or foreign task returns **404**, not 403, so existence is not leaked.
- A disabled user cannot sign in and their existing access token stops working on the next request.
- The last active Owner cannot be disabled or downgraded.
- Members cannot choose an assignee on create. The server sets it to the caller.

## Open decisions (proposed defaults)

1. A Member who created a task but is no longer assigned to it can still edit its content, but not its status. This is the current behaviour.
2. Managers cannot manage users.
3. Owners have full task access.
4. Comments, if added later, follow task visibility.
