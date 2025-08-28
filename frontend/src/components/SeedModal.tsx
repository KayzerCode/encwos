// components/SeedModal.tsx
import { useState, useEffect } from 'react';
import type { ContentSeed, SeedGroup, CreateSeedRequest, UpdateSeedRequest } from '../types/content';

interface SeedModalProps {
  isOpen: boolean;
  seed?: ContentSeed | null;
  groups: SeedGroup[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function SeedModal({ isOpen, seed, groups, onSubmit, onCancel }: SeedModalProps) {
  const [formData, setFormData] = useState({
    seed_phrase: '',
    seed_group_id: '',
    meta_title: '',
    meta_description: '',
    keywords: '',
    active: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (seed) {
      setFormData({
        seed_phrase: seed.seed_phrase,
        seed_group_id: seed.seed_group_id.toString(),
        meta_title: seed.seo_data.meta_title || '',
        meta_description: seed.seo_data.meta_description || '',
        keywords: seed.seo_data.keywords?.join(', ') || '',
        active: seed.active
      });
    } else {
      setFormData({
        seed_phrase: '',
        seed_group_id: '',
        meta_title: '',
        meta_description: '',
        keywords: '',
        active: true
      });
    }
  }, [seed, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (seed) {
        // Editing existing seed - only send changed fields
        const updateData: UpdateSeedRequest = {
          seed_phrase: formData.seed_phrase,
          seed_group_id: parseInt(formData.seed_group_id),
          active: formData.active,
          seo_data: {
            meta_title: formData.meta_title || undefined,
            meta_description: formData.meta_description || undefined,
            keywords: formData.keywords
              ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
              : undefined
          }
        };
        await onSubmit(updateData);
      } else {
        // Creating new seed - all required fields must be present
        const createData: CreateSeedRequest = {
          seed_phrase: formData.seed_phrase,
          seed_group_id: parseInt(formData.seed_group_id),
          seo_data: {
            meta_title: formData.meta_title || undefined,
            meta_description: formData.meta_description || undefined,
            keywords: formData.keywords
              ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
              : undefined
          }
        };
        await onSubmit(createData);
      }
    } catch (error) {
      console.error('Failed to submit seed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!seed;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '2rem',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 1.5rem 0' }}>
          {isEditing ? `Edit Seed: ${seed.seed_phrase}` : 'Create New Seed'}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap">
          <div className="grid grid-2 gap">
            <label className="field">
              <span className="label">Seed Phrase *</span>
              <input
                value={formData.seed_phrase}
                onChange={e => setFormData({...formData, seed_phrase: e.target.value})}
                placeholder="e.g. wireless earbuds"
                required
              />
            </label>

            <label className="field">
              <span className="label">Group *</span>
              <select
                value={formData.seed_group_id}
                onChange={e => setFormData({...formData, seed_group_id: e.target.value})}
                required
              >
                <option value="">Select group...</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="label">SEO Title</span>
            <input
              value={formData.meta_title}
              onChange={e => setFormData({...formData, meta_title: e.target.value})}
              placeholder="Best Wireless Earbuds 2025"
            />
          </label>

          <label className="field">
            <span className="label">SEO Description</span>
            <textarea
              value={formData.meta_description}
              onChange={e => setFormData({...formData, meta_description: e.target.value})}
              placeholder="Top rated wireless earbuds for every budget..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </label>

          <label className="field">
            <span className="label">Keywords (comma separated)</span>
            <input
              value={formData.keywords}
              onChange={e => setFormData({...formData, keywords: e.target.value})}
              placeholder="earbuds, wireless, bluetooth"
            />
          </label>

          {isEditing && (
            <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData({...formData, active: e.target.checked})}
              />
              <span className="label">Active</span>
            </label>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Seed' : 'Create Seed')}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}