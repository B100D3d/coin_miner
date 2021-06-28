import { Model, DataTypes, Optional, Transaction } from "sequelize"
import db from "../index"
import { DBTry } from "../../utils/database"
import Statistics from "./Statistics"
import JoinedChannels from "./JoinedChannels"

interface SessionAttributes {
    id: number
    phone: string
    apiId: string
    apiHash: string
    token: string
}
type SessionCreationAttributes = Optional<SessionAttributes, "id">

class Session
    extends Model<SessionAttributes, SessionCreationAttributes>
    implements SessionAttributes
{
    id!: number
    phone!: string
    apiId!: string
    apiHash!: string
    token!: string

    @DBTry("Can't get sessions")
    static async getSessions() {
        return Session.findAll()
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
