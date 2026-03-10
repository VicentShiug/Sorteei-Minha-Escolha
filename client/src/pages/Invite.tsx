import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Users, Clock, FileText, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useInvitePreview, useAcceptInvite } from "@/hooks/use-shared";
import { PermissionLevel } from "@shared/schema";
import { useTranslation } from "react-i18next";

const permissionLabels: Record<number, string> = {
  [PermissionLevel.VIEWER]: "Viewer - Can view list, draw, and mark items as completed",
  [PermissionLevel.EDITOR_LIST]: "Editor (List) - Can edit list metadata",
  [PermissionLevel.EDITOR_ITEMS]: "Editor (Items) - Can add and edit items",
  [PermissionLevel.ADMIN]: "Admin - Can invite other people",
};

export default function Invite() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const token = params.token as string;
  
  const { data: invite, isLoading, error } = useInvitePreview(token);
  const acceptInvite = useAcceptInvite();

  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      const redirectTo = `/invite/${token}`;
      setLocation(`/auth?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    setIsAccepting(true);
    try {
      await acceptInvite.mutateAsync(token);
      setLocation(`/`);
    } catch (err) {
      console.error("Failed to accept invite:", err);
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Invite Not Found</h1>
        <p className="text-muted-foreground mb-8 text-center">
          This invite link may be invalid, expired, or no longer active.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Home</Button>
        </Link>
      </div>
    );
  }

  if (invite.isExpired) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Invite Expired</h1>
        <p className="text-muted-foreground mb-8 text-center">
          This invite link has expired and can no longer be used.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Home</Button>
        </Link>
      </div>
    );
  }

  if (invite.isAtCapacity) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">List at Capacity</h1>
        <p className="text-muted-foreground mb-8 text-center">
          This list has reached its maximum number of members.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Home</Button>
        </Link>
      </div>
    );
  }

  const spotsRemaining = invite.maxMembers
    ? invite.maxMembers - invite.memberCount
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">
            You've been invited!
          </h1>
          <p className="text-muted-foreground">
            {invite.createdByName} invited you to join their list
          </p>
        </div>

        <div className="bg-card rounded-3xl p-8 border border-border/30 minimal-shadow space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">{invite.listName}</h2>
            {invite.listDescription && (
              <p className="text-muted-foreground text-sm">{invite.listDescription}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{invite.itemCount} items</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>
                {invite.memberCount} member{invite.memberCount !== 1 ? "s" : ""}
                {spotsRemaining !== null && ` · ${spotsRemaining} spots left`}
              </span>
            </div>
          </div>

          {invite.message && (
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-sm italic">"{invite.message}"</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm font-medium mb-1">Your permission level:</p>
            <p className="text-sm text-muted-foreground">
              {permissionLabels[invite.permission]}
            </p>
          </div>

          {invite.expiresAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Expires: {new Date(invite.expiresAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full h-12">
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </Link>
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex-1 h-12"
          >
            {isAccepting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Accept Invite
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
