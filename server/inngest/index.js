import { Inngest } from "inngest";
import prisma from "../config/db.js";
import sendMail from "../config/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "dev-match" });

// ingest fn to update user data in db
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data?.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      },
    });
  },
);

// ingest fn to delete user data in db
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-from-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  },
);

// ingest fn to update user data in db
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      },
    });
  },
);

// ingest fn to delete user data in db
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.created" }],
  },
  async ({ event }) => {
    console.log("workspace creation triggered...");
    console.log("event: ", event);
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    // adding creator as admin
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  },
);

// ingest fn to update workspace data in database
const syncWorkspaceUpdation = inngest.createFunction(
  {
    id: "update-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.updated" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  },
);

// ingest fn to delete workspace data in database
const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "delete-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  },
);

// ingest fn to save workspace member data in database
const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-from-clerk",
    triggers: [{ event: "clerk/organizationInvitation.accepted" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  },
);

// ingest fn to send mail on task creation
const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: [{ event: "app/task.assigned" }],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;
    const task = await prisma.task.create({
      where: { id: taskId },
      include: {
        assignee: true,
        project: true,
      },
    });
    await sendMail({
      to: task.assignee.email,
      subject: `New Task Assignment in ${task.project.name}`,
      body: `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
    
    <h2 style="color:#4f46e5;">📌 New Task Assigned</h2>
    
    <p>Hi <strong>${task.assignee.name}</strong>,</p>
    
    <p>You have been assigned a new task in 
    <strong>${task.project.name}</strong>.</p>
    
    <div style="background:#f5f5f5; padding:15px; border-radius:8px; margin:15px 0;">
      <p><strong>📝 Task:</strong> ${task.title}</p>
      <p><strong>📅 Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
    </div>
    
    <p>
      <a href="${origin}" 
         style="display:inline-block; padding:10px 15px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:6px;">
         View Task
      </a>
    </p>
    
    <p style="margin-top:20px;">Good luck 🚀</p>
    
    <p style="font-size:12px; color:#777;">
      If you didn’t expect this email, you can ignore it.
    </p>
    
  </div>
`,
    });
    if (
      new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()
    ) {
      await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));

      await step.run("check-if-task-is-completed", async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });

        if (!task) return;

        if (task.status !== "DONE") {
          await step.run("send-task-remainder-email", async () => {
            await sendMail({
              to: task.assignee.email,
              subject: `Remainder for ${task.project.name}`,
              body: `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
    
    <h2 style="color:#dc2626;">⏰ Task Reminder</h2>
    
    <p>Hi <strong>${task.assignee.name}</strong>,</p>
    
    <p>This is a reminder for your task in 
    <strong>${task.project.name}</strong>.</p>
    
    <div style="background:#fff7ed; padding:15px; border-radius:8px; margin:15px 0; border:1px solid #fed7aa;">
      <p><strong>📝 Task:</strong> ${task.title}</p>
      <p><strong>📄 Description:</strong> ${task.description}</p>
      <p><strong>📅 Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
    </div>
    
    <p style="color:#b91c1c;">
      ⚠️ Make sure to complete this task before the deadline.
    </p>
    
    <p>
      <a href="${origin}" 
         style="display:inline-block; padding:10px 16px; background:#dc2626; color:#fff; text-decoration:none; border-radius:6px;">
         View Task
      </a>
    </p>
    
    <p style="margin-top:20px;">Stay on track 💪</p>
    
    <p style="font-size:12px; color:#777;">
      If you’ve already completed this task, you can ignore this email.
    </p>
    
  </div>
`,
            });
          });
        }

      });
    }
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail
];
