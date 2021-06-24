import { RequestHandler, Send } from "express"

export const checkAccess: RequestHandler = (req, res, next): void => {
    const token = req.cookies["X-Refresh-Token"]

    if (!token) {
        res.status(401).json({
            error: "No cookie",
        })
    }

    next()
}
