import * as dotenv from 'dotenv'
dotenv.config()

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";

// import morgan from "morgan";
import { primaria,secundaria } from './connections.js';
import userSchema from './schemas/User.schema.js';
import tokenSchema from './schemas/Token.schema.js';
import alertSchema from './schemas/Alert.schema.js';

var UserPrimaria = primaria.model('User',userSchema);
var TokenPrimaria = primaria.model('Token', tokenSchema);
var AlertPrimaria = primaria.model('Alert', alertSchema);    
var UserSecundaria = secundaria.model('User',userSchema);
var TokenSecundaria = secundaria.model('Token', tokenSchema);
var AlertSecundaria = secundaria.model('Alert', alertSchema);    



var User = UserPrimaria;
var Token = TokenPrimaria;
var Alert = AlertPrimaria;    

var primariaReady = true;
var secundariaReady = true;

primaria.on('connected',asyncHandler(async function(){
  console.log('use primaria');
  if(secundariaReady){
    Promise.all([UserPrimaria.deleteMany({}),TokenPrimaria.deleteMany({}),AlertPrimaria.deleteMany({})])
    Promise.all([copyUsersModelAtoModelB(UserSecundaria,UserPrimaria),copyTokensModelAtoModelB(TokenSecundaria,TokenPrimaria),copyAlertsModelAtoModelB(TokenSecundaria,TokenPrimaria)])
    console.log("copy secundaria to primaria");
  }
  User = UserPrimaria;
  Token = TokenPrimaria;
  Alert = AlertPrimaria;    
  primariaReady = true;
}))
primaria.on('disconnected',function(){
  if(!secundariaReady){
    throw new Error('Any Database connected');
  }else{
    console.log('use secundaria');
    User = UserSecundaria;
    Token = TokenSecundaria;
    Alert = AlertSecundaria;        
  }
  primariaReady = false;
});
secundaria.on('connected', function(){secundariaReady = true;});
secundaria.on('disconnected', function(){secundariaReady = false;if(!primariaReady){throw new Error('Any Database connected');}});

const datesAreOnSameDay = (first, second) => {
  return (first.getFullYear()===second.getFullYear()
  && first.getMonth()===second.getMonth()
  && first.getDate()===second.getDate()
  );
}
const copyUsersModelAtoModelB = async(ModelA,ModelB) =>{
  const users = await ModelA.find({});
  Promise.all(users.map(async (user)=>{
    const userB = new ModelB({
      username: user.username,
      name: user.name,
      address: user.address,
      password: user.password,
    });
    await userB.save();
  }));
}
const copyTokensModelAtoModelB = async(ModelA,ModelB) =>{
  const tokens = await ModelA.find({});
  Promise.all(tokens.map(async (token)=>{
    const tokenB = new ModelB({
      token: token.token
    });
    await tokenB.save();
  }));
}
const copyAlertsModelAtoModelB = async(ModelA,ModelB) =>{
  const alerts = await ModelA.find({});
  Promise.all(alerts.map(async (alert)=>{
    const alertB = new ModelB({
      sender: alert.sender,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt
    });
    await alertB.save();
  }));
}

var currentDay = new Date();
currentDay.setDate(currentDay.getDate()-1);

const app = express();
mongoose.set('strictQuery',false);

//O.K
app.use(asyncHandler(async function(req, res, next){
  if(!datesAreOnSameDay(currentDay,new Date())){
    console.log(currentDay, new Date());
    if(primariaReady && secundariaReady){

    Promise.all([UserSecundaria.deleteMany({}),TokenSecundaria.deleteMany({}),AlertSecundaria.deleteMany({})])
    Promise.all([copyUsersModelAtoModelB(UserPrimaria,UserSecundaria),copyTokensModelAtoModelB(TokenPrimaria,TokenSecundaria)],copyAlertsModelAtoModelB(AlertPrimaria,AlertSecundaria));
    console.log('copy primaria to secundaria');


    }
    currentDay= new Date();
  }
  next();
}));

app.use(cors());
// app.use(morgan('tiny'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


//O.K
app.get('/users/', async function(req,res){
  const users = await User.find({});
  res.json(users);
});


app.post('/users/one/byUsername', async function(req,res){
  const username = req.body.username;
  const user = await User.findOne({username: username});
  res.json(user);
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
  res.json(user);
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