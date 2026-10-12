import 'reflect-metadata';
import * as argon2 from 'argon2';
import AppDataSource from '../config/data-source';
import { Priority, Role, TaskStatus } from '../common/enums';
import { User } from '../users/user.entity';
import { Task } from '../todos/task.entity';
import type { TipTapDoc } from '../todos/tiptap.types';

/**
 * Idempotent: existing users are left untouched (passwords are never reset),
 * and sample tasks are created only when the tasks table is empty.
 */
const SEED_USERS = [
  { email: 'owner@taskboard.local', displayName: 'نیلوفر کریمی', role: Role.Owner, password: 'Owner@12345' },
  { email: 'manager@taskboard.local', displayName: 'سارا احمدی', role: Role.Manager, password: 'Manager@12345' },
  { email: 'member@taskboard.local', displayName: 'علی رضایی', role: Role.Member, password: 'Member@12345' },
];

const doc = (text: string): TipTapDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

async function main() {
  await AppDataSource.initialize();
  try {
    const users = AppDataSource.getRepository(User);
    const tasks = AppDataSource.getRepository(Task);
    const ids: Partial<Record<Role, string>> = {};

    for (const s of SEED_USERS) {
      let user = await users.findOne({ where: { email: s.email } });
      if (user) {
        console.log(`exists: ${s.email}`);
      } else {
        user = await users.save(
          users.create({
            email: s.email,
            displayName: s.displayName,
            role: s.role,
            isActive: true,
            passwordHash: await argon2.hash(s.password),
          }),
        );
        console.log(`created: ${s.email}`);
      }
      ids[s.role] = user.id;
    }

    if ((await tasks.count()) === 0) {
      const owner = ids[Role.Owner]!;
      const manager = ids[Role.Manager]!;
      const member = ids[Role.Member]!;
      await tasks.save([
        tasks.create({ title: 'طراحی صفحه ورود', description: doc('نسخه نهایی صفحه ورود با پشتیبانی از RTL.'), status: TaskStatus.InProgress, priority: Priority.High, assigneeId: manager, createdById: owner, dueDate: '2026-10-20' }),
        tasks.create({ title: 'بررسی مستندات مجوزها', description: doc('جدول دسترسی نقش‌ها را با تیم تایید کنید.'), status: TaskStatus.Todo, priority: Priority.Medium, assigneeId: owner, createdById: owner, dueDate: null }),
        tasks.create({ title: 'تست دسترسی عضو', description: doc('مطمئن شوید عضو وظایف دیگران را نمی‌بیند.'), status: TaskStatus.Todo, priority: Priority.Urgent, assigneeId: member, createdById: member, dueDate: '2026-10-15' }),
        tasks.create({ title: 'راه‌اندازی داکر', description: doc('docker compose up باید بدون خطا اجرا شود.'), status: TaskStatus.Done, priority: Priority.Low, assigneeId: manager, createdById: manager, dueDate: null }),
      ]);
      console.log('sample tasks created');
    } else {
      console.log('tasks already exist: skipping sample data');
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
