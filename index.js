import * as dotenv from 'dotenv'
dotenv.config()

import mongoose from "mongoose";
import express from "express";
import cors from "cors";

import morgan from "morgan";
import { primaria,secundaria } from './connections.js';
import userSchema from './schemas/User.schema.js';
import tokenSchema from './schemas/Token.schema.js';
import alertSchema from './schemas/Alert.schema.js';

var User = primaria.model('User',userSchema);
var Token = primaria.model('Token', tokenSchema);
var Alert = primaria.model('Alert', alertSchema);    

var primariaReady = true;
var secundariaReady = true;

primaria.on('connected',function(){
  console.log('use primaria');
  User = primaria.model('User',userSchema);
  Token = primaria.model('Token', tokenSchema);
  Alert = primaria.model('Alert', alertSchema);    

  primariaReady = true;
});
primaria.on('disconnected',function(){
  if(!secundariaReady){
    throw new Error('Any Database connected');
  }else{
    console.log('use secundaria');
    User = secundaria.model('User',userSchema);
    Token = secundaria.model('Token', tokenSchema);
    Alert = secundaria.model('Alert', alertSchema);        
  }
  primariaReady = false;
});
secundaria.on('connected', function(){secundariaReady = true;});
secundaria.on('disconnected', function(){secundariaReady = false;if(!primariaReady){throw new Error('Any Database connected');}});


const app = express();
mongoose.set('strictQuery',false);
app.use(cors());

app.use(morgan('tiny'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//O.K
app.get('/users/', async function(req,res){
  const users = await User.find({});
  res.json(users);
});
//O.K
app.post('/users/one/', async function(req,res){
  const id = new mongoose.Types.ObjectId(req.body.id);
  const user = await User.findOne({_id: id});
  res.json(user);
});
//O.K
app.post('/users/byId/', async function(req,res){
  const id = req.body.id;
  const user = await User.findById(id).select('-password');
  res.json(user);
});


//O.K
app.post('/users/save', async function(req,res){
  const {username, name, address, password} = req.body;
  const user = await User({username, name, address, password});
  user.save();
  res.json({user});
});
//O.K
app.get('/alerts/', async function(req,res){
  const alerts = await Alert.find({});
  res.json(alerts);
});

//O.K
app.post('/alerts/save', async function(req,res){
  const {senderId} = req.body;
  const alert = new Alert({
    sender: new mongoose.Types.ObjectId(senderId)
  });
  await alert.save();
  res.json(alert);
});

//O.K
app.get('/tokens/', async function(req,res){
  const tokens = await Token.find({});
  res.json(tokens);
});

//O.K
app.get('/tokens/one/:token', async function(req,res){
  const token = await Token.findOne({token: req.params.token});
  res.json(token);  
});

//O.K
app.post('/tokens/save', async function(req,res){
  const token = req.body.token;
  const myToken = new Token({token});
  await myToken.save();  
  res.json(myToken);
});


const port = process.env.PORT || 4001;
app.listen(port, function(){
  console.log('running server on port '+ port);
});