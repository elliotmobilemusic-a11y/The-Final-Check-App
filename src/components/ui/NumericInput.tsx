import React, { useState, useCallback, useEffect, useRef } from 'react';

interface NumericInputProps {
  value: number | string | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
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
  decimalPlaces,
  allowNegative = false,
  className = '',
  inputMode = 'numeric'
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === null || value === undefined || value === '') return '0';
    return String(value);
  });
  
  const isEditingRef = useRef(false);

  // Sync display value when external prop changes ONLY IF NOT actively editing
  useEffect(() => {
    if (isEditingRef.current) return;
    
    if (value === null || value === undefined || value === '') {
      setDisplayValue('0');
    } else {
      setDisplayValue(String(value));
    }
  }, [value]);

  const parseValue = useCallback((input: string): number | null => {
    // Allow partial values during editing - these return null while typing
    if (input === '' || input === '-' || input === '.' || input === '-.') return null;
    
    let clean = input.replace(/[^0-9.\-]/g, '');
    
    // Handle multiple decimal points safely
    const decimalParts = clean.split('.');
    if (decimalParts.length > 2) {
      clean = decimalParts[0] + '.' + decimalParts.slice(1).join('');
    }
    
    if (!allowNegative && clean.startsWith('-')) {
      clean = clean.slice(1);
    }

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
    isEditingRef.current = true;
    let raw = e.target.value;
    
    // Auto replace 0 when first digit is typed
    if (displayValue === '0' && raw.length === 2 && raw[0] === '0' && /[0-9]/.test(raw[1])) {
      raw = raw[1];
    }

    setDisplayValue(raw);
    
    const parsed = parseValue(raw);
    onChange(parsed);
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    
    // Only on blur: if empty, reset to 0
    if (displayValue === '' || displayValue === '-' || displayValue === '.') {
      setDisplayValue('0');
      onChange(0);
      return;
    }
    
    // Format on blur
    const parsed = parseValue(displayValue);
    
    if (parsed === null) {
      setDisplayValue('0');
      onChange(0);
      return;
    }
    
    if (decimalPlaces !== undefined) {
      setDisplayValue(Number(parsed).toFixed(decimalPlaces));
    } else {
      setDisplayValue(String(parsed));
    }
    
    onChange(parsed);
  };

  const handleFocus = () => {
    isEditingRef.current = true;
  };

  return (
    <input
      type="text"
      inputMode={inputMode}
      pattern="[0-9.\-]*"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
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
    />
  );
}

export function QuantityInput(props: Omit<NumericInputProps, 'inputMode' | 'decimalPlaces' | 'step' | 'allowNegative'>) {
  return (
    <NumericInput
      {...props}
      inputMode="numeric"
      decimalPlaces={0}
      allowNegative={false}
    />
  );
}
