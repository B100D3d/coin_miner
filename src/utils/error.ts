import { Response } from "express"
import { Transaction } from "sequelize"
import Logger from "./logger"

export const serverError = async (
    res: Response,
    e: Error,
    transaction?: Transaction
) => {
    Logger.error("Server error", e)
    await transaction?.rollback()
    res.status(500).json({
        error: "Server error",
    })
}

export const error = async (
    res: Response,
    status: number,
    err: string,
    transaction?: Transaction
) => {
    Logger.error("Response error: ", {
        status,
        err,
        baseUrl: res.req.baseUrl,
    })
    await transaction?.rollback()
    return res.status(status).json({
        err,
    })
}
