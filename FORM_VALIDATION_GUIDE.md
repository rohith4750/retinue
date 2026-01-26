# ✅ Global Form Validation System

A reusable, global-level form validation system with error messages displayed below input fields.

## 📦 What Was Created

### **1. Validation Utilities** (`lib/form-validation.ts`)
- `validateField()` - Validates a single field against rules
- `validateForm()` - Validates entire form
- `hasErrors()` - Checks if form has any errors
- `bookingValidationRules` - Pre-configured rules for booking forms

### **2. Form Components** (`components/`)
- **`FormInput.tsx`** - Input component with error display
- **`FormSelect.tsx`** - Select component with error display
- **`FormTextarea.tsx`** - Textarea component with error display
- **`FormComponents.tsx`** - Single export file for all components

### **3. Validation Hook** (`hooks/useFormValidation.ts`)
- `useFormValidation()` - React hook for form state and validation
- Handles field updates, validation, error tracking, and touched state

## 🚀 Usage

### Basic Example

```tsx
import { FormInput, FormSelect } from '@/components/FormComponents'
import { useFormValidation } from '@/hooks/useFormValidation'
import { bookingValidationRules } from '@/lib/form-validation'

function MyForm() {
  const {
    formData,
    errors,
    updateField,
    validate,
    handleBlur,
    getError,
  } = useFormValidation(initialData, bookingValidationRules)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors')
      return
    }
    // Submit form
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Guest Name *"
        value={formData.guestName}
        onChange={(e) => updateField('guestName', e.target.value)}
        onBlur={() => handleBlur('guestName')}
        error={getError('guestName')}
      />
      
      <FormSelect
        label="Payment Mode *"
        value={formData.paymentMode}
        onChange={(e) => updateField('paymentMode', e.target.value)}
        options={[
          { value: 'CASH', label: 'Cash' },
          { value: 'CARD', label: 'Card' },
        ]}
      />
    </form>
  )
}
```

## 📋 Validation Rules

### Available Rule Types

```typescript
{
  required?: boolean              // Field is required
  minLength?: number              // Minimum string length
  maxLength?: number              // Maximum string length
  pattern?: RegExp                // Regex pattern
  patternMessage?: string         // Custom pattern error message
  email?: boolean                 // Must be valid email
  phone?: boolean                 // Must be 10 digits
  date?: boolean                  // Must be valid date
  number?: boolean                // Must be valid number
  min?: number                    // Minimum number value
  max?: number                    // Maximum number value
  custom?: (value: any) => string | null  // Custom validation function
}
```

### Example Rules

```typescript
const myRules: ValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  email: {
    required: true,
    email: true,
  },
  phone: {
    required: true,
    phone: true,  // 10 digits
  },
  age: {
    required: true,
    number: true,
    min: 18,
    max: 100,
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[A-Z])(?=.*[0-9])/,
    patternMessage: 'Password must contain uppercase and number',
  },
  customField: {
    required: true,
    custom: (value) => {
      if (value === 'invalid') {
        return 'This value is not allowed'
      }
      return null
    },
  },
}
```

## 🎨 Features

### ✅ Real-time Validation
- Validates on blur (when user leaves field)
- Shows errors immediately
- Clears errors when user starts typing

### ✅ Visual Feedback
- Red border on invalid fields
- Error message below field with icon
- Helper text support

### ✅ Form-wide Validation
- `validate()` function validates entire form
- Returns `true` if valid, `false` if errors
- Marks all fields as touched

### ✅ Custom Validation
- Support for custom validation functions
- Cross-field validation (e.g., checkOut > checkIn)
- Pattern matching with custom messages

## 📝 Component Props

### FormInput
```typescript
<FormInput
  label="Field Label"           // Label text
  type="text"                   // Input type
  value={value}                 // Field value
  onChange={(e) => ...}         // Change handler
  onBlur={() => ...}            // Blur handler (for validation)
  error={errorMessage}          // Error message to display
  helperText="Helper text"       // Optional helper text
  placeholder="Placeholder"      // Placeholder text
  // ... all standard input props
/>
```

### FormSelect
```typescript
<FormSelect
  label="Field Label"
  value={value}
  onChange={(e) => ...}
  onBlur={() => ...}
  error={errorMessage}
  options={[
    { value: 'val1', label: 'Label 1' },
    { value: 'val2', label: 'Label 2' },
  ]}
  // ... all standard select props
/>
```

### FormTextarea
```typescript
<FormTextarea
  label="Field Label"
  value={value}
  onChange={(e) => ...}
  onBlur={() => ...}
  error={errorMessage}
  rows={3}
  // ... all standard textarea props
/>
```

## 🔧 Hook API

### useFormValidation Hook

```typescript
const {
  formData,           // Current form data
  errors,             // All validation errors
  touched,            // Fields that have been touched
  updateField,        // Update a field value
  validate,           // Validate entire form
  validateSingleField, // Validate single field
  handleBlur,         // Handle field blur (validates)
  reset,              // Reset form to initial state
  getError,           // Get error for specific field
  isTouched,          // Check if field is touched
  setFormData,        // Set entire form data
  hasErrors,          // Boolean: form has errors
} = useFormValidation(initialData, validationRules)
```

## 📍 Where It's Used

Currently implemented in:
- ✅ `app/bookings/new/page.tsx` - New booking form

Can be used in:
- Room creation/editing forms
- Staff management forms
- Inventory forms
- Any other forms in the application

## 🎯 Benefits

1. **Consistent UX** - All forms have the same validation behavior
2. **Reusable** - Write once, use everywhere
3. **Type-safe** - Full TypeScript support
4. **Customizable** - Easy to add new validation rules
5. **User-friendly** - Clear error messages below fields
6. **Real-time** - Immediate feedback as user types

## 🔄 Migration Guide

### Before:
```tsx
<input
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  className="form-input"
/>
```

### After:
```tsx
<FormInput
  label="Name *"
  value={formData.name}
  onChange={(e) => updateField('name', e.target.value)}
  onBlur={() => handleBlur('name')}
  error={getError('name')}
/>
```

## ✅ Next Steps

To use in other forms:
1. Import the hook and components
2. Define validation rules
3. Use `useFormValidation` hook
4. Replace inputs with `FormInput`, `FormSelect`, `FormTextarea`
5. Add `onBlur` handlers for validation
6. Call `validate()` before form submission

---

**Status:** ✅ Global validation system ready to use across the entire application!
