import express from "express"
import { addComment, getTaskComments } from "../controllers/comentController.js"

const commentRouter = express.Router()

commentRouter.post('/',addComment)

commentRouter.put('/:taskId',getTaskComments)



export default commentRouter