import { connect } from "mongoose";
import { DB_URI } from "../config/config";

const connectDB = async () => {
  try {
    await connect(DB_URI, { serverSelectionTimeoutMS: 30000 });

    console.log(`DB CONNECTED SUCCESSFULLY ⚡`);
  } catch (error) {
    console.log(`FAIL TO CONNECT ON DB >>> ${error}`);
  }
};

export default connectDB;
