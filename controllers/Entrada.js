'use strict'

const Entrada = require('../models/Entrada');
const Helper = require('../helpers');
const Producto = require('../models/Producto');

function getNextID(){
	return Helper.getNextID(Entrada,"idEntrada");
}

function get( req,res){
	Entrada.find({}, (error,producto)=>{
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);

	});
};

function getEntradaByID(req, res) {

	let _idEntrada = req.params.idEntrada;

	Entrada.findOne({idEntrada: _idEntrada})
	.populate({
		path:'partidas.producto_id',
		model:'Productos'
	})
	.exec(function(err,entrada){
		if(err)
			return res.status(200).send(err);

		res.status(200).send(entrada);		

	});
}

async function save(req, res){
	let bodyParams = req.body;

	let nEntrada = new Entrada();

	nEntrada.fechaAlta = new Date();
	nEntrada.idEntrada = await getNextID();
	nEntrada.folio = await getNextID();
	nEntrada.usuarioEntrada = bodyParams.usuarioEntrada;
	nEntrada.ordenCompra = bodyParams.ordenCompra;
	nEntrada.transportista = bodyParams.transportista;
	nEntrada.remision = bodyParams.remision;
	nEntrada.factura = bodyParams.factura;
	nEntrada.partidas = bodyParams.partidas;

	nEntrada.save()
	.then((data)=>{
		res.status(200).send(data);
	})
	.catch((err)=>{
		console.log(err);
	});

}

module.exports = {
	get,
	getEntradaByID,
	save
}