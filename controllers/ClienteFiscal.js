'use strict'
const CteFiscal = require('../models/ClienteFiscal');
const Helper = require('../helpers');
const Interfaz_ALM_XD = require('../models/Interfaz_ALM_XD');

async function getNextID(){
	
	return await Helper.getNextID(CteFiscal,"idCliente");
}

function get(req, res) {
	let sucursal_id = req.query.id

	let jFilter = {
		statusReg:"ACTIVO"
	};
	
	CteFiscal.find(jFilter).sort({nombreCorto: 1})
	.then((cliente)=>{
		res.status(200).send(cliente);	
	})
	.catch((err)=>{
		return res.status(500).send({message:"Error"});
	});
}

function getByIDCteFiscal(req, res) {
	let _id = req.query.id;

	CteFiscal.findOne({_id:_id})
	.then((clienteFiscal)=>{
		res.status(200).send(clienteFiscal);

	}).catch((error)=>{
		res.status(500).send(error);
	});
}


async function save(req,res){
	let nCliente = new CteFiscal();
	let IDClienteXD = req.body.IDClienteXD;
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

	nCliente.save()
	.then((cliente)=>{

		if(IDClienteXD != "Ninguna"){
            let NombreClienteXD = req.body.NombreClienteXD;
            let  nInterfaz = new Interfaz_ALM_XD();
            nInterfaz.nombre = NombreClienteXD;
            nInterfaz.tipo = "Cliente",
            nInterfaz.alm_id = cliente._id;
            nInterfaz.xd_id = IDClienteXD;
            nInterfaz.save();
        }
        res.status(200).send(cliente);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

function update(req,res){
	let _id = req.body.id;

	let editQuery = {
		fechaEdita:new Date(),
		usuarioEdita_id: req.body.usuarioEdita_id,
		nombreUsuario:req.body.nombreUsuario,
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
	CteFiscal.updateOne({_id:_id},{$set:editQuery})
	.then((updated)=>{
		res.status(200).send(updated);
	}).catch((error)=>{
		res.status(200).send(error);
	});
}

function _delete(req,res){
	let _id = req.body.clienteFiscal_id;

	let item = {
		statusReg:"BAJA",
		fechaElimina : new Date()
	}
	CteFiscal.updateOne({_id:_id},{$set:item})
	.then((cliente)=>{
		res.status(200).send(cliente);
	}).catch((error)=>{
		res.status(500).send({message:"Error"});
	});
	
}

module.exports = {
	get,
	getByIDCteFiscal,
	save,
	_delete,
	update
}