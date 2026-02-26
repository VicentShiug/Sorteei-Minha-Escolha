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
      const validated = api.items.create.input.parse(data);
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
      queryClient.invalidateQueries({ queryKey: [api.lists.get.path, variables.listExternalId] });
    },
  });
}

export function useUpdateItem(listExternalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemRequest }) => {
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
      queryClient.invalidateQueries({ queryKey: [api.lists.get.path, listExternalId] });
    },
  });
}

export function useDeleteItem(listExternalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.items.delete.path, { id });
      const res = await fetch(url, {
        method: api.items.delete.method,
        credentials: "include",
      });
      if (res.status === 404) throw new Error("Item not found");
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.get.path, listExternalId] });
    },
  });
}
