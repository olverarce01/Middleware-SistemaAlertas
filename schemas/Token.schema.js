import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  token: String
});


export default tokenSchema;