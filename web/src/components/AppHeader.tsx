import type { User } from "../types";
import Button from "./Button";
import Logo from "./Logo";

interface AppHeaderProps {
  user: User;
  onLogout: () => void;
}

export default function AppHeader({ user, onLogout }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <div className="text-xs text-slate-500">Dealership</div>
            <strong className="font-semibold text-slate-900">{user.dealership}</strong>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm text-slate-600">{user.email}</span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 capitalize ring-1 ring-indigo-600/20 ring-inset">{user.role}</span>
          <Button onClick={onLogout}>Log out</Button>
        </div>
      </div>
    </header>
  );
}
