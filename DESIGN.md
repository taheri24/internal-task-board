# Design

## Subject and job

An internal task board for a small team. The screen has one main job: show what is moving, who owns each item, and what is late. Everything else supports that.

## Palette

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F4F5F0` | page canvas, with a faint dotted texture |
| `surface` | `#FFFFFF` | cards, lanes, forms |
| `ink` | `#1C2B33` | primary text |
| `muted` | `#5F6F78` | secondary text, metadata |
| `line` | `#DCE0D8` | hairline borders |
| `accent` | `#0E6257` | primary actions, focus, active nav |
| `todo` / `progress` / `done` | `#6B7C88` / `#A8660E` / `#2D7A55` | status: lane rule and card start edge |
| `danger` | `#B42318` | errors, overdue |

Why this palette: it avoids the warm-cream and terracotta default, and the near-black with acid-green default. The teal accent suits an operational tool. The three status colours are muted so they signal state without shouting.

## Typography

One family, **Vazirmatn**, used for everything. Persian text is set with `dir="rtl"` on `<html>`. Weights in use: 400 for body, 600 for labels, 700 to 800 for headings. No all-caps labels. Type scale: 24px page title, 18px dialog title, 15px card title, 14px body and controls, 12px metadata.

## Layout

- **Navigation rail** on the right (RTL start), 256px, with a hairline on its inner edge. Hidden below `md`, where the top bar carries the links.
- **Top bar**: 56px, dotted-paper background, user chip and sign-out on the left (RTL end).
- **Page header**: title, a count line with overdue count in danger colour, primary action on the right.
- **Filter bar**: one row of search and Listbox filters, with reset.
- **Board**: three equal lanes. Each lane has a 4px status-coloured rule above its title and a count. Cards are white rows with a status-coloured start edge. Overdue cards get a text label, not only a colour change.
- **Dialogs** slide up from the bottom on phones and sit centred on larger screens. Each has a clear footer: destructive action on the left, primary on the right.

## Principles

1. **Colour is never the only signal.** Priority has a text label. Overdue has text. Status has a title and a lane.
2. **Locked things look locked.** Read-only assignee fields have a lock icon, a muted fill, and a tooltip that explains why.
3. **Empty and error states give a next step.** "No task in this lane" and "Try again" are explicit.
4. **Motion is minimal.** A single pulse on loading. All transitions are disabled when reduced motion is requested.
5. **Focus is always visible.** Every control has a 2px accent outline with offset.

## Copy

Verbs are plain and consistent: "وظیفه جدید" creates, "ذخیره تغییرات" saves, "حذف وظیفه" starts deletion, and the confirm step names the consequence ("به سطل زباله منتقل شود؟"). Errors state what happened in the interface's voice and do not apologise.

## Accessibility

- Headless UI provides focus management and keyboard navigation for dialogs, listboxes and menus.
- Lanes are labelled regions. Counts are announced as part of their heading.
- A skip link is the first focusable element.
- Contrast: ink on paper and white is above 7:1. Accent text on accent-soft is above 4.5:1.
- Toasts are replaced by inline `role="alert"` and `role="status"` messages for now.
