import type { LayerGroup, Page, Shape } from '../engine/types';

export type LayerNodeKind = 'shape' | 'group';
export type LayerNodeKey = string;
export type DropPosition = 'before' | 'after' | 'inside';

export const toNodeKey = (kind: LayerNodeKind, id: string): LayerNodeKey => `${kind}:${id}`;

export const parseNodeKey = (nodeKey: LayerNodeKey): { kind: LayerNodeKind; id: string } => {
  const [kind, ...rest] = nodeKey.split(':');
  return { kind: kind as LayerNodeKind, id: rest.join(':') };
};

const unique = <T,>(values: T[]) => [...new Set(values)];

const getGroup = (groups: LayerGroup[], id: string) => groups.find((group) => group.id === id);

const getChildren = (page: Page, parentGroupId: string | null): LayerNodeKey[] => {
  if (parentGroupId === null) {
    return [...(page.rootLayerIds ?? [])];
  }
  const group = getGroup(page.groups ?? [], parentGroupId);
  return group?.childIds ? [...group.childIds] : [];
};

const setChildren = (page: Page, parentGroupId: string | null, childIds: LayerNodeKey[]) => {
  const deduped = unique(childIds);
  if (parentGroupId === null) {
    page.rootLayerIds = deduped;
    return;
  }

  page.groups = (page.groups ?? []).map((group) =>
    group.id === parentGroupId ? { ...group, childIds: deduped } : group
  );
};

type NodeLocation = {
  parentGroupId: string | null;
  index: number;
};

const findNodeLocation = (page: Page, nodeKey: LayerNodeKey): NodeLocation | null => {
  const rootIds = page.rootLayerIds ?? [];
  const rootIndex = rootIds.indexOf(nodeKey);
  if (rootIndex >= 0) {
    return { parentGroupId: null, index: rootIndex };
  }

  const groups = page.groups ?? [];
  for (const group of groups) {
    const childIds = group.childIds ?? [];
    const index = childIds.indexOf(nodeKey);
    if (index >= 0) {
      return { parentGroupId: group.id, index };
    }
  }

  return null;
};

const gatherDescendantGroupIds = (page: Page, groupId: string): Set<string> => {
  const groups = page.groups ?? [];
  const byParent = new Map<string | null, LayerGroup[]>();
  groups.forEach((group) => {
    const list = byParent.get(group.parentGroupId ?? null) ?? [];
    list.push(group);
    byParent.set(group.parentGroupId ?? null, list);
  });

  const visited = new Set<string>();
  const stack = [groupId];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    const children = byParent.get(current) ?? [];
    children.forEach((child) => stack.push(child.id));
  }

  return visited;
};

const gatherGroupDescendants = (
  page: Page,
  groupId: string
): { groupIds: Set<string>; shapeIds: Set<string> } => {
  const groupsById = new Map((page.groups ?? []).map((group) => [group.id, group]));
  const groupIds = new Set<string>();
  const shapeIds = new Set<string>();
  const stack = [groupId];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (groupIds.has(current)) continue;
    groupIds.add(current);

    const group = groupsById.get(current);
    if (!group) continue;

    (group.childIds ?? []).forEach((nodeKey) => {
      const parsed = parseNodeKey(nodeKey);
      if (parsed.kind === 'shape') {
        shapeIds.add(parsed.id);
        return;
      }
      stack.push(parsed.id);
    });
  }

  return { groupIds, shapeIds };
};

export const getGroupDescendantShapeIds = (page: Page, groupId: string): string[] => {
  const safePage = ensureLayerTree(page);
  const { shapeIds } = gatherGroupDescendants(safePage, groupId);
  return [...shapeIds];
};

