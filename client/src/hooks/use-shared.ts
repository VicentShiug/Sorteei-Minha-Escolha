import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuthRetry } from "@/lib/api";
import { z } from "zod";
import { PermissionLevel } from "@shared/schema";

const InvitePreviewSchema = z.object({
  inviteId: z.string().uuid(),
  listName: z.string(),
  listDescription: z.string().nullable(),
  itemCount: z.number(),
  memberCount: z.number(),
  maxMembers: z.number().nullable(),
  permission: z.nativeEnum(PermissionLevel),
  message: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdByName: z.string(),
  isExpired: z.boolean(),
  isAtCapacity: z.boolean(),
});

const CreateInviteResponseSchema = z.object({
  inviteId: z.string().uuid(),
  token: z.string(),
  url: z.string(),
});

const MemberSchema = z.object({
  externalId: z.string().nullable().or(z.literal("")),
  name: z.string(),
  permission: z.nativeEnum(PermissionLevel),
  isOwner: z.boolean(),
  isCurrentUser: z.boolean(),
  joinedAt: z.coerce.date().nullable().or(z.literal("")),
  invitedByName: z.string().nullable(),
});

export type InvitePreview = z.infer<typeof InvitePreviewSchema>;
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>;
export type ListMember = z.infer<typeof MemberSchema>;

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: ["invite-preview", token],
    queryFn: async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch invite");
      const data = await res.json();
      return parseWithLogging(InvitePreviewSchema, data, "invite-preview");
    },
    enabled: !!token,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to accept invite");
      }
      const data = await res.json();
      return parseWithLogging(z.object({ listId: z.string().uuid() }), data, "accept-invite");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useCreateInvite(listExternalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      permission?: number;
      message?: string;
      maxMembers?: number;
      expiresAt?: string;
    }) => {
      const res = await fetchWithAuthRetry(`/api/lists/${listExternalId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create invite");
      }
      const responseData = await res.json();
      return parseWithLogging(CreateInviteResponseSchema, responseData, "create-invite");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-invites", listExternalId] });
    },
  });
}

export function useListInvites(listExternalId: string) {
  return useQuery({
    queryKey: ["list-invites", listExternalId],
    queryFn: async () => {
      const res = await fetchWithAuthRetry(`/api/lists/${listExternalId}/invites`);
      if (!res.ok) throw new Error("Failed to fetch invites");
      const data = await res.json();
      return parseWithLogging(z.array(z.unknown()), data, "list-invites");
    },
    enabled: !!listExternalId,
  });
}

export function useUpdateInvite(listExternalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, data }: { inviteId: string; data: {
      permission?: number;
      message?: string;
      maxMembers?: number;
      isActive?: boolean;
    }}) => {
      const res = await fetchWithAuthRetry(`/api/lists/${listExternalId}/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update invite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-invites", listExternalId] });
    },
  });
}

export function useListMembers(listExternalId: string) {
  return useQuery({
    queryKey: ["list-members", listExternalId],
    queryFn: async () => {
      const res = await fetchWithAuthRetry(`/api/lists/${listExternalId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      return parseWithLogging(z.array(MemberSchema), data, "list-members");
    },
    enabled: !!listExternalId,
  });
}

export function useUpdateMemberPermission(listExternalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ externalId, permission }: { externalId: string; permission: number }) => {
      const res = await fetchWithAuthRetry(`/api/lists/${listExternalId}/members/${externalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-members", listExternalId] });
    },
  });
}

export function useRemoveMember(listExternalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberExternalId: string) => {
      const res = await fetchWithAuthRetry(`/api/lists/${listExternalId}/members/${memberExternalId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to remove member");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-members", listExternalId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useLeaveList(listExternalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberExternalId: string) => {
      const res = await fetchWithAuthRetry(`/api/lists/${listExternalId}/members/${memberExternalId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to leave list");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}
