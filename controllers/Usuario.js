'use strict'
const Usuario = require('../models/Usuario');
const Helper = require('../helpers');

async function getNextID(){
	
	return await Helper.getNextID(Usuario,"idUsuario");
}

function get(req, res) {
	
	Usuario.find({statusReg:"ACTIVO"}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(usuario);
	});

}

function getByIDUsuario(req, res) {
	let _idUsuario = req.params.idusuario;

	console.log(_idUsuario);

	Usuario.find({idUsuario:_idUsuario}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(usuario[0]);
	});

}


async function save(req,res){
	let nUsuario = new Usuario();
	let max = 0;

	nUsuario.idUsuario = await getNextID();
	nUsuario.nombre = req.body.nombre;
	nUsuario.nombreUsuario = req.body.nombreUsuario;
	nUsuario.correo = req.body.correo;
	nUsuario.tipoUsuario = req.body.tipoUsuario;
	nUsuario.isBloqueado = 0;
	nUsuario.statusReg = "ACTIVO";
	nUsuario.idUsuarioAlta = req.body.idUsuarioAlta;
	nUsuario.idUsuarioEdicion = 0;
	nUsuario.fechaAlta = new Date();
	nUsuario.contrasena = req.body.contrasena;

	nUsuario.save((error, usuarioStored)=>{
		if(error)
			res.status(500).send({message:`Error al guardar${error}`});

		res.status(200).send({usuarioStored});
	});


	/*
	let query = Usuarios.find();
	let orderedUsuarios = await query.sort({IDUsuario:-1}).exec();
	max = orderedUsuarios[0].IDUsuario;*/
	/* Version 8
	Usuarios.find().sort({IDUsuario:-1}).exec((err,usuarios)=>{
		if(err){
			res.send(500);
		}
		max = usuarios[0].IDUsuario;
		nUsuario.IDUsuario = max + 1;
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
	});*/
}

function update(req,res){
	let _idUsuario = req.body.idUsuario;
	let item = {
		nombre : req.body.nombre,
		nombreUsuario : req.body.nombreUsuario,
		correo: req.body.correo,
		tipoUsuario: req.body.tipoUsuario,
		idUsuarioEdicion:req.body.idUsuarioEdicion
	}
	Usuario.updateOne({idUsuario:_idUsuario},{$set:item}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});
		res.status(200).send(item);
		console.log(item);
	});
}

function _delete(req,res){
	let _idUsuario = req.body.idUsuario;

	let item = {
		statusReg:"BAJA"
	}
	Usuario.updateOne({idUsuario:_idUsuario},{$set:item}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});
		res.status(200).send(item);
	});
	
}

module.exports = {
	get,
	getByIDUsuario,
	save,
	_delete,
	update
}