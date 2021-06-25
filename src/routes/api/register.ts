import { Router } from "express"
import { checkAccess } from "../../middlewares/checkAccess"
import { getCode, registerApi } from "../../controllers/register"

const registerRouter = Router()

registerRouter.post("send_code", checkAccess, getCode)
registerRouter.post("register_api", checkAccess, registerApi)

export default registerRouter
