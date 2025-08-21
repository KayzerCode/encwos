import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Note } from '../types/note';
import Sidebar from '../components/Sidebar';
import ModalForm from '../components/ModalForm';
import Breadcrumbs from '../components/Breadcrumbs';
import { fetchNotes, createNote, updateNote, deleteNote } from '../services/notes';
import { fetchFolders } from '../services/folders';
import './workspace.css';
import type { Folder, FolderRaw } from '../types/folder';
import { isInSubtreeFlat, pickDefaultFolderIdCached } from '../utils/folderHelpers';

export default function WorkspacePage() {
  // Selected folder id (null = All)
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);

  // All notes (for counts) and visible notes (for main list)
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [visibleNotes, setVisibleNotes] = useState<Note[]>([]);

  // Flat folders for breadcrumbs and subtree checks
  const [folders, setFolders] = useState<Folder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Off-canvas state for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal state for notes
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'create' | 'edit' | 'delete'
    note?: Note
  }>({ isOpen: false, type: 'create' });

  // Refresh key ONLY for breadcrumbs when folder structure changes
  const [foldersRefreshKey, setFoldersRefreshKey] = useState(0);
  const refreshFoldersForBreadcrumbs = useCallback(() => setFoldersRefreshKey(k => k + 1), []);

  /* ------------------------- data load: folders ------------------------- */
  const reloadFolders = useCallback(async () => {
    try {
      const list = await fetchFolders(false);
      const normalized: Folder[] = (list as FolderRaw[]).map(f => ({
        id: typeof f.id === 'string' ? Number(f.id) : f.id,
        name: f.name,
        parentId:
          f.parentId !== undefined
            ? typeof f.parentId === 'string'
              ? Number(f.parentId)
              : f.parentId ?? null
            : typeof f.parent_id === 'string'
              ? Number(f.parent_id)
              : f.parent_id ?? null,
      }));
      setFolders(normalized);
    } catch (e) {
      console.error('Failed to load folders for breadcrumbs:', e);
    }
  }, []);

  useEffect(() => {
    // Load folders on mount and whenever refresh key changes (only for breadcrumbs)
    reloadFolders();
  }, [reloadFolders, foldersRefreshKey]);

  /* -------------------------- data load: notes -------------------------- */
  const recomputeVisible = useCallback(
    (notesArr: Note[], currentFolder: number | null, foldersArr: Folder[]) => {
      if (currentFolder == null) return notesArr.slice().sort((a, b) => b.id - a.id);
      return notesArr
        .filter(n => isInSubtreeFlat(foldersArr, currentFolder, n.folderId))
        .sort((a, b) => b.id - a.id);
    },
    []
  );

  const reloadNotes = useCallback(
    async () => {
      setLoading(true);
      try {
        // All notes (for counts)
        const all = await fetchNotes(undefined, true);
        setAllNotes(all);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [] // ✅ Пустой массив - функция стабильна
  );

  // ✅ Загружаем все заметки только один раз при монтировании
  useEffect(() => {
    (async () => {
      await reloadNotes();
    })();
  }, [reloadNotes]);

  // ✅ При изменении selectedFolder только пересчитываем visibleNotes из уже загруженных allNotes
  useEffect(() => {
    const newVisible = recomputeVisible(allNotes, selectedFolder, folders);
    setVisibleNotes(newVisible);
  }, [selectedFolder, allNotes, folders, recomputeVisible]);

  /* ------------------------------- CRUD -------------------------------- */

  const onCreateNote = () => {
    setModalState({
      isOpen: true,
      type: 'create',
    });
  };

  const onEditNote = (n: Note) => {
    setModalState({
      isOpen: true,
      type: 'edit',
      note: n,
    });
  };

  const onToggleFlag = async (n: Note) => {
    const nextFlag = n.flag ? 0 : 1
    try {
      const updated = await updateNote(n.id, { flag: nextFlag })
      setAllNotes(prev => {
        const next = prev.map(x => (x.id === n.id ? { ...x, flag: updated.flag } : x))
        setVisibleNotes(recomputeVisible(next, selectedFolder, folders))
        return next
      })
    } catch (e) {
      console.error('Toggle flag failed:', e)
      // fallback if needed:
      // await reloadNotes()
    }
  }


  const onDeleteNote = (n: Note) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      note: n,
    });
  };

  const handleModalSubmit = async (values: Record<string, string>) => {
    try {
      if (modalState.type === 'create') {
        const title = values.title?.trim();
        const body = values.body?.trim() || '';

        if (!title) return;

        const folderId = selectedFolder ?? (await pickDefaultFolderIdCached(folders));
        const created = await createNote(folderId, title, body);

        setAllNotes(prev => {
          const newAllNotes = [...prev, created].sort((a, b) => b.id - a.id);
          const newVisible = recomputeVisible(newAllNotes, selectedFolder, folders);
          setVisibleNotes(newVisible);
          return newAllNotes;
        });
      } else if (modalState.type === 'edit' && modalState.note) {
        const title = values.title?.trim();
        const body = values.body?.trim() || '';

        if (!title) return;

        const updated = await updateNote(modalState.note.id, { title, body });

        setAllNotes(prev => {
          const newAllNotes = prev.map(x => (x.id === modalState.note!.id ? updated : x));
          const newVisible = recomputeVisible(newAllNotes, selectedFolder, folders);
          setVisibleNotes(newVisible);
          return newAllNotes;
        });
      } else if (modalState.type === 'delete' && modalState.note) {
        // For delete, we can require typing "DELETE" for confirmation
        const confirmation = values.confirmation?.trim();
        if (confirmation !== 'DELETE') {
          return; // Don't proceed if confirmation doesn't match
        }

        await deleteNote(modalState.note.id);

        setAllNotes(prev => {
          const newAllNotes = prev.filter(x => x.id !== modalState.note!.id);
          const newVisible = recomputeVisible(newAllNotes, selectedFolder, folders);
          setVisibleNotes(newVisible);
          return newAllNotes;
        });
      }

      setModalState({ isOpen: false, type: 'create' });
    } catch (e) {
      console.error(`Failed to ${modalState.type} note:`, e);
      await reloadNotes();
    }
  };

  const handleModalCancel = () => {
    setModalState({ isOpen: false, type: 'create' });
  };

  /* ---------------------------- breadcrumbs ---------------------------- */

  const byId = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);

  const path = useMemo(() => {
    if (!selectedFolder) return [] as Folder[];
    const p: Folder[] = [];
    let cur = byId.get(selectedFolder);
    // climb up by parentId until root
    while (cur) {
      p.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) || undefined : undefined;
    }
    return p;
  }, [byId, selectedFolder]);

  /* ---------------------------- modal config ---------------------------- */

  const getModalConfig = () => {
    switch (modalState.type) {
      case 'create':
        return {
          title: 'Create Note',
          fields: [
            { name: 'title', label: 'Title', type: 'text' as const, required: true, defaultValue: '' },
            { name: 'body', label: 'Content', type: 'textarea' as const, defaultValue: '' },
          ],
          submitLabel: 'Create',
        };
      case 'edit':
        return {
          title: 'Edit Note',
          fields: [
            { name: 'title', label: 'Title', type: 'text' as const, required: true, defaultValue: modalState.note?.title || '' },
            { name: 'body', label: 'Content', type: 'textarea' as const, defaultValue: modalState.note?.body || '' },
          ],
          submitLabel: 'Save',
        };
      case 'delete':
        return {
          title: 'Delete Note',
          fields: [
            {
              name: 'confirmation',
              label: `Are you sure you want to delete "${modalState.note?.title}"?`,
              type: 'text' as const,
              defaultValue: 'This action cannot be undone',
              placeholder: 'Type "DELETE" to confirm'
            }
          ],
          submitLabel: 'Delete',
          cancelLabel: 'Cancel',
        };
      default:
        return null;
    }
  };

  /* -------------------------------- UI --------------------------------- */

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: 'crimson' }}>Error: {error}</p>;

  const modalConfig = getModalConfig();

  return (
    <div className="workspace">
      {/* Backdrop for off-canvas sidebar on mobile */}
      <div
        className={`ws-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar: on mobile slides in; on desktop fixed left column */}
      <aside className={`ws-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          notes={allNotes}
          selected={selectedFolder}
          onSelect={(id: number | null) => {
            setSelectedFolder(id);
            setSidebarOpen(false);
          }}
          refreshKey={0} // ✅ Статичное значение - дерево не перерисовывается извне
          onRefreshFolders={refreshFoldersForBreadcrumbs} // ✅ Только для breadcrumbs
        />
      </aside>

      {/* Main column */}
      <section className="ws-main">
        {/* Mobile toolbar: Folders toggle + breadcrumbs */}
        <div className="ws-toolbar">
          <button className="ghost" onClick={() => setSidebarOpen(true)}>
            ☰ Folders
          </button>
          <Breadcrumbs path={path} />
        </div>

        {/* Desktop breadcrumbs */}
        <div className="ws-breadcrumb-row">
          <Breadcrumbs path={path} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={onCreateNote}
            style={{ backgroundColor: '#517be7', color: '#fff', padding: '8px 12px', borderRadius: '4px' }}>
            <i className="fas fa-plus" />
          </button>
          <button onClick={() => setSelectedFolder(null)}
            style={{ backgroundColor: '#f5f6f8', color: '#333', padding: '8px 12px', borderRadius: '4px' }}>
            <i className="fas fa-folder-open" />
          </button>
          <button onClick={() => reloadNotes()}
            style={{ backgroundColor: '#f5f6f8', color: '#333', padding: '8px 12px', borderRadius: '4px' }}>
            <i className="fas fa-sync" />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {visibleNotes.map(n => (
            <div
              key={n.id}
              style={{
                padding: 8,
                border: '1px solid #ddd',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div className="note-title" style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flexGrow: 1, flexDirection: 'row' }}>
                  <button
                    onClick={() => onEditNote(n)}
                    style={{
                      color: '#517be7',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      border: 'none',
                      padding: '8px 12px', borderRadius: '4px'
                    }}
                  >
                    <i className="fas fa-pencil" />
                  </button>
                  <button
                    onClick={() => onToggleFlag(n)}
                    style={{
                      color: n.flag === 0 ? '#333' : '#f41c04ff',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      border: 'none',
                      padding: '8px 12px', borderRadius: '4px'
                    }}
                  >
                    {n.flag === 0 ? (
                      <i className="fas fa-flag" />
                    ) : (
                      <i className="fas fa-flag-checkered" />
                    )}
                  </button>
                  <span style={{
                    marginLeft: 8,
                    fontWeight: 'bold',
                    color: n.flag === 0 ? '#fff' : '#f41c04ff'
                  }}>
                    {n.title}
                  </span>

                </div>

                <div style={{ display: 'flex', justifyContent: 'right' }}>
                  <span style={{
                    marginRight: 8,
                    color: n.flag === 0 ? '#fff' : '#f41c04ff',
                    marginTop: 4
                  }}>
                    {n.updatedAt && (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Upd: {new Date(n.updatedAt).toLocaleString('ru-RU')}
                      </div>
                    )}
                  </span>
                  <button
                    onClick={() => onDeleteNote(n)}
                    style={{
                      color: '#f41c04ff',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      border: 'none',
                      padding: '8px 12px', borderRadius: '4px'
                    }}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>

              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
            </div>
          ))}
          {visibleNotes.length === 0 && (
            <div style={{ opacity: 0.7 }}>No notes here.</div>
          )}
        </div>
      </section>

      {/* Modal Form */}
      {modalConfig && (
        <ModalForm
          isOpen={modalState.isOpen}
          title={modalConfig.title}
          fields={modalConfig.fields}
          submitLabel={modalConfig.submitLabel}
          cancelLabel={modalConfig.cancelLabel}
          onSubmit={handleModalSubmit}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  );
}
