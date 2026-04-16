import type { ChangeEvent, InputHTMLAttributes } from 'react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function FormInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  id,
  disabled,
  ...rest
}: FormInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-charcoal">
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={[
          'w-full rounded-xl border bg-white px-4 py-2.5 text-charcoal',
          'placeholder:text-charcoal-300 focus:outline-none focus:ring-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-pink focus:ring-pink/40'
            : 'border-indigo/30 focus:ring-indigo/40',
        ].join(' ')}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-pink">
          {error}
        </p>
      )}
    </div>
  );
}
