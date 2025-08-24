// comments only in English
import { useState, useEffect, useRef } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
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
  /** Optional image uploader: returns public URL for pasted image files */
  onUploadImage?: (file: File) => Promise<string>;
};

// Create a single Turndown instance (avoid recreating on each render)
const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
td.use(gfm); // tables, strikethrough, task lists

export default function ModalForm({
  isOpen,
  title,
  fields,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  onUploadImage,
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

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // keep disabled to avoid accidental close while selecting
    if (e.target === e.currentTarget) onCancel();
  };

  // === Paste support for textarea (Variant B) ===
  // Converts HTML -> Markdown and inserts at caret; handles pasted images via onUploadImage.
  const handlePasteIntoTextarea = async (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    fieldName: string
  ) => {
    const html = e.clipboardData.getData('text/html');
    const files = e.clipboardData.files;
    const el = e.currentTarget;

    // helper: insert given string at current selection for this field
    const insertAtSelection = (insert: string) => {
      const current = values[fieldName] ?? '';
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const next = current.slice(0, start) + insert + current.slice(end);
      handleChange(fieldName, next);
      // restore caret after state update
      requestAnimationFrame(() => {
        try {
          el.focus();
          const pos = start + insert.length;
          el.setSelectionRange(pos, pos);
        } catch {}
      });
    };

    // 1) If HTML present: convert to Markdown
    if (html) {
      e.preventDefault();
      const md = td.turndown(html);
      insertAtSelection(md);
      return;
    }

    // 2) If image file(s) pasted and we have an uploader, upload first image
    if (files && files.length > 0 && onUploadImage) {
      const img = Array.from(files).find(f => f.type.startsWith('image/'));
      if (img) {
        e.preventDefault();
        try {
          const url = await onUploadImage(img);
          insertAtSelection(`![](${url})`);
        } catch (err) {
          // optional: you may show a toast
          console.error('Image upload failed:', err);
        }
        return;
      }
    }

    // 3) Fallback: allow default plain-text paste
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
                  ref={
                    index === 0
                      ? (firstFieldRef as React.RefObject<HTMLTextAreaElement>)
                      : null
                  }
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  onPaste={(e) => handlePasteIntoTextarea(e, field.name)}
                  placeholder={field.placeholder}
                  className={`field-input ${errors[field.name] ? 'error' : ''}`}
                  rows={12}
                />
              ) : (
                <input
                  id={field.name}
                  ref={
                    index === 0
                      ? (firstFieldRef as React.RefObject<HTMLInputElement>)
                      : null
                  }
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
