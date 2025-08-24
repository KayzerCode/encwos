// ModalForm.tsx
// comments only in English
import { useState, useEffect, useRef } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import './ModalForm.css';
import NoteMarkdown from './NoteMarkdown';

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

// Single Turndown instance
const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
td.use(gfm);

// Simple detector for raw HTML strings
const looksLikeHTML = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

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
  // per-textarea mode: 'edit' | 'preview'
  const [modes, setModes] = useState<Record<string, 'edit' | 'preview'>>({});
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<string, string> = {};
      const initialModes: Record<string, 'edit' | 'preview'> = {};
      fields.forEach(field => {
        initialValues[field.name] = field.defaultValue || '';
        if (field.type === 'textarea') initialModes[field.name] = 'edit';
      });
      setValues(initialValues);
      setModes(initialModes);
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

    // Validate required
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

    // As a safety net: convert raw HTML to MD for textarea fields
    const v: Record<string, string> = { ...values };
    fields.forEach(f => {
      if (f.type === 'textarea') {
        const val = v[f.name];
        if (typeof val === 'string' && looksLikeHTML(val)) {
          v[f.name] = td.turndown(val);
        }
      }
    });

    onSubmit(v);
  };

  const handleChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const toggleMode = (name: string) => {
    setModes(prev => ({
      ...prev,
      [name]: prev[name] === 'edit' ? 'preview' : 'edit',
    }));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Protect from accidental close while selecting
    if (e.target === e.currentTarget) onCancel();
  };

  // Paste support for textarea (Variant B)
  const handlePasteIntoTextarea = async (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    fieldName: string
  ) => {
    const html = e.clipboardData.getData('text/html');
    const files = e.clipboardData.files;
    const el = e.currentTarget;

    const insertAtSelection = (insert: string) => {
      const current = values[fieldName] ?? '';
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const next = current.slice(0, start) + insert + current.slice(end);
      handleChange(fieldName, next);
      requestAnimationFrame(() => {
        try {
          el.focus();
          const pos = start + insert.length;
          el.setSelectionRange(pos, pos);
        } catch {}
      });
    };

    // 1) HTML present -> convert to MD
    if (html) {
      e.preventDefault();
      const md = td.turndown(html);
      insertAtSelection(md);
      return;
    }

    // 2) Pasted image -> upload & insert ![](url)
    if (files && files.length > 0 && onUploadImage) {
      const img = Array.from(files).find(f => f.type.startsWith('image/'));
      if (img) {
        e.preventDefault();
        try {
          const url = await onUploadImage(img);
          insertAtSelection(`![](${url})`);
        } catch (err) {
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
          {fields.map((field, index) => {
            const value = values[field.name] || '';
            const isTextarea = field.type === 'textarea';
            const mode = modes[field.name] ?? 'edit';

            return (
              <div key={field.name} className="form-field">
                <label htmlFor={field.name} className="field-label">
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>

                {isTextarea ? (
                  <>
                    <div className="field-toolbar">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => toggleMode(field.name)}
                        aria-label="Toggle preview"
                        title={mode === 'edit' ? 'Show preview' : 'Edit'}
                      >
                        {mode === 'edit' ? 'Preview' : 'Edit'}
                      </button>
                    </div>

                    {mode === 'edit' ? (
                      <textarea
                        id={field.name}
                        ref={
                          index === 0
                            ? (firstFieldRef as React.RefObject<HTMLTextAreaElement>)
                            : null
                        }
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        onPaste={(e) => handlePasteIntoTextarea(e, field.name)}
                        placeholder={field.placeholder}
                        className={`field-input ${errors[field.name] ? 'error' : ''}`}
                        rows={12}
                      />
                    ) : (
                      <div className={`field-preview ${errors[field.name] ? 'error' : ''}`}>
                        <NoteMarkdown source={value} />
                      </div>
                    )}
                  </>
                ) : (
                  <input
                    id={field.name}
                    ref={
                      index === 0
                        ? (firstFieldRef as React.RefObject<HTMLInputElement>)
                        : null
                    }
                    type="text"
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className={`field-input ${errors[field.name] ? 'error' : ''}`}
                  />
                )}

                {errors[field.name] && (
                  <span className="field-error">{errors[field.name]}</span>
                )}
              </div>
            );
          })}

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
