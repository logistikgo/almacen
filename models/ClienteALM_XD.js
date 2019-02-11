'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteALM_XD = Schema({
	alm_id:{type:Schema.ObjectId,ref:'Almacen'},
	xd_id : Number

},
{collection:'ClientesALM_XD'}
);

module.exports = mongoose.model('ClienteALM_XD',ClienteALM_XD);