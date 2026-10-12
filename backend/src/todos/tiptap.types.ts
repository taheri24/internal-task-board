export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: TipTapMark[];
  content?: TipTapNode[];
}

export interface TipTapDoc {
  type: 'doc';
  content?: TipTapNode[];
}
