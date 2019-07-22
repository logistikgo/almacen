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
	
	let nCliente = new CteFiscal(req.body);
	
	let IDClienteXD = req.body.IDClienteXD;
	
	nCliente.idCliente = await getNextID();
	nCliente.fechaAlta = new Date();
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