import { useState } from "react";
import { Copy, Link, Check, X, Users, Clock, Settings2, Trash2, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateInvite, useListInvites, useUpdateInvite } from "@/hooks/use-shared";
import { PermissionLevel } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";

const permissionLabels: Record<number, { title: string; description: string }> = {
  [PermissionLevel.VIEWER]: {
    title: "Viewer",
    description: "Can view list, draw, and mark items as completed",
  },
  [PermissionLevel.EDITOR_LIST]: {
    title: "Editor - List",
    description: "Can edit list metadata in addition to viewer permissions",
  },
  [PermissionLevel.EDITOR_ITEMS]: {
    title: "Editor - Items",
    description: "Can add and edit items in addition to editor list permissions",
  },
  [PermissionLevel.ADMIN]: {
    title: "Admin",
    description: "Can invite other people in addition to all other permissions",
  },
};

interface ShareListModalProps {
  listExternalId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareListModal({ listExternalId, isOpen, onOpenChange }: ShareListModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [permission, setPermission] = useState<number>(PermissionLevel.VIEWER);
  const [message, setMessage] = useState("");
  const [maxMembers, setMaxMembers] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ url: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: invites, isLoading: invitesLoading } = useListInvites(listExternalId);
  const createInvite = useCreateInvite(listExternalId);
  const updateInvite = useUpdateInvite(listExternalId);

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite.mutateAsync({
        permission,
        message: message || undefined,
        maxMembers: maxMembers ? parseInt(maxMembers) : undefined,
        expiresAt: expiresAt || undefined,
      });
      setCreatedInvite({ url: result.url, token: result.token });
      toast({ title: "Invite created successfully" });
      queryClient.invalidateQueries({ queryKey: ["list-invites", listExternalId] });
    } catch (error) {
      toast({
        title: "Failed to create invite",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${createdInvite?.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleInvite = async (inviteId: string, isActive: boolean) => {
    try {
      await updateInvite.mutateAsync({ inviteId, data: { isActive } });
      toast({ title: isActive ? "Invite activated" : "Invite deactivated" });
    } catch (error) {
      toast({
        title: "Failed to update invite",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('shareList.title', 'Share List')}
          </DialogTitle>
          <DialogDescription>
            Create an invite link or manage existing invites
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!createdInvite ? (
            <>
              <div className="space-y-3">
                <Label>Permission Level</Label>
                <RadioGroup
                  value={String(permission)}
                  onValueChange={(v) => setPermission(parseInt(v))}
                  className="space-y-2"
                >
                  {Object.entries(permissionLabels).map(([level, labels]) => (
                    <div key={level} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
                      <RadioGroupItem value={level} id={`perm-${level}`} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={`perm-${level}`} className="font-medium cursor-pointer">
                          {labels.title}
                        </Label>
                        <p className="text-sm text-muted-foreground">{labels.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to your invite..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxMembers">Max Members</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires At</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateInvite}
                disabled={createInvite.isPending}
                className="w-full"
              >
                {createInvite.isPending ? "Creating..." : "Create Invite Link"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Invite Link Created</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCreatedInvite(null)}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}${createdInvite.url}`}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={handleCopyLink} size="icon" variant="secondary">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setCreatedInvite(null)}
                className="w-full"
              >
                Create Another Link
              </Button>
            </div>
          )}

          {invites && invites.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Link className="w-4 h-4" />
                Active Invites
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {invites.map((invite: any) => (
                  <div
                    key={invite.externalId}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {permissionLabels[invite.permission]?.title || "Viewer"}
                        </span>
                        {invite.maxMembers && (
                          <span className="text-xs text-muted-foreground">
                            (max {invite.maxMembers})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {invite.message && (
                          <span className="truncate max-w-[150px]">"{invite.message}"</span>
                        )}
                        {invite.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleInvite(invite.externalId, !invite.isActive)}
                      disabled={updateInvite.isPending}
                      className={invite.isActive ? "text-green-500" : "text-muted-foreground"}
                    >
                      {invite.isActive ? (
                        <ToggleLeft className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
