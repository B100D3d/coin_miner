import { Router } from "express"
import { checkAccess } from "../../middlewares/checkAccess"
import { getLogs, getMiners, startStopMiners } from "../../controllers/miner"

const minerRouter = Router()

minerRouter.get("/miners", checkAccess, getMiners)
minerRouter.get("/logs", checkAccess, getLogs)
minerRouter.post("/start_stop", checkAccess, startStopMiners)

export default minerRouter
