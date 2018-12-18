'use strict'
const Producto = require('../models/Producto');
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

//async
async function save(req,res) {
	let nProducto = new Producto();
	let params = req.body;
	
	nProducto.idClienteFiscal = params.idClienteFiscal;
	nProducto.arrClientesFiscales_id = params.arrClientesFiscales;
	nProducto.idProducto = await Helpers.getNextID(Producto, "idProducto");
	nProducto.statusReg = "ACTIVO";
	nProducto.fechaAlta = new Date();
	nProducto.usuarioAlta_id = params.usuarioAlta_id;
	nProducto.nombreUsuario = params.nombreUsuario;
	nProducto.clave = params.clave;
	nProducto.descripcion = params.descripcion;
	nProducto.embalajes = params.embalajes;
	nProducto.existenciaPesoBruto = params.existenciaPesoBruto;
	nProducto.existenciaPesoNeto = params.existenciaPesoNeto;
	nProducto.stockMaximo = params.stockMaximo;
	nProducto.stockMinimo = params.stockMinimo;
	nProducto.idSucursal = params.idSucursal;
	nProducto.sucursal_id = params.sucursal_id;
	nProducto.almacen_id = params.almacen_id;
	nProducto.presentacion = params.presentacion;
	nProducto.presentacion_id = params.presentacion_id;

	nProducto.save()
	.then((productoStored)=>{		
		MovimientoInventario.saveExistenciaInicial(productoStored._id, params.embalajes,
			params.existenciaPesoBruto, params.existenciaPesoNeto,
			params.idClienteFiscal, params.sucursal_id, params.almacen_id)
		.then(()=>{
			res.status(200).send({productoStored});
		})
	})
	.catch((err)=>{
		return res.status(500).send({"message":"Error save producto", "error":err});
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

	Producto.findOne({idProducto:_idProducto, statusReg:"ACTIVO"}) 
	.then((producto)=>{
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
	_delete,
	validaProducto,
	getByIDsClientesFiscales
}