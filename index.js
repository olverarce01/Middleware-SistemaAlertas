import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';


import * as dotenv from 'dotenv'
dotenv.config()

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";

import cron from 'node-cron';

// import morgan from "morgan";
import { primaria,secundaria } from './connections.js';
import userSchema from './schemas/User.schema.js';
import tokenSchema from './schemas/Token.schema.js';
import alertSchema from './schemas/Alert.schema.js';

const options = {
  definition: {
    info: {
      title: "Middleware Sistema de alertas",
      version: "0.1.0",
      description:
        "Este es el middleware para las bases de datos",
    }
  },
  apis: ["./*.js"],
};



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

function getDateChile(){
  const d = new Date();
  const localTime = d.getTime();
  const localOffset = d.getTimezoneOffset()*60000;
  const utc = localTime + localOffset;
  const offset = -4;
  const chile = utc + (3600000 * offset);
  const dateChile = new Date(chile)
  return dateChile;
}

primaria.on('connected',asyncHandler(async function(){
  if(secundariaReady){
    Promise.all([UserPrimaria.deleteMany({}),TokenPrimaria.deleteMany({}),AlertPrimaria.deleteMany({})])
    Promise.all([copyUsersModelAtoModelB(UserSecundaria,UserPrimaria),copyTokensModelAtoModelB(TokenSecundaria,TokenPrimaria),copyAlertsModelAtoModelB(TokenSecundaria,TokenPrimaria)])
    console.log("copy secundaria to primaria",getDateChile());
  }
  console.log('use primaria',getDateChile());
  User = UserPrimaria;
  Token = TokenPrimaria;
  Alert = AlertPrimaria;    
  primariaReady = true;
}))
primaria.on('disconnected',function(){
  if(!secundariaReady){
    throw new Error('Any Database connected',getDateChile());
  }else{
    console.log('use secundaria',getDateChile());
    User = UserSecundaria;
    Token = TokenSecundaria;
    Alert = AlertSecundaria;        
  }
  primariaReady = false;
});
secundaria.on('connected', function(){secundariaReady = true;});
secundaria.on('disconnected', function(){secundariaReady = false;if(!primariaReady){throw new Error('Any Database connected',getDateChile());}});

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


const app = express();
mongoose.set('strictQuery',false);

const specs = swaggerJsdoc(options);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

cron.schedule('00 12 * * *',()=>{
  if(primariaReady && secundariaReady){
    Promise.all([UserSecundaria.deleteMany({}),TokenSecundaria.deleteMany({}),AlertSecundaria.deleteMany({})])
    Promise.all([copyUsersModelAtoModelB(UserPrimaria,UserSecundaria),copyTokensModelAtoModelB(TokenPrimaria,TokenSecundaria)],copyAlertsModelAtoModelB(AlertPrimaria,AlertSecundaria));
    console.log('copy primaria to secundaria', getDateChile());
    }
},{
  scheduled: true,
  timezone: "America/Santiago"
}

)

//O.K
// app.use(asyncHandler(async function(req, res, next){
//   if(!datesAreOnSameDay(currentDay,new Date())){
//     console.log(currentDay, new Date());
//     if(primariaReady && secundariaReady){

//     Promise.all([UserSecundaria.deleteMany({}),TokenSecundaria.deleteMany({}),AlertSecundaria.deleteMany({})])
//     Promise.all([copyUsersModelAtoModelB(UserPrimaria,UserSecundaria),copyTokensModelAtoModelB(TokenPrimaria,TokenSecundaria)],copyAlertsModelAtoModelB(AlertPrimaria,AlertSecundaria));
//     console.log('copy primaria to secundaria');


//     }
//     currentDay= new Date();
//   }
//   next();
// }));

app.use(cors());
// app.use(morgan('tiny'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


