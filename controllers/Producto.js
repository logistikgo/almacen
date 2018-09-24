'use strict'
const Producto = require('../models/Producto');
const Helpers = require('../helpers');

function get(req, res) {
	
	Producto.model.find({statusReg:"ACTIVO"}, (error,producto) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);
	});

}

function getByIDClienteFiscal(req, res) {
	let _idClienteFiscal = req.params.idClienteFiscal;

	console.log(_idClienteFiscal);

	Producto.model.find({idClienteFiscal:_idClienteFiscal, statusReg:"ACTIVO"}, (error,producto) => {
		if(error)
			return res.status(500).send({message:"Error"});

		res.status(200).send(producto);
	});

}
<<<<<<< HEAD

async function save(req,res) {
	let nProducto = new Producto();

	nProducto.idClienteFiscal = req.body.idClienteFiscal;
	nProducto.idProducto = await Helpers.getNextID(Producto, "idProducto");
=======
//async
function save(req,res) {
	let nProducto = new Producto.model();

	nProducto.idClienteFiscal = req.body.idClienteFiscal;
	nProducto.idProducto = req.body.idProducto; //await Producto.getNextID();
>>>>>>> 5e295b7a6805176a4f3bd8fbf8ad72394eb3dd67
	nProducto.statusReg = "ACTIVO";
	nProducto.fechaAlta = new Date();

	nProducto.clave = req.body.clave;
	nProducto.descripcion = req.body.descripcion;
	nProducto.existencia = req.body.existencia;
	nProducto.peso = req.body.peso;
	nProducto.stockMaximo = req.body.stockMaximo;
	nProducto.stockMinimo = req.body.stockMinimo;

	nProducto.save((error, productoStored)=>{
		if(error)
			return res.status(500).send({"message":"Error al guardar", "error":error});

		res.status(200).send({productoStored});
	});
}

function _delete(req,res) {
	let _idProducto = req.params.idProducto;

	console.log(`INSIDE DELETE ${_idProducto}`);

	Producto.model.findOne({idProducto:_idProducto, statusReg:"ACTIVO"}) 
	.then((producto)=>{
		console.log(producto);
		producto.statusReg = "BAJA";

		producto.save().then(()=>{
			res.status(200).send(producto);
		})
	}).catch((error)=>{
		res.status(500).send(error);
	});

}

module.exports = {
	get,
	getByIDClienteFiscal,
	save,
	_delete
}