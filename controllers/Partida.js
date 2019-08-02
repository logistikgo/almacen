'use strict'

const Partida = require('../models/Partida');

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

function post(arrPartidas,entrada_id){

    arrPartidas.forEach(function(partida){
        let nPartida = new Partida(partida);  
        nPartida.entrada_id = entrada_id;  
        nPartida.save();
    });
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

module.exports = {
    get,
    post,
    addSalida
}