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

function save(req,res){
	let nUsuario = new Usuario();

	let lastID = nUsuario.find().sort({age:-1}).limit(1);
	nUsuario.IDUsuario = lastID + 1;
	nUsuario.Nombre = req.body.Nombre;
	nUsuario.NombreUsuario = req.body.NombreUsuario;
	nUsuario.Correo = req.body.Correo;
	nUsuario.TipoUsuario = req.body.TipoUsuario;
	nUsuario.IsBloqueado = 0;
	nUsuario.StatusReg = "ACTIVO";

	nUsuario.save((error, usuarioStored)=>{
		if(error)
			res.status(500).send({message:`Error al guardar${error}`});

		res.status(200).send({usuarioStored});
	});
}

function delete(req,res){
	let _idUsuario = req.params.IDUsuario;

	Usuarios.findOne({IDUsuario:_idUsuario, StatusReg : "ACTIVO"})
	.then((usuario)=>{
		console.log(usuario);
		usuario.StatusReg = "BAJA";

		usuario.save().then(()=>{

			res.status(200).send(usuario);

		}).catch((error)=>{

			res.status(500).send(error);

		});
	});
}

module.exports = {
	get,
	getByIDUsuario,
	save,
	delete
}