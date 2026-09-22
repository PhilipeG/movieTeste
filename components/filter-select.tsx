"use client"

import { Fragment } from "react"
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition,
} from "@headlessui/react"
import { ChevronDown, Check, type LucideIcon } from "lucide-react"

export interface FilterOption<T extends string | number> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  value: T[]
  onChange: (value: T[]) => void
  options: FilterOption<T>[]
  icon: LucideIcon
  placeholder: string
}

export function FilterSelect<T extends string | number>({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder,
}: Props<T>) {
  const selected = options.filter((opt) => value.includes(opt.value))
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0].label
        : `${selected[0].label} +${selected.length - 1}`

  return (
    <div className="relative">
      <Listbox value={value} onChange={onChange} multiple>
        <ListboxButton className="relative w-full cursor-pointer bg-secondary/50 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-left text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all hover:bg-secondary/70">
          <span className="block truncate text-foreground flex items-center gap-2">
            <span className={`text-muted-foreground ${value.length > 0 ? "text-primary" : ""}`}>
              <Icon className="w-4 h-4" />
            </span>
            {summary}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions
            modal={false}
            className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 py-1 text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 custom-scrollbar"
          >
            {/* Limpar seleção — fora do Listbox para não virar uma opção selecionável */}
            <button
              type="button"
              onClick={() => onChange([])}
              className={`w-full text-left cursor-pointer select-none py-2 pl-10 pr-4 transition-colors hover:bg-primary/20 ${
                value.length === 0 ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <ListboxOption
                key={String(opt.value)}
                value={opt.value}
                className={({ focus }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${
                    focus ? "bg-primary/20 text-primary" : "text-foreground"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium text-primary" : "font-normal"
                      }`}
                    >
                      {opt.label}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </Listbox>
    </div>
  )
}
