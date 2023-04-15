import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  address: String,
  password: String,
});


export default userSchema;