'use strict'
const ClienteFiscal = require('../models/ClienteFiscal');

function get(req, res) {
	
	ClienteFiscal.model.find({StatusReg:"ACTIVO"}, (error,cliente) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(cliente);
	});
}

function getByIDCteFiscal(req, res) {
	let _idCliente = req.params.idCliente;

	console.log(_idCliente);

	ClienteFiscal.model.find({IDCliente:_idCliente}, (error,cliente) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(cliente[0]);
	});

}


async function save(req,res){
	let nCliente = new ClienteFiscal.model();

	nCliente.IDCliente = await ClienteFiscal.getNextID();
	nCliente.IDUsuarioAlta = req.body.IDUsuarioAlta;
	nCliente.IDSucursal = 1;
	nCliente.FechaAlta = new Date();
	nCliente.FechaElimina = new Date("0000-00-00");
	nCliente.FechaEdita = new Date("0000-00-00");
	nCliente.NombreCorto = req.body.NombreCorto;
	nCliente.NombreComercial = req.body.NombreComercial;
	nCliente.RazonSocial = req.body.RazonSocial;
	nCliente.RFC = req.body.RFC;
	nCliente.Calle = req.body.Calle;
	nCliente.NumExt = req.body.NumExt;
	nCliente.NumInt = req.body.NumInt;
	nCliente.CP = req.body.CP;
	nCliente.Colonia = req.body.Colonia;
	nCliente.Municipio = req.body.Municipio;
	nCliente.Estado = req.body.Estado;
	nCliente.Pais = req.body.Pais;
	nCliente.StatusReg = "ACTIVO";

	nCliente.save((error, clienteStored)=>{
		if(error)
			res.status(500).send({message:`Error al guardar${error}`});

		res.status(200).send({clienteStored});
	});
}

function update(req,res){
	let _idCliente = req.body.IDCliente;

	let item = {
		FechaEdita:new Date(),
		NombreCorto : req.body.NombreCorto,
		NombreComercial : req.body.NombreComercial,
		RazonSocial: req.body.RazonSocial,
		RFC: req.body.RFC,
		Calle:req.body.Calle,
		NumInt:req.body.NumInt,
		NumExt:req.body.NumExt,
		CP:req.body.CP,
		Colonia:req.body.Colonia,
		Municipio:req.body.Municipio,
		Estado:req.body.Estado,
		Pais:req.body.Pais
	}
	ClienteFiscal.model.updateOne({IDCliente:_idCliente},{$set:item}, (error,cliente) => {
		if(error)
			return res.status(500).send({message:"Error"});
		res.status(200).send(cliente);
		console.log(item);
	});
}

function _delete(req,res){
	let _idCliente = req.body.IDCliente;

	let item = {
		StatusReg:"BAJA"
	}
	ClienteFiscal.model.updateOne({IDCliente:_idCliente},{$set:item}, (error,cliente) => {
		if(error)
			return res.status(500).send({message:"Error"});
		res.status(200).send(cliente);
	});
	
}

module.exports = {
	get,
	getByIDUsuario,
	save,
	_delete,
	update
}