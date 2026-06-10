import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProjectBySlug } from "@/lib/db/projects";
import { getMeetingsForProject } from "@/lib/db/meetings";
import { MeetingsCalendar } from "@/components/meetings/meetings-calendar";

export default async function ProjectMeetingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const meetings = await getMeetingsForProject(project.id);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Meetings</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} · Click a day to schedule, click an event to edit.
        </p>
      </div>

      <MeetingsCalendar
        projectId={project.id}
        initialMeetings={meetings.map((m) => ({
          ...m,
          startAt: m.startAt,
          endAt: m.endAt,
        }))}
      />
    </div>
  );
}
