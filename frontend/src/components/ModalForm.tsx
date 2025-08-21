import { useState, useEffect, useRef } from 'react';
import './ModalForm.css';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'textarea';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
};

type Props = {
  isOpen: boolean;
  title: string;
  fields: Field[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
};

export default function ModalForm({
  isOpen,
  title,
  fields,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<string, string> = {};
      fields.forEach(field => {
        initialValues[field.name] = field.defaultValue || '';
      });
      setValues(initialValues);
      setErrors({});

      // Focus first field after a small delay to ensure modal is rendered
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 100);
    }
  }, [isOpen, fields]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      if (field.required && !values[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(values);
  };

  const handleChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    console.log('Backdrop clicked:', e.target);

    /* if (e.target === e.currentTarget) {
      onCancel();
    } */
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-form">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          {fields.map((field, index) => (
            <div key={field.name} className="form-field">
              <label htmlFor={field.name} className="field-label">
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  ref={index === 0 ? firstFieldRef as React.RefObject<HTMLTextAreaElement> : null}
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={`field-input ${errors[field.name] ? 'error' : ''}`}
                  rows={12}
                />
              ) : (
                <input
                  id={field.name}
                  ref={index === 0 ? firstFieldRef as React.RefObject<HTMLInputElement> : null}
                  type="text"
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={`field-input ${errors[field.name] ? 'error' : ''}`}
                />
              )}

              {errors[field.name] && (
                <span className="field-error">{errors[field.name]}</span>
              )}
            </div>
          ))}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}