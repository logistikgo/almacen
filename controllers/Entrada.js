'use strict'

const Entrada = require('../models/Entrada');

function get( req,res){
	Entrada.find({}, (error,producto)=>{
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);

	});
};

module.exports = {
	get
}