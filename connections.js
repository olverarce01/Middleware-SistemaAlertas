import mongoose from "mongoose";
import * as dotenv from 'dotenv'
dotenv.config()

var primaria;
var secundaria;
try{
  //railway
  primaria = await mongoose.createConnection(process.env.MONGODB,{useNewUrlParser:true}).asPromise();

}catch(err){console.log(err);}
try{
  //localhost
  secundaria = await mongoose.createConnection("mongodb://localhost:27017/alertaDB",{useNewUrlParser:true}).asPromise();

}catch(err){console.log(err);}



export {primaria, secundaria};