export const ensureLayerTree = (page: Page): Page => {
  const groups = [...(page.groups ?? [])];
  const shapes = [...page.shapes];

  const shapeIds = new Set(shapes.map((shape) => shape.id));
  const groupIds = new Set(groups.map((group) => group.id));
  const hasStoredTree =
    Array.isArray(page.rootLayerIds) || groups.some((group) => Array.isArray(group.childIds));

  // Normalize parent links to existing groups only.
  const normalizedGroups = groups.map((group) => ({
    ...group,
    parentGroupId:
      group.parentGroupId && groupIds.has(group.parentGroupId) ? group.parentGroupId : undefined,
    childIds: [],
  }));
  const normalizedById = new Map(normalizedGroups.map((group) => [group.id, group]));

  const sanitizeChildren = (childIds: LayerNodeKey[]) =>
    unique(childIds).filter((nodeKey) => {
      const { kind, id } = parseNodeKey(nodeKey);
      return kind === 'shape' ? shapeIds.has(id) : groupIds.has(id);
    });

  if (hasStoredTree) {
    const sanitizedGroups = normalizedGroups.map((group) => {
      const original = groups.find((candidate) => candidate.id === group.id);
      return {
        ...group,
        childIds: sanitizeChildren(original?.childIds ?? []),
      };
    });
    const groupMap = new Map(sanitizedGroups.map((group) => [group.id, group]));
    const seenNodeKeys = new Set<LayerNodeKey>();

    const rootLayerIds = sanitizeChildren(page.rootLayerIds ?? []);
    rootLayerIds.forEach((nodeKey) => seenNodeKeys.add(nodeKey));
    sanitizedGroups.forEach((group) => {
      group.childIds = sanitizeChildren(group.childIds ?? []);
      group.childIds.forEach((nodeKey) => seenNodeKeys.add(nodeKey));
    });

    // Ensure nested groups are present under their parents.
    sanitizedGroups.forEach((group) => {
      const groupKey = toNodeKey('group', group.id);
      if (group.parentGroupId && groupMap.has(group.parentGroupId)) {
        const parent = groupMap.get(group.parentGroupId) as LayerGroup;
        if (!(parent.childIds ?? []).includes(groupKey)) {
          parent.childIds = [...(parent.childIds ?? []), groupKey];
        }
      } else if (!rootLayerIds.includes(groupKey)) {
        rootLayerIds.push(groupKey);
      }
    });

    // Ensure all shapes exist in the tree.
    shapes.forEach((shape) => {
      const shapeKey = toNodeKey('shape', shape.id);
      if (seenNodeKeys.has(shapeKey)) {
        return;
      }
      if (shape.groupId && groupMap.has(shape.groupId)) {
        const group = groupMap.get(shape.groupId) as LayerGroup;
        group.childIds = [...(group.childIds ?? []), shapeKey];
        return;
      }
      rootLayerIds.push(shapeKey);
    });

    return {
      ...page,
      rootLayerIds: sanitizeChildren(rootLayerIds),
      groups: sanitizedGroups.map((group) => ({
        ...group,
        childIds: sanitizeChildren(group.childIds ?? []),
      })),
    };
  }

  // Build from paint order when no tree exists yet.
  const rootIds: LayerNodeKey[] = [];
  const pushedRootGroups = new Set<string>();
  shapes.forEach((shape) => {
    const shapeKey = toNodeKey('shape', shape.id);
    if (shape.groupId && normalizedById.has(shape.groupId)) {
      const group = normalizedById.get(shape.groupId) as LayerGroup;
      group.childIds = [...(group.childIds ?? []), shapeKey];
      if (!group.parentGroupId && !pushedRootGroups.has(group.id)) {
        rootIds.push(toNodeKey('group', group.id));
        pushedRootGroups.add(group.id);
      }
      return;
    }
    rootIds.push(shapeKey);
  });

  normalizedGroups.forEach((group) => {
    if (group.parentGroupId && normalizedById.has(group.parentGroupId)) {
      const parent = normalizedById.get(group.parentGroupId) as LayerGroup;
      parent.childIds = [...(parent.childIds ?? []), toNodeKey('group', group.id)];
    } else if (!pushedRootGroups.has(group.id)) {
      rootIds.push(toNodeKey('group', group.id));
      pushedRootGroups.add(group.id);
    }
  });

  return {
    ...page,
    rootLayerIds: sanitizeChildren(rootIds),
    groups: normalizedGroups.map((group) => ({
      ...group,
      childIds: sanitizeChildren(group.childIds ?? []),
    })),
  };
};

