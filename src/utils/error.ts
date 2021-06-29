import { Response } from "express"
import { Transaction } from "sequelize"
import { serializeError } from "serialize-error"
import Logger from "./logger"

export const serverError = async (
    res: Response,
    e: Error,
    transaction?: Transaction
) => {
    Logger.error("Server error", e)
    await transaction?.rollback()
    res.status(500).json({
        message: "Server error",
        error: serializeError(e),
    })
}

export const error = async (
    res: Response,
    status: number,
    message: string,
    transaction?: Transaction
) => {
    Logger.error("Response error: ", {
        status,
        message,
        baseUrl: res.req.baseUrl,
    })
    await transaction?.rollback()
    return res.status(status).json({
        message,
    })
}
