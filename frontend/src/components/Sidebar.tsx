import { useEffect, useMemo, useState } from 'react'
import type { Folder } from '../types/folder'
import type { Note } from '../types/note'
import { fetchFolders, createFolder, renameFolder, deleteFolder } from '../services/folders'
import ModalForm from './ModalForm'

type TreeNode = Folder & { children?: TreeNode[] }

type Props = {
  notes: Note[]
  selected: number | null
  onSelect: (folderId: number | null) => void
  refreshKey: number              // ✅ Игнорируется чтобы избежать ненужных перезагрузок
  onRefreshFolders: () => void    // ✅ Используется только для обновления breadcrumbs в родителе
}

export default function Sidebar({
  notes,
  selected,
  onSelect,
  refreshKey: _refreshKey,        // ✅ Явно игнорируется
  onRefreshFolders,
}: Props) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1])) // expand root (id=1) by default

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'create' | 'rename'
    parentId?: number | null
    folderId?: number
    currentName?: string
  }>({ isOpen: false, type: 'create' })

  // ✅ Загружаем дерево ТОЛЬКО один раз при монтировании
  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          const t = (await fetchFolders(true)) as TreeNode[] // tree mode
          if (alive) setTree(t)
        } catch (e) {
          if (alive) setError((e as Error).message)
        }
      })()
    return () => {
      alive = false
    }
  }, []) // ✅ Пустой массив зависимостей - загрузка только при монтировании

  // Direct counts from notes (only within the folder itself)
  const directCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const n of notes) map.set(n.folderId, (map.get(n.folderId) ?? 0) + 1)
    return map
  }, [notes])

  // Aggregated counts (folder + all descendants) - мемоизированы стабильнее
  const aggCounts = useMemo(() => {
    if (tree.length === 0) return new Map<number, number>()

    const out = new Map<number, number>()

    const dfs = (node: TreeNode): number => {
      let sum = directCounts.get(node.id) ?? 0
      if (node.children?.length) {
        for (const ch of node.children) sum += dfs(ch)
      }
      out.set(node.id, sum)
      return sum
    }

    for (const root of tree) dfs(root)
    return out
  }, [tree, directCounts])

  const toggle = (id: number) => {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpanded(next)
  }

  const handleCreate = async (parentId: number | null) => {
    setModalState({
      isOpen: true,
      type: 'create',
      parentId,
    })
  }

  const handleRename = async (id: number, curr: string) => {
    setModalState({
      isOpen: true,
      type: 'rename',
      folderId: id,
      currentName: curr,
    })
  }

  const handleModalSubmit = async (values: Record<string, string>) => {
    const name = values.name?.trim()
    if (!name) return

    try {
      if (modalState.type === 'create') {
        const created = await createFolder(name, modalState.parentId || null)
        setTree(prev => insertNode(prev, created as TreeNode, modalState.parentId || null))
        if (modalState.parentId != null) {
          setExpanded(s => new Set(s).add(modalState.parentId!))
        }
        onRefreshFolders()
      } else if (modalState.type === 'rename' && modalState.folderId) {
        const updated = await renameFolder(modalState.folderId, name)
        setTree(prev => updateNode(prev, modalState.folderId!, { name: (updated as any).name }))
        onRefreshFolders()
      }

      setModalState({ isOpen: false, type: 'create' })
    } catch (e) {
      console.error(`Failed to ${modalState.type} folder:`, e)
      // В случае ошибки можно перезагрузить дерево
      try {
        const t = (await fetchFolders(true)) as TreeNode[]
        setTree(t)
        setModalState({ isOpen: false, type: 'create' })
      } catch (reloadError) {
        setError((reloadError as Error).message)
      }
    }
  }

  const handleModalCancel = () => {
    setModalState({ isOpen: false, type: 'create' })
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete folder? (empty required, will ask to cascade if not)')) return
    try {
      await deleteFolder(id, false)
      setTree(prev => {
        // If current selection is inside removed subtree, reset selection before removal
        if (selected != null && (selected === id || isInSubtree(prev, id, selected))) {
          onSelect(null)
        }
        return removeNode(prev, id) // ✅ Оптимистичное обновление
      })
      onRefreshFolders() // ✅ Обновляем только breadcrumbs в родителе
    } catch {
      if (window.confirm('Folder not empty. Delete recursively?')) {
        try {
          await deleteFolder(id, true)
          setTree(prev => {
            if (selected != null && (selected === id || isInSubtree(prev, id, selected))) {
              onSelect(null)
            }
            return removeNode(prev, id) // ✅ Оптимистичное обновление
          })
          onRefreshFolders() // ✅ Обновляем только breadcrumbs в родителе
        } catch (e) {
          console.error('Failed to delete folder:', e)
          // В случае ошибки можно перезагрузить дерево
          try {
            const t = (await fetchFolders(true)) as TreeNode[]
            setTree(t)
          } catch (reloadError) {
            setError((reloadError as Error).message)
          }
        }
      }
    }
  }

  if (error) {
    return (
      <aside style={{
        width: 260,
        padding: 12,
        borderRight: '1px solid #eee'
      }}>
        Error: {error}
      </aside>
    )
  }

  // Total for top "All" button (not a real folder filter): simply all notes
  const totalAll = notes.length

  return (
    <aside style={{ width: 260, padding: '8px 4px 8px 4px', borderRight: '1px solid #eee' }}>
      <div style={{ display: 'flex', marginTop: 0, marginBottom: 2 }}>
        <h3 style={{ margin: 0, flex: 1 }}>Folders</h3>
        {/* create top-level (parentId = null) */}
        <button
          title="Add top-level folder"
          onClick={() => handleCreate(null)}
          style={{
            cursor: 'pointer',
            backgroundColor: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px'
          }}
        >
          <i className="fas fa-plus" />
        </button>
      </div>

      {/* Top pseudo "All" */}
      <div
        onClick={() => onSelect(null)}
        style={{
          padding: 6,
          borderRadius: 8,
          cursor: 'pointer',
          background: selected === null ? 'var(--color-accent-primary, #646cff)' : 'transparent',
          color: selected === null ? 'white' : 'inherit',
          marginBottom: 4,
          display: 'flex',
          gap: 6,
          fontWeight: 600,
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        <span style={{ flex: 1 }}>All</span>
        <span style={{ opacity: selected === null ? 0.9 : 0.7 }}>{totalAll}</span>
      </div>

      <Tree
        nodes={tree}
        counts={aggCounts}
        selected={selected}
        expanded={expanded}
        onSelect={onSelect}
        onToggle={toggle}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      <ModalForm
        isOpen={modalState.isOpen}
        title={modalState.type === 'create' ? 'Create Folder' : 'Rename Folder'}
        fields={[
          {
            name: 'name',
            label: 'Folder Name',
            type: 'text',
            placeholder: 'Enter folder name...',
            required: true,
            defaultValue: modalState.currentName || '',
          },
        ]}
        onSubmit={handleModalSubmit}
        onCancel={handleModalCancel}
        submitLabel={modalState.type === 'create' ? 'Create' : 'Rename'}
      />
    </aside>
  )
}

function Tree({
  nodes, counts, selected, expanded, onSelect, onToggle, onCreate, onRename, onDelete,
}: {
  nodes: TreeNode[]
  counts: Map<number, number>     // aggregated counts map
  selected: number | null
  expanded: Set<number>
  onSelect: (id: number | null) => void
  onToggle: (id: number) => void
  onCreate: (parentId: number | null) => void
  onRename: (id: number, curr: string) => void
  onDelete: (id: number) => void
}) {
  return (
    <div>
      {nodes.map(n => (
        <Node
          key={n.id}
          node={n}
          counts={counts}
          depth={0}
          selected={selected}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function Node({
  node, counts, depth, selected, expanded, onSelect, onToggle, onCreate, onRename, onDelete,
}: {
  node: TreeNode
  counts: Map<number, number>     // aggregated
  depth: number
  selected: number | null
  expanded: Set<number>
  onSelect: (id: number | null) => void
  onToggle: (id: number) => void
  onCreate: (parentId: number) => void
  onRename: (id: number, curr: string) => void
  onDelete: (id: number) => void
}) {
  const isOpen = expanded.has(node.id)
  const hasChildren = (node.children?.length ?? 0) > 0
  const pad = 8 + depth * 12
  const isSelected = selected === node.id

  return (
    <div>
      <div
        style={{
          padding: 6,
          borderRadius: 8,
          cursor: 'pointer',
          background: isSelected ? 'var(--color-accent-primary, #646cff)' : 'transparent',
          color: isSelected ? 'white' : 'inherit',
          marginBottom: 2,
          display: 'flex',
          gap: 6,
          paddingLeft: pad,
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'var(--color-hover-overlay, rgba(100, 108, 255, 0.1))'
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.id)
            }}
            style={{
              userSelect: 'none',
              color: isSelected ? 'white' : 'inherit',
              padding: '2px 4px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isOpen ? '▾' : '▸'}
          </span>
        ) : (
          <span /> // <span style={{ width: '1em' }} />
        )}

        <span
          onClick={(e) => {
            e.stopPropagation()
            onSelect(node.id)
          }}
          style={{
            flex: 1,
            color: isSelected ? 'white' : 'inherit',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        >
          {node.name}
        </span>

        <span
          style={{
            opacity: isSelected ? 0.9 : 0.7,
            color: isSelected ? 'white' : 'inherit',
          }}
        >
          {counts.get(node.id) ?? 0}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onCreate(node.id)
          }}
          title="Add subfolder"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: isSelected ? 'white' : 'inherit',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        >
          ＋
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onRename(node.id, node.name)
          }}
          title="Rename"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: isSelected ? 'white' : 'inherit',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        >
          ✎
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(node.id)
          }}
          title="Delete"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: isSelected ? 'white' : 'inherit',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        >
          🗑
        </button>
      </div>

      {isOpen &&
        hasChildren &&
        node.children!.map((c) => (
          <Node
            key={c.id}
            node={c}
            counts={counts}
            depth={depth + 1}
            selected={selected}
            expanded={expanded}
            onSelect={onSelect}
            onToggle={onToggle}
            onCreate={onCreate}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
    </div>
  )
}

/* --------------------------- tree update helpers --------------------------- */
// comments in English only
function insertNode(tree: TreeNode[], node: TreeNode, parentId: number | null): TreeNode[] {
  if (parentId == null) return [...tree, { ...node, children: [] }]
  const walk = (arr: TreeNode[]): TreeNode[] =>
    arr.map(n => {
      if (n.id === parentId) {
        const children = n.children ? [...n.children, { ...node, children: [] }] : [{ ...node, children: [] }]
        return { ...n, children }
      }
      return n.children ? { ...n, children: walk(n.children) } : n
    })
  return walk(tree)
}

function updateNode(tree: TreeNode[], id: number, patch: Partial<TreeNode>): TreeNode[] {
  const walk = (arr: TreeNode[]): TreeNode[] =>
    arr.map(n => {
      if (n.id === id) return { ...n, ...patch }
      return n.children ? { ...n, children: walk(n.children) } : n
    })
  return walk(tree)
}

function removeNode(tree: TreeNode[], id: number): TreeNode[] {
  const prune = (arr: TreeNode[]): TreeNode[] =>
    arr
      .filter(n => n.id !== id)
      .map(n => (n.children ? { ...n, children: prune(n.children) } : n))
  return prune(tree)
}

function containsId(node: TreeNode, targetId: number): boolean {
  if (node.id === targetId) return true
  return (node.children ?? []).some(ch => containsId(ch, targetId))
}

function isInSubtree(tree: TreeNode[], rootId: number, targetId: number): boolean {
  for (const n of tree) {
    if (n.id === rootId && containsId(n, targetId)) return true
    if (n.children?.length && isInSubtree(n.children, rootId, targetId)) return true
  }
  return false
}