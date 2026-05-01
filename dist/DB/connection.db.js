"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const config_1 = require("../config/config");
const connectDB = async () => {
    try {
        await (0, mongoose_1.connect)(config_1.DB_URI, { serverSelectionTimeoutMS: 30000 });
        console.log(`DB CONNECTED SUCCESSFULLY ⚡`);
    }
    catch (error) {
        console.log(`FAIL TO CONNECT ON DB >>> ${error}`);
    }
};
exports.default = connectDB;
