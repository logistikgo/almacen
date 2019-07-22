'use strict'

const Evidencia = require('../models/Evidencia');


function getEvidenciasByID(req,res){
	let field = req.query.field;
	let _id = req.query.id;
	Evidencia.find({[field]:_id,statusReg:"ACTIVO"})
	.populate({
		path:'entrada_id',
		model:'Entrada'
	})
	.then((evidencias)=>{
		res.status(200).send(evidencias);
	})
	.catch((err)=>{
		return res.status(500).send({message:"Error",error:err});
	});	
}

function saveEvidencia(req,res){
	
	req.body.fechaAlta = new Date();
	req.body.statusReg = "ACTIVO";

	let nEvidencia = new Evidencia(req.body);

	nEvidencia.save()
	.then((storedEvidencia)=>{
		res.status(200).send(storedEvidencia);
	})
	.catch((err)=>{
		res.status(500).send(error);
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