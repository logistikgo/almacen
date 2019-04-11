'use strict'

const Interfaz_ALM_XD = require('../models/Interfaz_ALM_XD');

async function getIDClienteALM(arrClientesXD) {
	console.log(arrClientesXD);
	let clientesALM_XD = await Interfaz_ALM_XD.find({xd_id:{$in:arrClientesXD},tipo:"Cliente"}).exec();
	let arrClientesALM = clientesALM_XD.map(x=>x.alm_id.toString());
	return arrClientesALM;
}

async function getIDSucursalALM(arrSucursalesXD) {
	console.log(arrSucursalesXD);
	let SucursalesALM_XD = await Interfaz_ALM_XD.find({xd_id:{$in:arrSucursalesXD},tipo:"Sucursal"}).exec();
	let arrSucursalesALM = SucursalesALM_XD.map(x=>x.alm_id.toString());
	return arrSucursalesALM;
}


function getIDSucursalALM(req,res){
	let IDSucursalXD = req.query.IDSucursal;

	Interfaz_ALM_XD.find({xd_id:IDSucursalXD,tipo:"Sucursal"})
	.then((sucursalALM)=>{
		res.status(200).send(sucursalALM);
	}).
	catch((error)=>{
		res.status(500).send(error);
	});
}

module.exports = {
	getIDClienteALM,
	getIDSucursalALM,
	getIDSucursalALM
}