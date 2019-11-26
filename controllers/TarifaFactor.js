'use strict'

const TarifaFactor = require('../models/TarifaFactor');

function get(req,res){

    let cliente_id = req.params.cliente_id;
    TarifaFactor.find({cliente_id : cliente_id})
    .then(tarifas=> {
        res.status(200).send(tarifas);
    })
    .catch(error)
    { 
        res.status(500).send(error); 
    }
}

function post(req,res){
    
    let nTarifaPES = new TarifaFactor(req.body);

    nTarifaPES.save()
    .then(saved=> {
        res.status(201).send(saved);
    })
    .catch(error=>{
        req.status(500).send(error);
    });
}


function put(req,res){

    let _id = req.params._id;

    TarifaFactor.updateOne({_id : _id},{$set : req.body })
    .then(edited=>{
        res.status(200).send(edited);
    })
    .catch(error=>{
        res.status(500).send(error);
    });
}

function _delete(req,res){

    let _id = req.params._id;

    TarifaFactor.updateOne({_id : _id},{$set : {status : "BAJA"} })
    .then(edited=>{
        res.status(200).send(edited);
    })
    .catch(error=>{
        res.status(500).send(error);
    });
}

module.exports = {
    get,
    post,
    put,
    _delete
};