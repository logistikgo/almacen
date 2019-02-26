'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Interfaz_ALM_XD = Schema({
	nombre:String,
	alm_id:{type:Schema.ObjectId,ref:'Almacen'},
	xd_id : Number,
	tipo:String

},
{collection:'Interfaz_ALM_XD'}
);

module.exports = mongoose.model('Interfaz_ALM_XD',Interfaz_ALM_XD);