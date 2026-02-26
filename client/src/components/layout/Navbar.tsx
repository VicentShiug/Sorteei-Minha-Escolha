import { Link, useLocation } from "wouter";
import { LayoutGrid, Globe, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/40 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Sorteei</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button 
                variant={location === "/" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-full px-4"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Minhas Listas
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground cursor-not-allowed">
              <Globe className="w-4 h-4 mr-2" />
              Listas Públicas
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="max-w-[120px] truncate">{user?.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-muted-foreground hover:text-destructive transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
