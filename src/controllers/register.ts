import { RequestHandler } from "express"
import { error, serverError } from "../utils/error"
import TelegramApiReg from "../services/TelegramApiReg"

export const getCode: RequestHandler = async (req, res) => {
    try {
        const phone = req.body.phone
        const hash = await TelegramApiReg.sendCode(phone)

        res.status(200).json({
            hash,
        })
    } catch (e) {
        await serverError(res, e)
    }
}

export const registerApi: RequestHandler = async (req, res) => {
    try {
        const { phone, code, hash } = req.body

        const api = await TelegramApiReg.createApi(phone, code, hash)
        if (!api) return error(res, 400, "Empty result")

        res.status(200).json({
            apiId: api.apiId,
            apiHash: api.apiHash,
        })
    } catch (e) {
        await serverError(res, e)
    }
}
