import Sequelize, { Model, DataTypes, Transaction } from "sequelize"
import moment from "moment"
import db from "../index"
import { DBTry } from "../../utils/database"

interface JoinedChannelsAttributes {
    phone: string
    joinedCount: number
    lastJoinedDate: Date
}

interface JoinedChannelsCreationAttributes {
    phone: string
}

class JoinedChannels
    extends Model<JoinedChannelsAttributes, JoinedChannelsCreationAttributes>
    implements JoinedChannelsAttributes
{
    phone!: string
    joinedCount!: number
    lastJoinedDate!: Date

    @DBTry("Can't get joined count")
    static async getJoinedCount(phone: string) {
        const where = { phone }
        const account = await JoinedChannels.findOne({
            where,
        })
        if (!account) return 0
        let count = account.joinedCount
        if (account.lastJoinedDate < moment().subtract(1, "hour").toDate()) {
            await JoinedChannels.update(
                { joinedCount: 0, lastJoinedDate: moment().toDate() },
                { where }
            )
            count = 0
        }
        return count
    }

    @DBTry("Can't increment joined count")
    static async incrementJoinedCount(phone: string, transaction: Transaction) {
        const where = { phone }
        await JoinedChannels.increment(
            { joinedCount: 1 },
            { where, transaction }
        )
        await JoinedChannels.update(
            { lastJoinedDate: moment().toDate() },
            { where, transaction }
        )
    }
}

JoinedChannels.init(
    {
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        joinedCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        lastJoinedDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
    },
    {
        modelName: "JoinedChannels",
        sequelize: db,
        timestamps: false,
        updatedAt: false,
        tableName: "joined_channels",
        underscored: true,
    }
)

export default JoinedChannels
