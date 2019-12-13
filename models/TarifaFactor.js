'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaFactor = Schema({
    cliente_id : {type: Schema.ObjectId,ref : 'ClienteFiscal'},
    embalaje_id : {type: Schema.ObjectId,ref : 'Embalaje'},
    tipoCambio : String,
    factor : Number,
    usuarioAlta_id: Number,
	usuarioAlta: String,
    usuarioBaja_id : Number,
    fechaAlta : {type : Date, default : new Date()},
    fechaBaja : Date,
    status : {type: String, default : "ACTIVO"}
},
{
    collection : 'TarifasFactor'
});

module.exports = mongoose.model('TarifaFactor',TarifaFactor);
