// pages/content/GroupsSection.tsx
import { useState, useEffect } from 'react';
import type { SeedGroup, CreateGroupRequest, UpdateGroupRequest } from '../../types/content';
import { fetchGroups, createGroup, updateGroup, deleteGroup } from '../../services/content';

export default function GroupsSection() {
  const [groups, setGroups] = useState<SeedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SeedGroup | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
      // Fallback mock data for development
      setGroups([
        {
          id: 1,
          name: 'Photography Equipment',
          slug: 'photography-equipment',
          description: 'All camera and photo related seeds',
          seeds_count: 15,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-08-20T14:30:00Z'
        },
        {
          id: 2,
          name: 'Electronics & Gadgets',
          slug: 'electronics-gadgets',
          description: 'Consumer electronics, smartphones, laptops, etc.',
          seeds_count: 23,
          created_at: '2025-01-10T09:00:00Z',
          updated_at: '2025-08-25T11:20:00Z'
        },
        {
          id: 3,
          name: 'Home & Garden',
          slug: 'home-garden',
          description: 'Home improvement, gardening tools, furniture',
          seeds_count: 8,
          created_at: '2025-02-01T15:30:00Z',
          updated_at: '2025-08-18T16:45:00Z'
        },
        {
          id: 4,
          name: 'Sports & Fitness',
          slug: 'sports-fitness',
          description: 'Sports equipment, fitness gear, outdoor activities',
          seeds_count: 12,
          created_at: '2025-02-05T12:00:00Z',
          updated_at: '2025-08-22T10:15:00Z'
        },
        {
          id: 5,
          name: 'Fashion & Style',
          slug: 'fashion-style',
          description: 'Clothing, shoes, accessories, beauty products',
          seeds_count: 19,
          created_at: '2025-01-20T11:30:00Z',
          updated_at: '2025-08-24T13:10:00Z'
        }
      ]);
    }
    setLoading(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    const groupData: CreateGroupRequest = {
      name: formData.name,
      description: formData.description
    };

    try {
      await createGroup(groupData);
      setShowCreateForm(false);
      resetForm();
      loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    const groupData: UpdateGroupRequest = {
      name: formData.name,
      description: formData.description
    };

    try {
      await updateGroup(editingGroup.id, groupData);
      setEditingGroup(null);
      resetForm();
      loadGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDeleteGroup = async (group: SeedGroup) => {
    if (group.seeds_count > 0) {
      alert('Cannot delete group with existing seeds. Please move or delete all seeds first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${group.name}"?`)) return;

    try {
      await deleteGroup(group.id);
      loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const startEdit = (group: SeedGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setEditingGroup(null);
  };

  const isEditing = editingGroup !== null;

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Content Groups</h1>
        <button
          className="btn primary"
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
        >
          Add New Group
        </button>
      </header>

      {/* Create/Edit form */}
      {showCreateForm && (
        <form
          onSubmit={isEditing ? handleEditGroup : handleCreateGroup}
          className="grid gap grid-2"
          style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '0.375rem' }}
        >
          <h3 style={{ gridColumn: 'span 2', margin: '0 0 1rem 0' }}>
            {isEditing ? `Edit Group: ${editingGroup.name}` : 'Create New Group'}
          </h3>

          <label className="field">
            <span className="label">Group Name</span>
            <input
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Photography Equipment"
              required
            />
          </label>

          <label className="field">
            <span className="label">Description</span>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of this group..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </label>

          <div className="col-span-2">
            <button type="submit" className="btn primary">
              {isEditing ? 'Update Group' : 'Create Group'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {setShowCreateForm(false); resetForm();}}
              style={{ marginLeft: '0.5rem' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Groups grid */}
      {loading ? (
        <p>Loading groups...</p>
      ) : (
        <div className="grid gap grid-2">
          {groups.map(group => (
            <div
              key={group.id}
              style={{
                padding: '1.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.5rem',
                background: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
                    {group.name}
                  </h3>
                  <span className="badge success" style={{ fontSize: '0.75rem' }}>
                    {group.seeds_count} seeds
                  </span>
                </div>
                <div className="actions">
                  <button
                    className="btn small primary"
                    onClick={() => startEdit(group)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn small danger"
                    onClick={() => handleDeleteGroup(group)}
                    disabled={group.seeds_count > 0}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p style={{ color: '#6c757d', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {group.description || 'No description provided'}
              </p>

              <div style={{ fontSize: '0.75rem', color: '#adb5bd' }}>
                <div>Slug: <code>{group.slug}</code></div>
                <div style={{ marginTop: '0.25rem' }}>
                  Created: {new Date(group.created_at).toLocaleDateString('ru-RU')}
                </div>
                <div style={{ marginTop: '0.25rem' }}>
                  Updated: {new Date(group.updated_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
              <h3>No groups found</h3>
              <p>Create your first content group to get started organizing your seeds.</p>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      {!loading && groups.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '0.375rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Statistics</h3>
          <div className="grid gap grid-2">
            <div>
              <strong>Total Groups:</strong> {groups.length}
            </div>
            <div>
              <strong>Total Seeds:</strong> {groups.reduce((sum, group) => sum + group.seeds_count, 0)}
            </div>
            <div>
              <strong>Largest Group:</strong> {groups.reduce((max, group) => group.seeds_count > max.seeds_count ? group : max, groups[0]).name} ({groups.reduce((max, group) => Math.max(max, group.seeds_count), 0)} seeds)
            </div>
            <div>
              <strong>Average Seeds per Group:</strong> {Math.round(groups.reduce((sum, group) => sum + group.seeds_count, 0) / groups.length)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}