export const flattenShapesByTree = (page: Page): Shape[] => {
  const safePage = ensureLayerTree(page);
  const shapesById = new Map(safePage.shapes.map((shape) => [shape.id, shape]));
  const groupsById = new Map((safePage.groups ?? []).map((group) => [group.id, group]));
  const result: Shape[] = [];
  const visitedGroups = new Set<string>();

  const visit = (nodeKey: LayerNodeKey) => {
    const { kind, id } = parseNodeKey(nodeKey);
    if (kind === 'shape') {
      const shape = shapesById.get(id);
      if (shape) {
        result.push(shape);
      }
      return;
    }

    if (visitedGroups.has(id)) {
      return;
    }
    visitedGroups.add(id);
    const group = groupsById.get(id);
    if (!group) return;
    (group.childIds ?? []).forEach(visit);
  };

  (safePage.rootLayerIds ?? []).forEach(visit);

  const resultIds = new Set(result.map((shape) => shape.id));
  safePage.shapes.forEach((shape) => {
    if (!resultIds.has(shape.id)) {
      result.push(shape);
    }
  });
  return result;
};

export const getVisibleLayerShapeIds = (page: Page): string[] => {
  const safePage = ensureLayerTree(page);
  const groupsById = new Map((safePage.groups ?? []).map((group) => [group.id, group]));
  const result: string[] = [];

  const walk = (nodeIds: LayerNodeKey[]) => {
    [...nodeIds].reverse().forEach((nodeKey) => {
      const node = parseNodeKey(nodeKey);
      if (node.kind === 'shape') {
        result.push(node.id);
        return;
      }

      const group = groupsById.get(node.id);
      if (!group || group.collapsed) {
        return;
      }
      walk(group.childIds ?? []);
    });
  };

  walk(safePage.rootLayerIds ?? []);
  return result;
};

export const renameLayerGroup = (page: Page, groupId: string, name: string): Page => {
  const trimmed = name.trim();
  if (!trimmed) return page;
  return {
    ...page,
    groups: (page.groups ?? []).map((group) =>
      group.id === groupId ? { ...group, name: trimmed } : group
    ),
  };
};

export const moveLayerNode = (
  page: Page,
  dragNodeKey: LayerNodeKey,
  targetNodeKey: LayerNodeKey,
  position: DropPosition
): { page: Page; changed: boolean } => {
  if (dragNodeKey === targetNodeKey) {
    return { page, changed: false };
  }

  let nextPage = ensureLayerTree(page);
  const drag = parseNodeKey(dragNodeKey);
  const target = parseNodeKey(targetNodeKey);

  const dragLoc = findNodeLocation(nextPage, dragNodeKey);
  const targetLoc = findNodeLocation(nextPage, targetNodeKey);
  if (!dragLoc || !targetLoc) {
    return { page, changed: false };
  }

  let destParentGroupId: string | null = null;
  let destIndex = 0;

  if (position === 'inside') {
    if (target.kind !== 'group') {
      return { page, changed: false };
    }
    destParentGroupId = target.id;
    destIndex = getChildren(nextPage, destParentGroupId).length;
  } else {
    destParentGroupId = targetLoc.parentGroupId;
    destIndex = position === 'before' ? targetLoc.index : targetLoc.index + 1;
  }

  if (drag.kind === 'group' && destParentGroupId) {
    const descendants = gatherDescendantGroupIds(nextPage, drag.id);
    if (descendants.has(destParentGroupId)) {
      return { page, changed: false };
    }
  }

  const sourceChildren = getChildren(nextPage, dragLoc.parentGroupId);
  sourceChildren.splice(dragLoc.index, 1);
  setChildren(nextPage, dragLoc.parentGroupId, sourceChildren);

  if (dragLoc.parentGroupId === destParentGroupId && dragLoc.index < destIndex) {
    destIndex -= 1;
  }

  const destChildren = getChildren(nextPage, destParentGroupId);
  destChildren.splice(destIndex, 0, dragNodeKey);
  setChildren(nextPage, destParentGroupId, destChildren);

  if (drag.kind === 'shape') {
    nextPage = {
      ...nextPage,
      shapes: nextPage.shapes.map((shape) =>
        shape.id === drag.id ? { ...shape, groupId: destParentGroupId ?? undefined } : shape
      ),
    };
  } else {
    nextPage = {
      ...nextPage,
      groups: (nextPage.groups ?? []).map((group) =>
        group.id === drag.id ? { ...group, parentGroupId: destParentGroupId ?? undefined } : group
      ),
    };
  }

  const reorderedShapes = flattenShapesByTree(nextPage);
  const changed =
    reorderedShapes.some((shape, index) => shape.id !== page.shapes[index]?.id) ||
    JSON.stringify(page.rootLayerIds ?? []) !== JSON.stringify(nextPage.rootLayerIds ?? []) ||
    JSON.stringify(page.groups ?? []) !== JSON.stringify(nextPage.groups ?? []);

  return {
    page: {
      ...nextPage,
      shapes: reorderedShapes,
    },
    changed,
  };
};

