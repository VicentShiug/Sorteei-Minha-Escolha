import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateListRequest, type ListResponse } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useLists() {
  return useQuery({
    queryKey: [api.lists.list.path],
    queryFn: async () => {
      const res = await fetch(api.lists.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lists");
      const data = await res.json();
      return parseWithLogging(api.lists.list.responses[200], data, "lists.list");
    },
  });
}

export function useList(id: number) {
  return useQuery({
    queryKey: [api.lists.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.lists.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch list");
      const data = await res.json();
      return parseWithLogging(api.lists.get.responses[200], data, "lists.get");
    },
    enabled: !!id,
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateListRequest) => {
      const validated = api.lists.create.input.parse(data);
      const res = await fetch(api.lists.create.path, {
        method: api.lists.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Validation failed");
        }
        throw new Error("Failed to create list");
      }
      
      const responseData = await res.json();
      return parseWithLogging(api.lists.create.responses[201], responseData, "lists.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.lists.delete.path, { id });
      const res = await fetch(url, {
        method: api.lists.delete.method,
        credentials: "include",
      });
      if (res.status === 404) throw new Error("List not found");
      if (!res.ok) throw new Error("Failed to delete list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
    },
  });
}
