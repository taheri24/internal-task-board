import { Role } from '../common/enums';
import { canChangeStatus, canDelete, canView } from './todo-access.policy';

/** Required test 1: a Member cannot view another user's tasks. */
describe('task access policy', () => {
  const member = { id: 'member-1', role: Role.Member };
  const otherTask = { createdById: 'someone-else', assigneeId: 'another-person' };

  it('blocks a Member from viewing a task they neither created nor are assigned to', () => {
    expect(canView(member, otherTask)).toBe(false);
  });

  it('lets a Member view a task assigned to them or created by them', () => {
    expect(canView(member, { createdById: 'someone-else', assigneeId: 'member-1' })).toBe(true);
    expect(canView(member, { createdById: 'member-1', assigneeId: null })).toBe(true);
  });

  it('lets a Manager view any task', () => {
    expect(canView({ id: 'mgr', role: Role.Manager }, otherTask)).toBe(true);
  });

  it('blocks a Member from changing status unless the task is assigned to them', () => {
    expect(canChangeStatus(member, { createdById: 'member-1', assigneeId: 'someone-else' })).toBe(false);
    expect(canChangeStatus(member, { createdById: 'someone-else', assigneeId: 'member-1' })).toBe(true);
  });

  it('blocks a Member from deleting a task they did not create', () => {
    expect(canDelete(member, { createdById: 'someone-else', assigneeId: 'member-1' })).toBe(false);
  });
});
