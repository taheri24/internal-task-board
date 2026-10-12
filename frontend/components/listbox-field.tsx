'use client';

import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}

/** Headless UI Listbox. Keyboard navigation and labelling are handled by the library. */
export function ListboxField({ label, value, options, onChange, disabled = false, hideLabel = false }: Props) {
  const current = options.find((o) => o.value === value);

  return (
    <Listbox as="div" className="relative" value={value} onChange={onChange} disabled={disabled}>
      <Label className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-semibold text-ink'}>{label}</Label>
      <ListboxButton
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2 text-start text-sm text-ink
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:bg-paper disabled:text-muted"
      >
        <span className="truncate">{current?.label ?? '—'}</span>
        <ChevronUpDownIcon className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </ListboxButton>
      <ListboxOptions
        anchor="bottom start"
        className="z-[60] mt-1 max-h-64 w-[var(--button-width)] overflow-auto rounded-md border border-line bg-white p-1 text-sm shadow-lg focus:outline-none"
      >
        {options.map((o) => (
          <ListboxOption
            key={o.value || '__all'}
            value={o.value}
            className="flex cursor-pointer items-center justify-between gap-2 rounded px-3 py-2 data-[focus]:bg-accent-soft data-[selected]:font-semibold"
          >
            {({ selected }) => (
              <>
                <span>{o.label}</span>
                {selected && <CheckIcon className="size-4 text-accent" aria-hidden="true" />}
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
