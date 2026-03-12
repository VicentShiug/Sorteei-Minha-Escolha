export function toApiResponse<T extends Record<string, any>>(obj: T): Omit<T, 'id' | 'userId' | 'listId'> {
  const { id, userId, listId, ...rest } = obj;
  return rest;
}

export function toApiItemResponse<T extends Record<string, any>>(obj: T): Omit<T, 'id'> {
  const { id, ...rest } = obj;
  return rest;
}

export function toApiItemProgressResponse<T extends Record<string, any>>(obj: T): Omit<T, 'id' | 'itemId' | 'listId' | 'userId'> & { externalId: string } {
  const { id, itemId, listId, userId, ...rest } = obj;
  return { ...rest, externalId: obj.externalId };
}

export function toApiListResponse<T extends Record<string, any>>(items: T[]) {
  return items.map((item) => toApiResponse(item));
}

export function toApiInviteResponse<T extends Record<string, any>>(obj: T): Omit<T, 'id' | 'listId'> {
  const { id, listId, ...rest } = obj;
  return rest;
}

export function toApiInviteListResponse<T extends Record<string, any>>(items: T[]) {
  return items.map((item) => toApiInviteResponse(item));
}

export function toApiMemberResponse<T extends Record<string, any>>(obj: T): Omit<T, 'id' | 'userId' | 'listId'> {
  const { id, userId, listId, ...rest } = obj;
  return rest;
}
