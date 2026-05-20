import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { UserShell } from "@/components/user-shell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const matches = useMatches();
  const title =
    [...matches].reverse().find((m) => (m.staticData as any)?.title)?.staticData
      ?.title as string | undefined;
  return (
    <UserShell title={title ?? ""}>
      <Outlet />
    </UserShell>
  );
}
