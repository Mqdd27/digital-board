import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { get, isInstalled } from "@/lib/db";
import { activityFeed, analytics, getBoard, listCanvases, listMembers, listMembersWithPresence, listProjects, myTasks } from "@/lib/queries";
import { Workspace } from "@/components/workspace";

export default async function BoardPage({ searchParams }: PageProps<"/board">) {
  if (!(await isInstalled())) redirect("/setup");
  const user = await currentUser();
  if (!user) redirect("/login");

  const projects = await listProjects();
  const wanted = (await searchParams).project;
  const project = projects.find((p) => p.id === wanted) ?? projects[0] ?? null;
  const workspace = (await get<{ value: string }>("SELECT value FROM settings WHERE key = 'workspace'"))?.value ?? "Workspace";

  return (
    <Workspace
      user={user}
      workspace={workspace}
      projects={projects}
      project={project}
      columns={project ? await getBoard(project.id) : []}
      members={await listMembers()}
      presence={await listMembersWithPresence()}
      feed={await activityFeed()}
      mine={await myTasks(user.id)}
      stats={project ? await analytics(project.id) : null}
      sheets={project ? await listCanvases(project.id) : []}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
