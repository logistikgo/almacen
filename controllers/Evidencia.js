'use strict'

const Evidencia = require('../models/Evidencia');


function getEvidenciasByID(req,res){
	let field = req.query.field;
	let _id = req.query.id;
	Evidencia.find({[field]:_id,statusReg:"ACTIVO"})
	.then((evidencias)=>{
		res.status(200).send(evidencias);
	})
	.catch((err)=>{
		return res.status(500).send({message:"Error",error:err});
	});	
}

function saveEvidencia(req,res){
	let params = req.body;

	let nEvidencia = new Evidencia();

	nEvidencia.nombreArchivo = params.nombreArchivo;
	nEvidencia.rutaArchivo = params.rutaArchivo;
	nEvidencia.tipo = params.tipo;
	nEvidencia.fechaAlta = new Date();
	nEvidencia.usuario_id = params.usuario_id;
	nEvidencia.usuarioNombre = params.usuarioNombre;
	nEvidencia.entrada_id = params.entrada_id;
	nEvidencia.salida_id = params.salida_id;
	nEvidencia.statusReg = "ACTIVO";
	
	nEvidencia.save()
	.then((storedEvidencia)=>{
		res.status(200).send(storedEvidencia);
	})
	.catch((err)=>{
		return res.status(500).send({message:"Error",error:err})
	});

}

function deleteEvidencia(req,res){
	let _id = req.body.id;
	let _tipo = req.body.tipo;
	let field = req.body.field;

	Evidencia.updateOne({statusReg:"ACTIVO",[field]:_id,tipo:_tipo},{$set:{statusReg:"BAJA"}})
	.then((removed)=>{
		res.status(200).send(removed);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}


module.exports = {
	saveEvidencia,
	getEvidenciasByID,
	deleteEvidencia
}