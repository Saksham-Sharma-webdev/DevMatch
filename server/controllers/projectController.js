import prisma from "../config/db.js";

// create project
export const createProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      workspaceId,
      description,
      name,
      status,
      start_date,
      end_date,
      team_members,
      team_lead,
      progress,
      priority,
    } = req.body;

    // check if user had admin role
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: { members: { include: { user: true } } },
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    if (
      !workspace.members.some(
        (member) => member.userId === userId && member.role === "ADMIN",
      )
    ) {
      return res.status(403).json({
        message: "You dont have permission to create project in this workspace",
      });
    }

    const teamLead = await prisma.user.findUnique({
      where: { email: team_lead },
      select: { id: true },
    });

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        description,
        status,
        priority,
        progress,
        team_lead: teamLead?.id,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
    });

    // add members to workspace if they are in workspace
    if (team_members?.length > 0) {
      const membersToAdd = [];
      workspace.members.forEach((member) => {
        if (team_members.includes(member.user.email)) {
          membersToAdd.push(member.user.id);
        }
      });
      await prisma.projectMember.createMany({
        data: membersToAdd.map((memberId) => ({
          projectId: project.id,
          userId: memberId,
        })),
      });
    }

    const projectWithMembers = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        members: { include: { user: true } },
        tasks: {
          include: { assignee: true, comments: { include: { user: true } } },
        },
        owner: true,
      },
    });
    res.json({
      project: projectWithMembers,
      message: "Project created successfully.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.code || err.message,
    });
  }
};

// update project
export const updateProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      id,
      workspaceId,
      description,
      name,
      status,
      start_date,
      end_date,
      team_members,
      team_lead,
      progress,
      priority,
    } = req.body;

    // to check if user is admin
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: { members: { include: { user: true } } },
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    if (
      !workspace.members.some(
        (member) => member.userId === userId && member.role === "ADMIN",
      )
    ) {
      const project = await prisma.project.findUnique({
        where: { id },
      });
      if (!project) {
        return res.status(404).json({ message: "Project not found." });
      } else if (project.team_lead !== userId) {
        return res.status(403).json({
          message:
            "You dont have permission to create project in this workspace",
        });
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        workspaceId,
        name,
        description,
        status,
        priority,
        progress,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
    });
    res.json({ project, message: "Project updated successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.code || err.message,
    });
  }
};


export const addMember = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;
    const { email } = req.body;

    // checking if the project exist
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // checking if user (who is adding) is team lead
    if (project.team_lead !== userId) {
      return res.status(403).json({
        message: "Only project lead can add members.",
      });
    }

    // check person being added is a valid user or not 
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: project.workspaceId,
      },
    });

    if (!workspaceMember) {
      return res.status(400).json({
        message: "User is not part of workspace",
      });
    }

    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        message: "User is already a member.",
      });
    }

    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
      },
    });

    res.json({ member, message: "Member added successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.code || err.message,
    });
  }
};