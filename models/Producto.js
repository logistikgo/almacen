'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Producto = Schema({
	idClienteFiscal:Number
},
{collection:'Productos'}
);

module.exports = mongoose.model('Productos',Producto);