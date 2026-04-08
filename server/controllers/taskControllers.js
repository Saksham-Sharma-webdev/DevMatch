import prisma from "../config/db.js";
import { inngest } from "../inngest/index.js";

// create task

export const createTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      projectId,
      title,
      description,
      status,
      priority,
      assigneeId,
      due_date,
    } = req.body;
    const origin = req.get("origin");

    // check if user has admin role
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({
          message: "You don't have admin permissions for this project.",
        });
    } else if (
      assigneeId &&
      !project.members.find((member) => member.user.id === assigneeId)
    ) {
      return res
        .status(403)
        .json({
          message: "assignee is not a member of the project/workspace.",
        });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        priority,
        assigneeId,
        status,
        due_date: due_date ? new Date(due_date) : null,
      },
    });

    const taskWithAssignee = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
      include: { assignee: true },
    });

    // trigger inngest function to send mail for task creation
    await inngest.send({
      name: "app/task.assigned",
      data: {
        taskId: task.id,
        origin,
      },
    });

    res.json({ task, taskWithAssignee, message: "Task created successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.code || err.message });
  }
};

// update task

export const updateTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const { userId } = await req.auth();

    // check if user has admin role
    const project = await prisma.project.findUnique({
      where: {
        id: task.projectId,
      },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({
          message: "You don't have admin permissions for this project.",
        });
    }

    const { title, description, status, priority, assigneeId, due_date } =
      req.body;

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        status,
        priority,
        assigneeId,
        due_date: due_date ? new Date(due_date) : undefined,
      },
    });

    res.json({ task: updatedTask, message: "Task updated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.code || err.message });
  }
};

// delete task

export const deleteTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { tasksId } = req.body;
    const tasks = await prisma.task.findMany({
      where: { id: { in: tasksId } },
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    // check if user has admin role
    const project = await prisma.project.findUnique({
      where: {
        id: tasks[0].projectId,
      },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({
          message: "You don't have admin permissions for this project.",
        });
    }

    const updatedTask = await prisma.task.deleteMany({
      where: { id: { in: tasksId } },
    });

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.code || err.message });
  }
};
