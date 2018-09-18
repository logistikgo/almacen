'use strict'
const Usuarios = require('../models/Usuario');

function get(req, res) {
	
	Usuarios.find({}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(usuario);
	});

}

function getByIDUsuario(req, res) {
	let _idUsuario = req.params.idUsuario;

	console.log(_idUsuario);

	Usuarios.find({IDUsuario:_idUsuario}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(usuario);
	});

}

module.exports = {
	get,
	getByIDUsuario
}