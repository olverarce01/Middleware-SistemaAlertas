import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: Date
}

);


export default alertSchema;