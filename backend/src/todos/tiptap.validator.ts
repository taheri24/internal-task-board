import { BadRequestException } from '@nestjs/common';
import type { TipTapDoc } from './tiptap.types';

/** Only these node and mark types are stored. Anything else is rejected. */
const ALLOWED_NODES = new Set(['doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'hardBreak']);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'link']);
const MAX_DEPTH = 12;
const MAX_BYTES = 50_000;

export function isSafeHref(href: unknown): boolean {
  if (typeof href !== 'string') return false;
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Normalises null, undefined and {type:'doc'} to a valid document. Empty documents are allowed. */
export function validateTipTapDoc(value: unknown): TipTapDoc {
  if (value === undefined || value === null) return { type: 'doc', content: [] };
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Description must be a TipTap document object');
  }
  if (JSON.stringify(value).length > MAX_BYTES) {
    throw new BadRequestException('Description is too large');
  }
  const doc = value as { type?: unknown };
  if (doc.type !== 'doc') throw new BadRequestException('Description root must be of type "doc"');
  walk(value, 0);
  return value as TipTapDoc;
}

function walk(node: any, depth: number): void {
  if (depth > MAX_DEPTH) throw new BadRequestException('Description is nested too deeply');
  if (typeof node.type !== 'string' || !ALLOWED_NODES.has(node.type)) {
    throw new BadRequestException(`Unsupported node type: ${String(node.type)}`);
  }
  if (node.type === 'text' && typeof node.text !== 'string') {
    throw new BadRequestException('Text node must contain a string');
  }
  if (node.type === 'heading' && ![1, 2, 3].includes(node.attrs?.level)) {
    throw new BadRequestException('Heading level must be 1, 2 or 3');
  }
  for (const mark of node.marks ?? []) {
    if (!ALLOWED_MARKS.has(mark.type)) throw new BadRequestException(`Unsupported mark: ${String(mark.type)}`);
    if (mark.type === 'link' && !isSafeHref(mark.attrs?.href)) {
      throw new BadRequestException('Links must use http or https');
    }
  }
  for (const child of node.content ?? []) walk(child, depth + 1);
}
