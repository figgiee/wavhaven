import React, { useState, useEffect } from 'react';
import Select, { MultiValue, StylesConfig, components, MultiValueProps, OptionProps } from 'react-select';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Option {
  value: string;
  label: string;
  group?: string;
}

interface MultiSelectProps {
  id?: string;
  options: Option[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxMenuHeight?: number;
}

// Custom styles that match your dark theme
const customStyles: StylesConfig<Option, true> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'rgb(38 38 38)', // bg-neutral-800
    borderColor: state.isFocused ? 'rgb(6 182 212)' : 'rgb(64 64 64)', // border-neutral-700 or focus cyan
    borderWidth: '1px',
    borderRadius: '6px',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px rgb(6 182 212)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? 'rgb(6 182 212)' : 'rgb(115 115 115)',
    },
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'rgb(23 23 23)', // bg-neutral-900
    borderRadius: '4px',
    border: '1px solid rgb(64 64 64)', // border-neutral-700
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: 'rgb(245 245 245)', // text-neutral-100
    fontSize: '0.875rem',
    padding: '2px 6px',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: 'rgb(163 163 163)', // text-neutral-400
    '&:hover': {
      backgroundColor: 'rgb(239 68 68)', // bg-red-500
      color: 'white',
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'rgb(38 38 38)', // bg-neutral-800
    border: '1px solid rgb(64 64 64)', // border-neutral-700
    borderRadius: '6px',
    zIndex: 50,
  }),
  menuList: (provided) => ({
    ...provided,
    maxHeight: '200px',
    padding: '4px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'rgb(6 182 212)' // bg-cyan-500
      : state.isFocused 
      ? 'rgb(64 64 64)' // bg-neutral-700
      : 'transparent',
    color: state.isSelected ? 'white' : 'rgb(245 245 245)', // text-neutral-100
    borderRadius: '4px',
    margin: '1px 0',
    '&:active': {
      backgroundColor: 'rgb(8 145 178)', // bg-cyan-600
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgb(163 163 163)', // text-neutral-400
  }),
  input: (provided) => ({
    ...provided,
    color: 'rgb(245 245 245)', // text-neutral-100
  }),
  noOptionsMessage: (provided) => ({
    ...provided,
    color: 'rgb(163 163 163)', // text-neutral-400
  }),
  loadingMessage: (provided) => ({
    ...provided,
    color: 'rgb(163 163 163)', // text-neutral-400
  }),
  group: (provided) => ({
    ...provided,
    paddingTop: '8px',
    paddingBottom: '0px',
  }),
  groupHeading: (provided) => ({
    ...provided,
    color: 'rgb(115 115 115)', // text-neutral-500
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
    paddingLeft: '8px',
    paddingRight: '8px',
  }),
};

// Custom MultiValue component with better pill styling
const CustomMultiValue = (props: MultiValueProps<Option, true>) => {
  const { children, ...rest } = props;
  return (
    <components.MultiValue {...rest}>
      <div className="flex items-center gap-1 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 text-sm">
        {children}
      </div>
    </components.MultiValue>
  );
};

// Custom MultiValueRemove with X icon
const CustomMultiValueRemove = (props: any) => {
  return (
    <components.MultiValueRemove {...props}>
      <X className="h-3 w-3" />
    </components.MultiValueRemove>
  );
};

// Custom Option component with checkbox styling
const CustomOption = (props: OptionProps<Option, true>) => {
  const { children, isSelected, isFocused } = props;
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-4 h-4 border-2 rounded-sm flex items-center justify-center",
          isSelected 
            ? "bg-cyan-500 border-cyan-500 text-white" 
            : "border-neutral-600 bg-transparent"
        )}>
          {isSelected && (
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
          )}
        </div>
        <span className="flex-1">{children}</span>
      </div>
    </components.Option>
  );
};

export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
  isLoading = false,
  maxMenuHeight = 200,
}: MultiSelectProps) {
  // Add hydration-safe state
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Convert string array to Option array for react-select
  const selectedOptions = options.filter(option => value.includes(option.value));

  // Don't render select until client-side hydration is complete
  if (!isMounted) {
    return (
      <div className={cn(
        "min-h-[38px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "flex items-center justify-between",
        className
      )}>
        <span className="text-muted-foreground">{placeholder}</span>
        {value.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
              {value.length} selected
            </span>
          </div>
        )}
      </div>
    );
  }

  // Handle change from react-select
  const handleChange = (newValue: MultiValue<Option>) => {
    const values = newValue.map(option => option.value);
    onChange(values);
  };

  // Group options if they have group property
  const groupedOptions = options.reduce((acc, option) => {
    if (option.group) {
      if (!acc[option.group]) {
        acc[option.group] = [];
      }
      acc[option.group].push(option);
    } else {
      if (!acc['']) {
        acc[''] = [];
      }
      acc[''].push(option);
    }
    return acc;
  }, {} as Record<string, Option[]>);

  // Convert to react-select format
  const selectOptions = Object.keys(groupedOptions).length > 1 && groupedOptions[''] === undefined
    ? Object.entries(groupedOptions).map(([group, opts]) => ({
        label: group,
        options: opts,
      }))
    : options;

  return (
    <div className={className}>
      <Select<Option, true>
        id={id}
        isMulti
        options={selectOptions}
        value={selectedOptions}
        onChange={handleChange}
        placeholder={placeholder}
        noOptionsMessage={({ inputValue }) => 
          inputValue ? `No options found for "${inputValue}"` : "No options available"
        }
        styles={customStyles}
        components={{
          MultiValue: CustomMultiValue,
          MultiValueRemove: CustomMultiValueRemove,
          Option: CustomOption,
        }}
        isDisabled={disabled}
        isLoading={isLoading}
        isClearable={false}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        menuPlacement="auto"
        maxMenuHeight={maxMenuHeight}
        filterOption={(option, inputValue) => {
          if (!inputValue) return true;
          const searchIn = `${option.label} ${option.data.group || ''}`.toLowerCase();
          return searchIn.includes(inputValue.toLowerCase());
        }}
        classNamePrefix="react-select"
      />
    </div>
  );
} 