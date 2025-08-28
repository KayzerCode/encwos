// pages/content/SeedsSection.tsx
import { useState, useEffect, useMemo } from 'react';
import type { SeedGroup, ContentSeed, CreateSeedRequest, UpdateSeedRequest } from '../../types/content';
import { fetchGroups, fetchSeeds, createSeed, updateSeed, deleteSeed, toggleSeedActive } from '../../services/content';
import SeedModal from '../../components/SeedModal';

export default function SeedsSection() {
  const [seeds, setSeeds] = useState<ContentSeed[]>([]);
  const [groups, setGroups] = useState<SeedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeed, setEditingSeed] = useState<ContentSeed | null>(null);

  // Load groups for filters
  useEffect(() => {
    loadGroups();
  }, []);

  // Load seeds when component mounts or group filter changes
  useEffect(() => {
    loadSeeds();
  }, [selectedGroupId]);

  const loadGroups = async () => {
    try {
      const data = await fetchGroups();
      setGroups(data.slice(0, 5)); // Top 5 groups for filters
    } catch (error) {
      console.error('Failed to load groups:', error);
      // Fallback mock data for development
      setGroups([
        { id: 1, name: 'Photography', slug: 'photography', description: 'Camera equipment', seeds_count: 15, created_at: '2025-01-01', updated_at: '2025-01-01' },
        { id: 2, name: 'Electronics', slug: 'electronics', description: 'Tech gadgets', seeds_count: 23, created_at: '2025-01-01', updated_at: '2025-01-01' },
        { id: 3, name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement', seeds_count: 8, created_at: '2025-01-01', updated_at: '2025-01-01' },
        { id: 4, name: 'Sports', slug: 'sports', description: 'Sports equipment', seeds_count: 12, created_at: '2025-01-01', updated_at: '2025-01-01' },
        { id: 5, name: 'Fashion', slug: 'fashion', description: 'Clothing and accessories', seeds_count: 19, created_at: '2025-01-01', updated_at: '2025-01-01' }
      ]);
    }
  };

  const loadSeeds = async () => {
    setLoading(true);
    try {
      const filters = {
        active: true,
        ...(selectedGroupId && { group_id: selectedGroupId })
      };
      const data = await fetchSeeds(filters);
      setSeeds(data);
    } catch (error) {
      console.error('Failed to load seeds:', error);
      // Fallback mock data for development
      setSeeds([
        {
          id: 1,
          seed_phrase: 'vlogging camera',
          slug: 'vlogging-camera',
          seed_group_id: 1,
          active: true,
          seo_data: {
            meta_title: 'Best Vlogging Cameras 2025',
            meta_description: 'Professional cameras for content creators',
            keywords: ['vlog', 'camera', 'youtube']
          },
          products_found: 24,
          last_scraped: '2025-08-25T10:30:00Z',
          created_at: '2025-08-20T09:00:00Z',
          updated_at: '2025-08-25T10:30:00Z',
          group_name: 'Photography'
        },
        {
          id: 2,
          seed_phrase: 'wireless earbuds',
          slug: 'wireless-earbuds',
          seed_group_id: 2,
          active: true,
          seo_data: {
            meta_title: 'Best Wireless Earbuds 2025',
            meta_description: 'Top rated wireless earbuds for every budget',
            keywords: ['earbuds', 'wireless', 'bluetooth']
          },
          products_found: 156,
          last_scraped: '2025-08-24T15:20:00Z',
          created_at: '2025-08-18T14:00:00Z',
          updated_at: '2025-08-24T15:20:00Z',
          group_name: 'Electronics'
        }
      ]);
    }
    setLoading(false);
  };

  const handleCreateSeed = async (data: CreateSeedRequest) => {
    try {
      await createSeed(data);
      setModalOpen(false);
      loadSeeds();
    } catch (error) {
      console.error('Failed to create seed:', error);
      throw error;
    }
  };

  const handleUpdateSeed = async (data: UpdateSeedRequest) => {
    if (!editingSeed) return;

    try {
      await updateSeed(editingSeed.id, data);
      setModalOpen(false);
      setEditingSeed(null);
      loadSeeds();
    } catch (error) {
      console.error('Failed to update seed:', error);
      throw error;
    }
  };

  const handleToggleActive = async (seed: ContentSeed) => {
    try {
      await toggleSeedActive(seed.id);
      loadSeeds();
    } catch (error) {
      console.error('Failed to toggle seed status:', error);
    }
  };

  const handleDeleteSeed = async (seed: ContentSeed) => {
    if (!confirm(`Are you sure you want to delete "${seed.seed_phrase}"?`)) return;

    try {
      await deleteSeed(seed.id);
      loadSeeds();
    } catch (error) {
      console.error('Failed to delete seed:', error);
    }
  };

  const openCreateModal = () => {
    setEditingSeed(null);
    setModalOpen(true);
  };

  const openEditModal = (seed: ContentSeed) => {
    setEditingSeed(seed);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSeed(null);
  };

  const filteredSeeds = useMemo(() => {
    if (!selectedGroupId) return seeds;
    return seeds.filter(seed => seed.seed_group_id === selectedGroupId);
  }, [seeds, selectedGroupId]);

  const allGroups = [{ id: null, name: 'All Groups', seeds_count: seeds.length }, ...groups];

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Content Seeds</h1>
        <button
          className="btn primary"
          onClick={openCreateModal}
        >
          Add New Seed
        </button>
      </header>

      {/* Group filters */}
      <div className="filters">
        {allGroups.map(group => (
          <button
            key={group.id || 'all'}
            className={`filter-btn ${(selectedGroupId === group.id) ? 'active' : ''}`}
            onClick={() => setSelectedGroupId(group.id)}
          >
            {group.name} ({group.seeds_count || 0})
          </button>
        ))}
      </div>

      {/* Seeds table */}
      {loading ? (
        <p>Loading seeds...</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Seed Phrase</th>
                <th>Group</th>
                <th>Products Found</th>
                <th>Last Scraped</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeeds.map(seed => (
                <tr key={seed.id}>
                  <td>
                    <div>
                      <strong>{seed.seed_phrase}</strong>
                      {seed.seo_data.meta_title && (
                        <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                          {seed.seo_data.meta_title}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{seed.group_name}</td>
                  <td>
                    <span className={`badge ${seed.products_found > 50 ? 'success' : seed.products_found > 10 ? 'warning' : 'danger'}`}>
                      {seed.products_found}
                    </span>
                  </td>
                  <td>
                    {seed.last_scraped
                      ? new Date(seed.last_scraped).toLocaleDateString('ru-RU')
                      : 'Never'
                    }
                  </td>
                  <td>
                    <span className={`badge ${seed.active ? 'success' : 'danger'}`}>
                      {seed.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn small secondary"
                        onClick={() => handleToggleActive(seed)}
                      >
                        {seed.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn small primary"
                        onClick={() => openEditModal(seed)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn small danger"
                        onClick={() => handleDeleteSeed(seed)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSeeds.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                    No seeds found for the selected filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit */}
      <SeedModal
        isOpen={modalOpen}
        seed={editingSeed}
        groups={groups}
        onSubmit={editingSeed ? handleUpdateSeed : handleCreateSeed}
        onCancel={closeModal}
      />
    </div>
  );
}