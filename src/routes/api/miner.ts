import { Router } from "express"
import { checkAccess } from "../../middlewares/checkAccess"
import { getMiners } from "../../controllers/miner"

const minerRouter = Router()

minerRouter.get("/miners", checkAccess, getMiners)

export default minerRouter