export const moveLayerNodeToRootEnd = (
  page: Page,
  dragNodeKey: LayerNodeKey
): { page: Page; changed: boolean } => {
  let nextPage = ensureLayerTree(page);
  const drag = parseNodeKey(dragNodeKey);
  const dragLoc = findNodeLocation(nextPage, dragNodeKey);
  if (!dragLoc) {
    return { page, changed: false };
  }

  const sourceChildren = getChildren(nextPage, dragLoc.parentGroupId);
  sourceChildren.splice(dragLoc.index, 1);
  setChildren(nextPage, dragLoc.parentGroupId, sourceChildren);

  const rootChildren = getChildren(nextPage, null);
  rootChildren.push(dragNodeKey);
  setChildren(nextPage, null, rootChildren);

  if (drag.kind === 'shape') {
    nextPage = {
      ...nextPage,
      shapes: nextPage.shapes.map((shape) =>
        shape.id === drag.id ? { ...shape, groupId: undefined } : shape
      ),
    };
  } else {
    nextPage = {
      ...nextPage,
      groups: (nextPage.groups ?? []).map((group) =>
        group.id === drag.id ? { ...group, parentGroupId: undefined } : group
      ),
    };
  }

  const reorderedShapes = flattenShapesByTree(nextPage);
  const changed =
    reorderedShapes.some((shape, index) => shape.id !== page.shapes[index]?.id) ||
    JSON.stringify(page.rootLayerIds ?? []) !== JSON.stringify(nextPage.rootLayerIds ?? []) ||
    JSON.stringify(page.groups ?? []) !== JSON.stringify(nextPage.groups ?? []);

  return {
    page: {
      ...nextPage,
      shapes: reorderedShapes,
    },
    changed,
  };
};

export const groupShapes = (
  page: Page,
  shapeIds: string[]
): { page: Page; groupId: string | null; changed: boolean } => {
  if (shapeIds.length < 2) {
    return { page, groupId: null, changed: false };
  }

  let nextPage = ensureLayerTree(page);
  const selectedKeys = shapeIds.map((id) => toNodeKey('shape', id));
  const selectedSet = new Set(selectedKeys);

  const locations = selectedKeys
    .map((key) => ({ key, loc: findNodeLocation(nextPage, key) }))
    .filter((entry): entry is { key: LayerNodeKey; loc: NodeLocation } => Boolean(entry.loc));
  if (locations.length < 2) {
    return { page, groupId: null, changed: false };
  }

  const sameParent = locations.every(
    (entry) => entry.loc.parentGroupId === locations[0].loc.parentGroupId
  );
  const parentGroupId = sameParent ? locations[0].loc.parentGroupId : null;
  const insertionIndex = sameParent
    ? Math.min(...locations.map((entry) => entry.loc.index))
    : getChildren(nextPage, null).length;

  // Remove selected nodes from all parents.
  const groups = (nextPage.groups ?? []).map((group) => ({
    ...group,
    childIds: (group.childIds ?? []).filter((nodeKey) => !selectedSet.has(nodeKey)),
  }));
  const rootLayerIds = (nextPage.rootLayerIds ?? []).filter((nodeKey) => !selectedSet.has(nodeKey));
  nextPage = { ...nextPage, groups, rootLayerIds };

  const groupId = Math.random().toString(36).substring(7);
  const newGroup: LayerGroup = {
    id: groupId,
    name: `Group ${(nextPage.groups ?? []).length + 1}`,
    parentGroupId: parentGroupId ?? undefined,
    childIds: selectedKeys,
    collapsed: false,
  };

  nextPage = {
    ...nextPage,
    groups: [...(nextPage.groups ?? []), newGroup],
    shapes: nextPage.shapes.map((shape) =>
      shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
    ),
  };

  const parentChildren = getChildren(nextPage, parentGroupId);
  parentChildren.splice(insertionIndex, 0, toNodeKey('group', groupId));
  setChildren(nextPage, parentGroupId, parentChildren);

  nextPage = {
    ...nextPage,
    shapes: flattenShapesByTree(nextPage),
  };

  return { page: nextPage, groupId, changed: true };
};

