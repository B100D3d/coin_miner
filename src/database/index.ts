import { Sequelize } from "sequelize"
import Logger from "../utils/logger"
import { PROD } from "../config"

const host = process.env.PGHOST
const port = process.env.PGPORT
const name = process.env.PGDATABASE
const user = process.env.PGUSER
const pwd = process.env.PGPASSWORD
const sequelize = new Sequelize(
    `postgres://${user}:${pwd}@${host}:${port}/${name}`,
    {
        pool: { min: 0, max: 100, idle: 200000, acquire: 1000000 },
        logging: !PROD ? Logger.database : false,
    }
)

export default sequelize
