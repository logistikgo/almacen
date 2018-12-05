'use strict'

const Embalaje = require('../models/Embalaje');


function getEmbalajes(req,res){
	Embalaje.find({status:"ACTIVO"})
	.then((embalajes)=>{
		res.status(200).send(embalajes);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function saveEmbalaje(req,res){
	let nEmbalaje = new Embalaje();

	nEmbalaje.clave = req.body.clave;
	nEmbalaje.nombre = req.body.nombre;
	nEmbalaje.descripcion = req.body.descripcion;
	nEmbalaje.fechaAlta = new Date();
	nEmbalaje.usuarioAlta_id = req.body.usuarioAlta_id;
	nEmbalaje.nombreUsuario = req.body.nombreUsuario;
	nEmbalaje.status = "ACTIVO";

	nEmbalaje.save()
	.then((embalajeStored)=>{
		res.status(200).send(embalajeStored);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

module.exports = {
	getEmbalajes,
	saveEmbalaje
}