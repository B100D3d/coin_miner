import { Router } from "express"
import { auth, login } from "../../controllers/auth"

const authRouter = Router()

authRouter.use("/login", login)
authRouter.use("/auth", auth)

export default authRouter
