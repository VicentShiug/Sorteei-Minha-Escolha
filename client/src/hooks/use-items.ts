import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateItemRequest, type UpdateItemRequest } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateItemRequest) => {
      // Force coercion for listId to ensure it matches schema expectations
      const payload = {
        ...data,
        listId: Number(data.listId)
      };
      
      const validated = api.items.create.input.parse(payload);
      const res = await fetch(api.items.create.path, {
        method: api.items.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Validation failed");
        }
        throw new Error("Failed to create item");
      }
      
      const responseData = await res.json();
      return parseWithLogging(api.items.create.responses[201], responseData, "items.create");
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific list query to show the new item
      queryClient.invalidateQueries({ queryKey: [api.lists.get.path, Number(variables.listId)] });
    },
  });
}

export function useUpdateItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateItemRequest }) => {
      const validated = api.items.update.input.parse(data);
      const url = buildUrl(api.items.update.path, { id });
      const res = await fetch(url, {
        method: api.items.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Validation failed");
        }
        if (res.status === 404) throw new Error("Item not found");
        throw new Error("Failed to update item");
      }
      
      const responseData = await res.json();
      return parseWithLogging(api.items.update.responses[200], responseData, "items.update");
    },
    onSuccess: () => {
      // Invalidate the specific list to refresh item state
      queryClient.invalidateQueries({ queryKey: [api.lists.get.path, listId] });
    },
  });
}

export function useDeleteItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.items.delete.path, { id });
      const res = await fetch(url, {
        method: api.items.delete.method,
        credentials: "include",
      });
      if (res.status === 404) throw new Error("Item not found");
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.get.path, listId] });
    },
  });
}
