'use strict'
const Producto = require('../models/Producto');
const Interfaz_ALM_XD = require('../controllers/Interfaz_ALM_XD');
const Helpers = require('../helpers');
const MovimientoInventario = require('../controllers/MovimientoInventario')

function get(req, res) {
	
	Producto.find({statusReg:"ACTIVO"})
	.populate({
		path:'presentacion_id', 
		model: 'Presentacion'
	})
	.then((producto) => {
		res.status(200).send(producto);
	})
	.catch((error) => {
		return res.status(500).send(error);
	});
}

function getById(req, res) {
	let idProducto = req.query.idProducto;
	
	Producto.findOne({_id:idProducto})
	.populate({
		path:'presentacion_id', 
		model: 'Presentacion'
	})
	.then((producto) => {
		res.status(200).send(producto);
	})
	.catch((error) => {
		res.status(500).send(error);
	});
}

function getByClave(req,res){
	let _clave = req.params.clave;

	Producto.findOne({clave:_clave})
	.populate({
		path:'presentacion_id', 
		model: 'Presentacion'
	})
	.then((producto) => {
		res.status(200).send(producto);
	})
	.catch((error) => {
		res.status(500).send(error);
	});
}

function getByIDsClientesFiscales(req,res){
	let _arrClienteFiscales = req.query.arrClientesFiscales;
	Producto.find({arrClientesFiscales_id:{$in:_arrClienteFiscales},"statusReg":"ACTIVO"})
	.populate({
		path:'presentacion_id', 
		model: 'Presentacion'
	})
	.then((productos)=>{
		res.status(200).send(productos);
	})
	.catch((err)=>{
		res.status(500).send({message:"Error", error:err});
	});
}

function getByIDClienteFiscal(req, res) {
	let _idClienteFiscal = req.params.idClienteFiscal;
	Producto.find({arrClientesFiscales_id:{$in:[_idClienteFiscal]}, statusReg:"ACTIVO"})
	.populate({
		path:'presentacion_id', 
		model: 'Presentacion'
	})
	.then((producto) => {
		res.status(200).send(producto);
	})
	.catch((error) => {
		return res.status(500).send(error);
	});
	
}

async function getALM_XD(req,res){
	let _arrClientesFiscalesXD= req.query.arrClientesFiscales;
	
	let _arrClientesFiscalesALM = await Interfaz_ALM_XD.getIDClienteALM(_arrClientesFiscalesXD);
	console.log(_arrClientesFiscalesALM);
	Producto.find({arrClientesFiscales_id:{$in:_arrClientesFiscalesALM},"statusReg":"ACTIVO"})
	.populate({
		path:'presentacion_id', 
		model: 'Presentacion'
	})
	.then((productos)=>{
		res.status(200).send(productos);
	})
	.catch((err)=>{
		res.status(500).send({message:"Error", error:err});
	});
}

function getByIDClienteFiscal(req, res) {
	let _idClienteFiscal = req.params.idClienteFiscal;
	Producto.find({arrClientesFiscales_id:{$in:[_idClienteFiscal]}, statusReg:"ACTIVO"})
	.populate({
		path:'presentacion_id', 
		model: 'Presentacion'
	})
	.then((producto) => {
		res.status(200).send(producto);
	})
	.catch((error) => {
		return res.status(500).send(error);
	});
	
}

//async
async function save(req,res) {

	req.body.idProducto = await Helpers.getNextID(Producto, "idProducto");
	req.body.statusReg = "ACTIVO";
	req.body.valor = 0;
	req.body.fechaAlta = new Date();

	let nProducto = new Producto(req.body);

	nProducto.save()
	.then((productoStored)=>{	
		
		res.status(200).send(productoStored);	
		MovimientoInventario.saveExistenciaInicial(productoStored._id, req.body.embalajes,
			req.body.existenciaPesoBruto, req.body.existenciaPesoNeto,
			req.body.idClienteFiscal,req.body.clienteFiscal_id, req.body.sucursal_id, req.body.almacen_id)
		.then(()=>{
			
		});
	})
	.catch((err)=>{
		res.status(500).send({"message":"Error save producto", "error":err});
	});
}

function update(req, res){
	
	req.body.fechaEdita = new Date();

	let idProducto = params.idProducto;

	Producto.updateOne({_id: idProducto},{$set: req.body})
	.then(()=>{
		res.status(200).send(producto);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});

}

function validaProducto(req,res){
	let _clave = req.params.clave;

	Producto.find({clave:_clave,statusReg:"ACTIVO"})
	.then((producto)=>{
		console.log(producto.length);
		if(producto.length===0){
			return res.status(200).send(true);
		}
		else
		{
			return res.status(200).send(false);
		}
	})
	.catch((err)=>{
		res.status(500).send({message:"Error en validaProducto","error":err});
	});
}

function _delete(req,res) {
	let _idProducto = req.body.idProducto;

	Producto.updateOne({_id:_idProducto},{$set: {statusReg:"BAJA"}})
	.then((producto)=>{
		res.status(200).send(producto);
	})
	.catch((error)=>{
		res.status(500).send(error);
	});
}

module.exports = {
	get,
	getById,
	getByIDClienteFiscal,
	save,
	update,
	_delete,
	validaProducto,
	getByIDsClientesFiscales,
	getByClave,
	getALM_XD
}