import { Model, DataTypes } from "sequelize"
import db from "../index"
import { DBTry } from "../../utils/database"

class Session extends Model {
    @DBTry("Can't get sessions")
    static async getSession() {
        return Session.findAll()
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
