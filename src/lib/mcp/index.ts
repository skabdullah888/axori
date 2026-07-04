import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listTasks from "./tools/list-tasks";
import listSubmissions from "./tools/list-submissions";
import listNotifications from "./tools/list-notifications";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "axorabd-mcp",
  title: "AxoraBD",
  version: "0.1.0",
  instructions:
    "AxoraBD tools for a signed-in user. Use `get_profile` for the user's profile and balance, `list_available_tasks` to browse tasks, `list_my_submissions` to check submission status, and `list_notifications` for recent updates.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listTasks, listSubmissions, listNotifications],
});
