import { SelectSheet, type SelectSheetOption } from './SelectSheet'

export type SelectOption = SelectSheetOption

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  sheetTitle?: string
  error?: string
  disabled?: boolean
  size?: 'md' | 'sm'
  searchable?: boolean
  leadingIcon?: string
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  sheetTitle,
  error,
  disabled,
  size = 'md',
  searchable,
  leadingIcon,
  className = '',
}: SelectProps) {
  return (
    <div className={className}>
      <SelectSheet
        value={value}
        onChange={onChange}
        options={options}
        label={label}
        placeholder={placeholder}
        sheetTitle={sheetTitle}
        error={error}
        disabled={disabled}
        size={size}
        searchable={searchable}
        leadingIcon={leadingIcon}
      />
    </div>
  )
}
