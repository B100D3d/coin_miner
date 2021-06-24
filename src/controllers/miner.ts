import { RequestHandler } from "express"

export const getMiners: RequestHandler = (req, res) => {
    res.status(200).json({ miners: [] })
}
