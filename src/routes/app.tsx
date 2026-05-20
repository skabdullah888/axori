import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { UserShell } from "@/components/user-shell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const matches = useMatches();
  const title = [...matches]
    .reverse()
    .map((m) => (m.staticData as { title?: string } | undefined)?.title)
    .find((t) => !!t);
  return (
    <UserShell title={title ?? ""}>
      <Outlet />
    </UserShell>
  );
}
