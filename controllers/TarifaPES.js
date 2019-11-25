'use strict'

const TarifaPES = require('../models/TarifaPES');


function get(req,res){

    TarifaPES.find({status : "ACTIVO"})
    .then(tarifas=> {
        res.status(200).send(tarifas);
    })
    .catch(error)
    { 
        res.status(500).send(error); 
    }
}

module.exports = {
    get
};