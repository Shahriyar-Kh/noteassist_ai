// useFormValidation.js - Form Validation Hook
// Comprehensive validation, state management, and error handling

import { useState, useCallback } from 'react';

/**
 * Form validation rules
 */
const validators = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return '';
  },

  password: (value, minLength = 8) => {
    if (!value) return 'Password is required';
    if (value.length < minLength) return `Password must be at least ${minLength} characters`;
    return '';
  },

  username: (value) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username can only contain letters, numbers, underscores, and hyphens';
    return '';
  },

  name: (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    return '';
  },

  url: (value) => {
    try {
      new URL(value);
      return '';
    } catch {
      return 'Please enter a valid URL';
    }
  },

  phone: (value) => {
    const phoneRegex = /^[\d\s\-()+]+$/;
    if (!value) return 'Phone number is required';
    if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
    return '';
  },

  required: (value, fieldName = 'This field') => {
    return !value ? `${fieldName} is required` : '';
  },

  minLength: (value, length) => {
    return value.length < length ? `Must be at least ${length} characters` : '';
  },

  maxLength: (value, length) => {
    return value.length > length ? `Must not exceed ${length} characters` : '';
  },

  match: (value, compareValue, fieldName = 'Values') => {
    return value !== compareValue ? `${fieldName} do not match` : '';
  },
};

/**
 * Custom validation rules builder
 */
export const createValidator = (customRules = {}) => ({
  ...validators,
  ...customRules,
});

/**
 * useFormValidation Hook
 * @param {Object} initialValues - Initial form values
 * @param {Function} onSubmit - Form submission handler
 * @param {Object} validationRules - Field validation rules
 * @returns {Object} Form state, handlers, and utilities
 */
export const useFormValidation = (
  initialValues = {},
  onSubmit,
  validationRules = {}
) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Validate single field
  const validateField = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return '';

    if (typeof rules === 'function') {
      return rules(value);
    }

    if (Array.isArray(rules)) {
      for (const rule of rules) {
        if (typeof rule === 'function') {
          const error = rule(value);
          if (error) return error;
        }
      }
    }

    return '';
  }, [validationRules]);

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) newErrors[fieldName] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules, validateField]);

  // Handle field change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setValues((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Validate field on change
    if (touched[name]) {
      const error = validateField(name, fieldValue);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  }, [touched, validateField]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const error = validateField(name, values[name]);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, [values, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error.message || 'An error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, onSubmit]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError('');
  }, [initialValues]);

  // Set field value programmatically
  const setFieldValue = useCallback((fieldName, value) => {
    setValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((fieldName, error) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  }, []);

  // Set multiple field values
  const setFieldValues = useCallback((newValues) => {
    setValues((prev) => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  // Check if form has errors
  const hasErrors = Object.keys(errors).length > 0;

  // Check if form is valid
  const isValid = !hasErrors && Object.keys(touched).length > 0;

  // Check if a field has been touched
  const isTouched = (fieldName) => touched[fieldName] || false;

  // Get field state
  const getFieldProps = (fieldName) => ({
    name: fieldName,
    value: values[fieldName] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: touched[fieldName] ? errors[fieldName] : '',
  });

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    setFieldValues,
    validateField,
    validateForm,
    hasErrors,
    isValid,
    isTouched,
    getFieldProps,
  };
};

// Export validators and hook
export { validators };
export default useFormValidation;
