import { Router } from "express"
import minerRouter from "./miner"
import registerRouter from "./register"
import authRouter from "./auth"

const apiRouter = Router()

apiRouter.use("/miner", minerRouter)
apiRouter.use("/register", registerRouter)
apiRouter.use("/auth", authRouter)

export default apiRouter
