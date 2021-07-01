import Sequelize, { Model, DataTypes, Optional, Transaction } from "sequelize"
import db from "../index"
import { DBTry } from "../../utils/database"
import Statistics from "./Statistics"
import JoinedChannels from "./JoinedChannels"

export interface SessionAttributes {
    id: number
    phone: string
    apiId: string | number
    apiHash: string
    token: string
    createdAt: Date
}
type SessionCreationAttributes = Optional<SessionAttributes, "id" | "createdAt">

class Session
    extends Model<SessionAttributes, SessionCreationAttributes>
    implements SessionAttributes
{
    id!: number
    phone!: string
    apiId!: string | number
    apiHash!: string
    token!: string
    createdAt!: Date

    @DBTry("Can't get sessions")
    static async getSessions() {
        return Session.findAll()
    }

    @DBTry("Can't get session")
    static async getSession(phone: string) {
        return Session.findOne({ where: { phone } })
    }

    @DBTry("Can't create session")
    static async createSession(
        payload: SessionCreationAttributes,
        transaction: Transaction
    ) {
        const session = await Session.create(payload, { transaction })
        await Statistics.create({ phone: payload.phone }, { transaction })
        await JoinedChannels.create({ phone: payload.phone }, { transaction })
        return session
    }
}

Session.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        apiId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        apiHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        token: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
    },
    {
        modelName: "Session",
        sequelize: db,
        timestamps: false,
        updatedAt: false,
        tableName: "sessions",
        underscored: true,
    }
)

export default Session
