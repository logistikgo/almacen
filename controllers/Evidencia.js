'use strict'

const Evidencia = require('../models/Evidencia');


function getEvidenciasByID(req,res){
	let _tipo = req.params.tipo;
	let field_id = req.params._id;

	Evidencia.find({tipo:_tipo,[field_id]:_id})
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
	if(params.tipo == 'entrada'){
		nEvidencia.entrada_id = params.entrada_id;
	}else if (params.tipo== 'salida'){
		nEvidencia.salida_id = params.salida_id;
	}

	nEvidencia.save()
	.then((storedEvidencia)=>{
		res.status(200).send(storedEvidencia);
	})
	.catch((err)=>{
		return res.status(500).send({message:"Error",error:err})
	});

}

module.exports = {
	saveEvidencia
}