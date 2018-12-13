'use strict'
const CteFiscal = require('../models/ClienteFiscal');
const Helper = require('../helpers');

async function getNextID(){
	
	return await Helper.getNextID(CteFiscal,"idCliente");
}

function get(req, res) {

	CteFiscal.find({statusReg:"ACTIVO"}).sort({nombreCorto: 1})
	.then((cliente)=>{
		res.status(200).send(cliente);	
	})
	.catch((err)=>{
		return res.status(500).send({message:"Error"});
	});
}

function getByIDCteFiscal(req, res) {
	let _idCliente = req.params.idCteFiscal;

	console.log(_idCliente);

	CteFiscal.find({idCliente:_idCliente}, (error,cliente) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(cliente[0]);
	});

}


async function save(req,res){
	let nCliente = new CteFiscal();

	nCliente.idCliente = await getNextID();
	nCliente.usuarioAlta_id = req.body.usuarioAlta_id;
	nCliente.nombreUsuario = req.body.nombreUsuario;
	nCliente.idSucursal = req.body.idSucursal;
	nCliente.sucursal_id = req.body.sucursal_id;
	nCliente.fechaAlta = new Date();
	nCliente.nombreCorto = req.body.nombreCorto;
	nCliente.nombreComercial = req.body.nombreComercial;
	nCliente.razonSocial = req.body.razonSocial;
	nCliente.rfc = req.body.rfc;
	nCliente.calle = req.body.calle;
	nCliente.numExt = req.body.numExt;
	nCliente.numInt = req.body.numInt;
	nCliente.cp = req.body.cp;
	nCliente.colonia = req.body.colonia;
	nCliente.municipio = req.body.municipio;
	nCliente.estado = req.body.estado;
	nCliente.pais = req.body.pais;
	nCliente.statusReg = "ACTIVO";

	nCliente.save((error, clienteStored)=>{
		if(error)
			res.status(500).send({message:`Error al guardar${error}`});

		res.status(200).send({clienteStored});
	});
}

function update(req,res){
	let _idCliente = req.body.idCliente;

	let item = {
		fechaEdita:new Date(),
		nombreCorto : req.body.nombreCorto,
		nombreComercial : req.body.nombreComercial,
		razonSocial: req.body.razonSocial,
		rfc: req.body.rfc,
		calle:req.body.calle,
		numInt:req.body.numInt,
		numExt:req.body.numExt,
		cp:req.body.cp,
		colonia:req.body.colonia,
		municipio:req.body.municipio,
		estado:req.body.estado,
		pais:req.body.pais
	}
	CteFiscal.updateOne({idCliente:_idCliente},{$set:item}, (error,cliente) => {
		if(error)
			return res.status(500).send({message:"Error"});
		res.status(200).send(cliente);
		console.log(item);
	});
}

function _delete(req,res){
	let _idCliente = req.body.idCliente;

	let item = {
		statusReg:"BAJA",
		fechaElimina : new Date()
	}
	CteFiscal.updateOne({idCliente:_idCliente},{$set:item}, (error,cliente) => {
		if(error)
			return res.status(500).send({message:"Error"});
		res.status(200).send(cliente);
	});
	
}

module.exports = {
	get,
	getByIDCteFiscal,
	save,
	_delete,
	update
}