export const ungroupByGroupIds = (
  page: Page,
  groupIds: string[]
): { page: Page; changed: boolean } => {
  if (groupIds.length === 0) {
    return { page, changed: false };
  }

  let nextPage = ensureLayerTree(page);
  let changed = false;

  groupIds.forEach((groupId) => {
    const groupNodeKey = toNodeKey('group', groupId);
    const groupLoc = findNodeLocation(nextPage, groupNodeKey);
    const group = getGroup(nextPage.groups ?? [], groupId);
    if (!groupLoc || !group) {
      return;
    }

    const parentChildren = getChildren(nextPage, groupLoc.parentGroupId);
    parentChildren.splice(groupLoc.index, 1, ...(group.childIds ?? []));
    setChildren(nextPage, groupLoc.parentGroupId, parentChildren);

    nextPage = {
      ...nextPage,
      groups: (nextPage.groups ?? [])
        .filter((candidate) => candidate.id !== groupId)
        .map((candidate) => {
          if (candidate.parentGroupId === groupId) {
            return { ...candidate, parentGroupId: groupLoc.parentGroupId ?? undefined };
          }
          return candidate;
        }),
      shapes: nextPage.shapes.map((shape) =>
        shape.groupId === groupId
          ? { ...shape, groupId: groupLoc.parentGroupId ?? undefined }
          : shape
      ),
    };
    changed = true;
  });

  if (!changed) {
    return { page, changed: false };
  }

  return {
    page: {
      ...nextPage,
      shapes: flattenShapesByTree(nextPage),
    },
    changed: true,
  };
};

export const deleteGroupBranch = (
  page: Page,
  groupId: string
): { page: Page; deletedShapeIds: string[]; changed: boolean } => {
  let nextPage = ensureLayerTree(page);
  const groupNodeKey = toNodeKey('group', groupId);
  const groupLoc = findNodeLocation(nextPage, groupNodeKey);
  const targetGroup = getGroup(nextPage.groups ?? [], groupId);
  if (!groupLoc || !targetGroup) {
    return { page, deletedShapeIds: [], changed: false };
  }

  const { groupIds, shapeIds } = gatherGroupDescendants(nextPage, groupId);
  const deleteGroupKeySet = new Set([...groupIds].map((id) => toNodeKey('group', id)));
  const deleteShapeKeySet = new Set([...shapeIds].map((id) => toNodeKey('shape', id)));
  const deletedNodeKeys = new Set([...deleteGroupKeySet, ...deleteShapeKeySet]);

  const parentChildren = getChildren(nextPage, groupLoc.parentGroupId).filter(
    (nodeKey) => nodeKey !== groupNodeKey
  );
  setChildren(nextPage, groupLoc.parentGroupId, parentChildren);

  nextPage = {
    ...nextPage,
    rootLayerIds: (nextPage.rootLayerIds ?? []).filter((nodeKey) => !deletedNodeKeys.has(nodeKey)),
    groups: (nextPage.groups ?? [])
      .filter((group) => !groupIds.has(group.id))
      .map((group) => ({
        ...group,
        childIds: (group.childIds ?? []).filter((nodeKey) => !deletedNodeKeys.has(nodeKey)),
      })),
    shapes: nextPage.shapes.filter((shape) => !shapeIds.has(shape.id)),
  };

  nextPage = ensureLayerTree(nextPage);

  return {
    page: nextPage,
    deletedShapeIds: [...shapeIds],
    changed: true,
  };
};
