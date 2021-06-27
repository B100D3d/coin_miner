import { Model, DataTypes, Optional } from "sequelize"
import moment from "moment"
import db from "../index"
import { DBTry } from "../../utils/database"

interface JoinedChannelsAttributes {
    phone: string
    joinedCount: number
    lastJoinedDate: Date
}

class JoinedChannels
    extends Model<JoinedChannelsAttributes, JoinedChannelsAttributes>
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

    @DBTry("Can't set joined count")
    static async setJoinedCount(phone: string, joinedCount: number) {
        await JoinedChannels.update(
            { joinedCount, lastJoinedDate: moment().toDate() },
            { where: { phone } }
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
