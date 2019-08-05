'use strict'

const Partida = require('../models/Partida');
const Helper = require('../helpers');

function get(req,res){
    
    let encoded_filter = req.params.filtro;
    var buff;
    var data_filter;
    var json_filter;
    try
    {
        
        buff = new Buffer(encoded_filter,'base64');
        data_filter = buff.toString('ascii');

        json_filter = JSON.parse(data_filter);

    }
    catch(error){
        res.status(500).send(error);
    }
    
    Partida.find(json_filter)
    .then((partidas)=>{
        res.status(200).send(partidas);
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

async function post(arrPartidas,entrada_id){

    var arrPartidas_id = [];
    
    await Helper.asyncForEach(arrPartidas,async function(partida){
        let nPartida = new Partida(partida);  
        nPartida.entrada_id = entrada_id;  
        await nPartida.save().then((partida)=>{
            arrPartidas_id.push(partida._id);
        });
    });
    return arrPartidas_id;

}

async function addSalida(salida,_id){
    
    await Partida.findOne({_id:_id}).then((partida)=>{

        partida.salidas_id.push(salida);
        partida.save();
        
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

async function getByEntrada(req,res){
    let entrada_id = req.params.entrada_id;

    Partida.find({entrada_id:entrada_id})
    .then((partidas)=>{
        res.status(200).send(partidas);
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}


module.exports = {
    get,
    post,
    addSalida,
    getByEntrada
}