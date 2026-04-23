import React, { useState, useCallback } from 'react';

interface NumericInputProps {
  value: number | string | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  decimalPlaces?: number;
  allowNegative?: boolean;
  className?: string;
  inputMode?: 'numeric' | 'decimal';
}

export function NumericInput({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  min,
  max,
  step = 1,
  decimalPlaces,
  allowNegative = false,
  className = '',
  inputMode = 'numeric'
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  });

  const parseValue = useCallback((input: string): number | null => {
    let clean = input.replace(/[^0-9.\-]/g, '');
    
    if (!allowNegative && clean.startsWith('-')) {
      clean = clean.slice(1);
    }

    if (clean === '' || clean === '-' || clean === '.') return null;
    
    const parsed = parseFloat(clean);
    
    if (Number.isNaN(parsed)) return null;
    
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    
    if (decimalPlaces !== undefined) {
      return Number(parsed.toFixed(decimalPlaces));
    }
    
    return parsed;
  }, [min, max, decimalPlaces, allowNegative]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    
    const parsed = parseValue(raw);
    onChange(parsed);
  };

  const handleBlur = () => {
    if (value === null || value === undefined) {
      setDisplayValue('');
      return;
    }
    
    if (decimalPlaces !== undefined) {
      setDisplayValue(Number(value).toFixed(decimalPlaces));
    } else {
      setDisplayValue(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode={inputMode}
      pattern="[0-9.\-]*"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`input ${className}`}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
    />
  );
}

export function CurrencyInput(props: Omit<NumericInputProps, 'inputMode' | 'decimalPlaces' | 'step' | 'allowNegative'>) {
  return (
    <NumericInput
      {...props}
      inputMode="decimal"
      decimalPlaces={2}
      step={0.01}
      allowNegative={false}
    />
  );
}

export function PercentageInput(props: Omit<NumericInputProps, 'inputMode' | 'min' | 'max' | 'decimalPlaces' | 'step'>) {
  return (
    <NumericInput
      {...props}
      inputMode="decimal"
      min={0}
      max={100}
      decimalPlaces={1}
      step={0.1}
    />
  );
}

export function QuantityInput(props: Omit<NumericInputProps, 'inputMode' | 'decimalPlaces' | 'step' | 'allowNegative'>) {
  return (
    <NumericInput
      {...props}
      inputMode="numeric"
      decimalPlaces={0}
      step={1}
      allowNegative={false}
    />
  );
}