import { Router } from "express"
import minerRouter from "./miner"
import registerRouter from "./register"

const apiRouter = Router()

apiRouter.use("/miner", minerRouter)
apiRouter.use("/register", registerRouter)

export default apiRouter
