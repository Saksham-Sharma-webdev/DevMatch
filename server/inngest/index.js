import { Inngest } from "inngest";
import prisma from "../config/db.js"

// Create a client to send and receive events
export const inngest = new Inngest({ id: "dev-match" });

// ingest fn to update user data in db
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  }, 
  async({event})=>{
    const {data} = event
    await prisma.user.create({
      data: {
        id: data?.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url
      }
    })
  }
)

// ingest fn to delete user data in db
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-from-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  }, 
  async({event})=>{
    const {data} = event
    await prisma.user.delete({
      where:{
        id: data.id
      }
    })
  }
)

// ingest fn to update user data in db
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  }, 
  async({event})=>{
    const {data} = event
    await prisma.user.update({
      where:{
        id: data.id 
      },
      data: {
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url
      }
    })
  }
)

// ingest fn to delete user data in db
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.created" }],
  }, 
  async({event})=>{
    const {data} = event
    await prisma.workspace.create({
      data:{
        id:data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url
      }
    })

    // adding creator as admin
    await prisma.workspace.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN"
      }
    })
  }
)

// ingest fn to update workspace data in database
const syncWorkspaceUpdation = inngest.createFunction(
  {id: "update-workspace-from-clerk",
  triggers:[{event: "clerk/organization.updated"}]
  },
  async({event})=>{
    const {data} = event;
    await prisma.workspace.update({
      where:{
        id: data.id
      },
      data:{
        name: data.name,
        slug: data.slug,
        image_url: data.image_url
      }
    })
  }
)


// ingest fn to delete workspace data in database
const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "delete-workspace-from-clerk",
    triggers:[{event: "clerk/organization.deleted"}]
  },
  async({event})=>{
    const {data} = event;
    await prisma.workspace.delete({
      where:{
        id: data.id
      }
    })
  }
)

// ingest fn to save workspace member data in database
const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-from-clerk",
  triggers:[{event: "clerk/organizationInvitation.accepted"}]
  },
  async({event})=>{
    const {data} = event;
    await prisma.workspace.create({
      data:{
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase()
      }
    })
  }
)



// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation
];