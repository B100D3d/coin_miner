import { Router } from "express"
import { checkAccess } from "../../middlewares/checkAccess"
import { getLogs, getMiners } from "../../controllers/miner"

const minerRouter = Router()

minerRouter.get("/miners", checkAccess, getMiners)
minerRouter.get("/logs", checkAccess, getLogs)

export default minerRouter
