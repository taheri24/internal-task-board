/** Error thrown by the API client. `message` is already translated to Persian. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: string[] = [],
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FA: Record<string, string> = {
  'Invalid email or password': 'ایمیل یا رمز عبور نادرست است.',
  'Session expired': 'نشست شما پایان یافته است. دوباره وارد شوید.',
  'Authentication required': 'برای ادامه باید وارد شوید.',
  'Task not found': 'وظیفه پیدا نشد یا دسترسی شما به آن ندارد.',
  'You can only delete tasks you created': 'فقط وظایفی را که خودتان ساخته‌اید می‌توانید حذف کنید.',
  'Members cannot change the assignee': 'اعضا نمی‌توانند مسئول وظیفه را تغییر دهند.',
  'Only the assignee can change this task status': 'فقط مسئول وظیفه می‌تواند وضعیت آن را تغییر دهد.',
  'The last active Owner cannot be disabled or downgraded': 'آخرین مالک فعال را نمی‌توان غیرفعال یا تنزل سطح داد.',
  'This email is already registered': 'این ایمیل قبلاً ثبت شده است.',
  'Assignee must be an active user': 'مسئول باید کاربر فعال باشد.',
  'User not found': 'کاربر پیدا نشد.',
  'Only Owners and Managers can restore tasks': 'فقط مالک و مدیر می‌توانند وظیفه را بازیابی کنند.',
  'Too Many Requests': 'تعداد درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.',
  'ThrottlerException: Too Many Requests': 'تعداد درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.',
};

export function translateApiMessage(message: unknown, details?: unknown): string {
  if (typeof message === 'string' && FA[message]) return FA[message];
  if (Array.isArray(details) && details.length > 0) return 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.';
  return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}

export function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'ارتباط با سرور برقرار نشد. اتصال را بررسی کنید.';
}
