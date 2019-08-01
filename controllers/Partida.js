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

function save(req,res){
    let nPartida = new Partida(req.body);

    nPartida.save()
    .then((partida)=>{
        res.status(201).send(partida);
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

module.exports = {
    get
}