import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { get, isInstalled } from "@/lib/db";
import { activityFeed, analytics, getBoard, listCanvases, listMembers, listMembersWithPresence, listProjects, myTasks } from "@/lib/queries";
import { Workspace } from "@/components/workspace";

export default async function BoardPage({ searchParams }: PageProps<"/board">) {
  if (!isInstalled()) redirect("/setup");
  const user = await currentUser();
  if (!user) redirect("/login");

  const projects = listProjects();
  const wanted = (await searchParams).project;
  const project = projects.find((p) => p.id === wanted) ?? projects[0] ?? null;
  const workspace = get<{ value: string }>("SELECT value FROM settings WHERE key = 'workspace'")?.value ?? "Workspace";

  return (
    <Workspace
      user={user}
      workspace={workspace}
      projects={projects}
      project={project}
      columns={project ? getBoard(project.id) : []}
      members={listMembers()}
      presence={listMembersWithPresence()}
      feed={activityFeed()}
      mine={myTasks(user.id)}
      stats={project ? analytics(project.id) : null}
      sheets={project ? listCanvases(project.id) : []}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