/** 
 * @swagger
 * /users/:
 *  get:
 *    tags:
 *      - Usuarios
 *    summary: Obtiene datos de un usuario
 *    description: Obtiene (_id, username, name, address, password)
*/
app.get('/users/', async function(req,res){
  const users = await User.find({}).select('-password');
  res.json(users);
});
/** 
 * @swagger
 * /users/one/byUsername:
 *    post:
 *      tags:
 *      - Usuarios
 *      summary: Obtiene datos de un usuario por username
 *      description: Necesita username. Obtiene (_id, username, name, address, password)
 *      parameters:
 *      - in: body
 *      name: username
*/
app.post('/users/one/byUsername', async function(req,res){
  const username = req.body.username;
  const user = await User.findOne({username: username});
  res.json(user);
});
/** 
 * @swagger
 *  /users/one:
 *    post:
 *      tags:
 *      - Usuarios
 *      summary: Obtiene datos de un usuario por id con findOne()
 *      description: Necesita id. Obtiene (_id, username, name, address, password)
 *      parameters:
 *      - in: body
 *      name: id
*/
app.post('/users/one/', async function(req,res){
  const id = new mongoose.Types.ObjectId(req.body.id);
  const user = await User.findOne({_id: id}).select('-password');
  res.json(user);
});
/** 
 * @swagger
 *  /users/byId:
 *    post:
 *      tags:
 *      - Usuarios
 *      summary: Obtiene datos de un usuario por id con findById()
 *      description: Necesita id. Obtiene (_id, username, name, address)
 *      parameters:
 *      - in: body
 *      name: id
*/
app.post('/users/byId/', async function(req,res){
  const id = req.body.id;
  const user = await User.findById(id).select('-password');
  res.json(user);
});


/** 
 * @swagger
 *  /users/save:
 *  post:
 *    tags:
 *    - Usuarios
 *    summary: Guarda un Usuario
 *    description: Guarda Usuario con (username, name, address, password), retorna el Usuario creado.
 *    parameters:
 *      - in: body
 *        name: username
 *      - in: body
 *        name: name
 *      - in: body
 *        name: address
 *      - in: body
 *        name: password
*/
app.post('/users/save', async function(req,res){
  const {username, name, address, password} = req.body;
  const user = await User({username, name, address, password});
  user.save();
  res.json(user);
});


/** 
 * @swagger
 *  /alerts/:
 *  get:
 *    tags:
 *    - Alertas
 *    summary: Obtiene todas las alertas
 *    description: Obtiene todas las alerta, cada una con (sender,createdAt, updatedAt)
*/
app.get('/alerts/', async function(req,res){
  const alerts = await Alert.aggregate([
    {
      $lookup: 
      {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "alertAndSender"
      }
    },
    {$unwind: "$alertAndSender"}

  ])
  const alertsModificated = alerts.map(alert=>{
    return {
      _id: alert._id,
      name: alert.alertAndSender.name,
      address: alert.alertAndSender.address,
      date: alert.date
    }
  });
  res.json(alertsModificated);
  
});

/** 
 * @swagger
 *  /alerts/save:
 *  post:
 *    tags:
 *    - Alertas
 *    summary: Guarda una alerta
 *    description: Guarda una alerta con el senderId. Retorna la alerta guardada
 *    parameters:
 *    - in: body
 *    name: senderId
*/
app.post('/alerts/save', async function(req,res){
  const {senderId} = req.body;
  const alert = new Alert({
    sender: new mongoose.Types.ObjectId(senderId),
    date: getDateChile()
  });
  await alert.save();
  res.json(alert);
});

/** 
 * @swagger
 *  /tokens/:
 *  get:
 *    tags:
 *    - Tokens
 *    summary: Obtener todos los tokens Firebase
 *    description: Obtiene todos los tokens de usuarios suscritos a notificaciones
*/

app.get('/tokens/', async function(req,res){
  const tokens = await Token.find({});
  res.json(tokens);
});


/** 
 * @swagger
 *  /tokens/one/:token:
 *  get:
 *    tags:
 *    - Tokens
 *    summary: Obtiene un token segun un token
 *    description: Obtiene un token pasando token
 *    parameters:
 *    - in: path
 *    name: token
*/
app.get('/tokens/one/:token', async function(req,res){
  const token = await Token.findOne({token: req.params.token});
  res.json(token);  
});

/** 
 * @swagger
 *  /tokens/save:
 *  post:
 *    tags:
 *    - Tokens
 *    summary: Guarda un token de Firebase
 *    description: Guarda una token. necesita un token. Retorna el token creado
 *    parameters:
 *    - in: path
 *    name: token
*/
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