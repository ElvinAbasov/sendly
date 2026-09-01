interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="toggle">
      {label && <span className="toggle__label">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle__track ${checked ? 'toggle__track--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__thumb" />
      </button>
    </label>
  )
}
