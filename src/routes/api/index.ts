import { Router } from "express"
import minerRouter from "./miner"

const apiRouter = Router()

apiRouter.use("/miner", minerRouter)

export default apiRouter
