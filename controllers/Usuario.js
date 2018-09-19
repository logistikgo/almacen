'use strict'
const Usuario = require('../models/Usuario');

function get(req, res) {
	
	Usuario.model.find({}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(usuario);
	});

}

function getByIDUsuario(req, res) {
	let _idUsuario = req.params.idusuario;

	console.log(_idUsuario);

	Usuario.model.find({IDUsuario:_idUsuario}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(usuario);
	});

}


async function save(req,res){
	let nUsuario = new Usuario.model();
	let max = 0;

	nUsuario.IDUsuario = await Usuarios.getNextID();
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
	let _idUsuario = req.body.IDUsuario;
	let item = {
		Nombre : req.body.Nombre,
		NombreUsuario : req.body.NombreUsuario,
		Correo: req.body.Correo,
		TipoUsuario: req.body.TipoUsuario
	}
	Usuario.model.updateOne({IDUsuario:_idUsuario},{$set:item}, (error,usuario) => {
		if(error)
			return res.status(500).send({message:"Error"});
		res.status(200).send(item);
	});
}

function _delete(req,res){
	let _idUsuario = req.params.IDUsuario;

	Usuario.model.findOne({IDUsuario:_idUsuario, StatusReg : "ACTIVO"})
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
	_delete,
	update
}