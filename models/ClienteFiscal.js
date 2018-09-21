'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

const ClienteFiscal = Schema({
	IDCliente:Number,
	
},
{collection:'ClientesFiscales'}
);