export function toApiResponse<T extends Record<string, any>>(obj: T): Omit<T, 'id' | 'userId' | 'listId'> {
  const { id, userId, listId, ...rest } = obj;
  return rest;
}

export function toApiListResponse<T extends Record<string, any>>(items: T[]) {
  return items.map((item) => toApiResponse(item));
}
