import Sequelize, { Model, DataTypes, Transaction } from "sequelize"
import moment from "moment"
import db from "../index"
import { DBTry } from "../../utils/database"

interface EntitiesRequestsAttributes {
    phone: string
    requestsCount: number
    lastRequestDate: Date
}

interface EntitiesRequestsCreationAttributes {
    phone: string
}

class EntitiesRequests
    extends Model<
        EntitiesRequestsAttributes,
        EntitiesRequestsCreationAttributes
    >
    implements EntitiesRequestsAttributes
{
    phone!: string
    requestsCount!: number
    lastRequestDate!: Date

    @DBTry("Can't get request count")
    static async getRequestCount(phone: string) {
        const where = { phone }
        const account = (
            await EntitiesRequests.findOne({
                where,
            })
        )?.toJSON() as EntitiesRequestsAttributes
        if (!account) return 0
        let count = account.requestsCount
        if (account.lastRequestDate < moment().subtract(24, "hours").toDate()) {
            await EntitiesRequests.update(
                { requestsCount: 0, lastRequestDate: moment().toDate() },
                { where }
            )
            count = 0
        }
        return count
    }

    @DBTry("Can't increment request count")
    static async incrementRequestCount(
        phone: string,
        transaction: Transaction
    ) {
        const where = { phone }
        await EntitiesRequests.update(
            {
                requestsCount: Sequelize.literal("requests_count + 1") as any,
                lastRequestDate: moment().toDate(),
            },
            { where, transaction }
        )
    }
}

EntitiesRequests.init(
    {
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        requestsCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        lastRequestDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
    },
    {
        modelName: "EntitiesRequests",
        sequelize: db,
        timestamps: false,
        updatedAt: false,
        tableName: "entities_requests",
        underscored: true,
    }
)

export default EntitiesRequests
